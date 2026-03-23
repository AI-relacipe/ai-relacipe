from config import LLM_MODEL
"""
MC 오케스트레이터
- 요약 + fact 추출 (10메시지마다)
- LLM에게 넘길 컨텍스트 조립
- 패널 대화 실행 (MC → T → F → T, 2턴)
"""
import json
import re

from db.redis_client import (
    append_panel_history,
    append_summary,
    get_facts,
    get_history,
    get_history_count,
    get_summaries,
    merge_facts,
)
from llm.panel import F_PANEL_PROMPT, T_PANEL_PROMPT
from mc.prompts import MC_AGENT_PROMPT, SUMMARY_AND_FACT_PROMPT

SUMMARY_INTERVAL = 10  # 메시지 10개마다 요약


def _llm(client, prompt, max_tokens=512, temperature=0.3, timeout=20.0):
    try:
        resp = client.messages.create(
            model=LLM_MODEL,
            max_tokens=max_tokens,
            temperature=temperature,
            timeout=timeout,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.content[0].text.strip()
    except Exception as e:
        raise RuntimeError(f"패널 LLM 호출 실패: {repr(e)}")


def should_summarize(session_id):
    count = get_history_count(session_id)
    return count > 0 and count % SUMMARY_INTERVAL == 0


def run_summary_and_facts(client, session_id):
    """요약 + fact 추출 — 10메시지마다 호출"""
    history = get_history(session_id)
    existing_facts = get_facts(session_id)

    conversation = "\n".join(
        [f"{'사용자' if m['role'] == 'user' else 'LLM'}: {m['content']}" for m in history]
    )
    facts_str = json.dumps(existing_facts, ensure_ascii=False)

    raw = _llm(
        client,
        SUMMARY_AND_FACT_PROMPT.format(conversation=conversation, existing_facts=facts_str),
        max_tokens=1024,
    )

    # JSON 파싱 (코드블록 감싸인 경우 대응)
    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if not match:
            return
        try:
            result = json.loads(match.group())
        except Exception:
            return

    if "summary" in result:
        append_summary(session_id, result["summary"], len(history))

    if "facts" in result:
        merge_facts(session_id, result["facts"])


def build_llm_context(session_id, recent_n=10):
    """
    LLM system prompt에 추가할 컨텍스트 문자열 반환.
    recent_history는 별도 반환 (lover.py에 그대로 넘김).
    """
    summaries = get_summaries(session_id)
    facts = get_facts(session_id)
    recent_history = get_history(session_id, last_n=recent_n)

    parts = []

    if summaries:
        summary_text = "\n".join(
            [f"[요약 {i + 1}] {s['content']}" for i, s in enumerate(summaries)]
        )
        parts.append(f"[이전 대화 요약]\n{summary_text}")

    non_empty = {k: v for k, v in facts.items() if v}
    if non_empty:
        facts_text = "\n".join([f"- {k}: {', '.join(v)}" for k, v in non_empty.items()])
        parts.append(f"[중요 정보]\n{facts_text}")

    return {
        "extra_context": "\n\n".join(parts),
        "recent_history": [{"role": m["role"], "content": m["content"]} for m in recent_history],
    }


MC_TOOLS = [
    {
        "name": "call_t_panel",
        "description": "T패널(논리/팩트 중심, 덱스 스타일)에게 발언 기회를 줌. 갈등·오해·잘못된 행동 지적에 적합.",
        "input_schema": {
            "type": "object",
            "properties": {
                "reason": {"type": "string", "description": "T패널을 호출하는 이유 (한 줄)"}
            },
            "required": ["reason"],
        },
    },
    {
        "name": "call_f_panel",
        "description": "F패널(감정/공감 중심, 이다희 스타일)에게 발언 기회를 줌. 상처·설렘·위로가 필요한 순간에 적합.",
        "input_schema": {
            "type": "object",
            "properties": {
                "reason": {"type": "string", "description": "F패널을 호출하는 이유 (한 줄)"}
            },
            "required": ["reason"],
        },
    },
]

MAX_STEPS = 5


def _call_t_panel(client, mc_brief, summary, facts, context, dialogue_so_far):
    prev_text = (
        f"[앞서 나온 대화]\n{dialogue_so_far}\n위 대화를 참고해서 자연스럽게 이어받아 반응해."
        if dialogue_so_far else ""
    )
    return _llm(
        client,
        T_PANEL_PROMPT.format(
            mc_brief=mc_brief,
            summary=summary,
            facts=facts,
            trigger_context=context,
            prev_text=prev_text,
        ),
        max_tokens=256,
        temperature=0.8,
    )


def _call_f_panel(client, mc_brief, summary, facts, context, t_response, dialogue_so_far):
    prev_text = (
        f"[앞서 나온 대화]\n{dialogue_so_far}\n위 대화를 참고해서 자연스럽게 이어받아 반응해."
        if dialogue_so_far else ""
    )
    return _llm(
        client,
        F_PANEL_PROMPT.format(
            mc_brief=mc_brief,
            summary=summary,
            facts=facts,
            t_response=t_response,
            trigger_context=context,
            prev_text=prev_text,
        ),
        max_tokens=256,
        temperature=0.8,
    )


def run_mc_panel(client, session_id, trigger_context, persona_name="연인", user_name="사용자",
                 user_camera_emotion=None, user_voice_emotion=None):
    """
    MC Agent: 상황 판단 후 T/F 패널을 동적으로 호출
    반환: {"mc": ..., "t_panel": ..., "f_panel": ...}
    """
    summaries = get_summaries(session_id)
    facts = get_facts(session_id)
    recent_history = get_history(session_id, last_n=10)
    summary_text = summaries[-1]["content"] if summaries else "요약 없음"

    non_empty = {k: v for k, v in facts.items() if v}
    facts_text = (
        "\n".join([f"- {k}: {', '.join(v)}" for k, v in non_empty.items()])
        if non_empty else "없음"
    )

    recent_chat = "\n".join(
        [f"{'사용자' if m['role'] == 'user' else '연인'}: {m['content']}" for m in recent_history]
    ) if recent_history else "대화 없음"

    emotion_lines = []
    if user_camera_emotion and user_camera_emotion.get("label"):
        emotion_lines.append(f"표정: {user_camera_emotion['label']} ({user_camera_emotion.get('score', 0)*100:.0f}%)")
    if user_voice_emotion and user_voice_emotion.get("label"):
        emotion_lines.append(f"목소리: {user_voice_emotion['label']} ({user_voice_emotion.get('score', 0)*100:.0f}%)")

    full_context = (
        f"[참여자 이름]\n연인: {persona_name}\n사용자: {user_name}\n\n"
        f"[최근 대화 흐름]\n{recent_chat}\n\n[트리거 상황]\n{trigger_context}"
    )
    if emotion_lines:
        full_context += "\n\n[사용자 현재 감정 (카메라/음성 인식)]\n" + "\n".join(emotion_lines)
        print(f"[패널+감정] {', '.join(emotion_lines)}", flush=True)

    system_prompt = MC_AGENT_PROMPT.format(
        summary=summary_text,
        facts=facts_text,
        recent_context=full_context,
    )

    # Agent 루프
    messages = [{"role": "user", "content": "패널 토론을 시작해줘."}]
    dialogue_so_far = ""
    t_result = ""
    f_result = ""
    mc_brief = ""

    for step in range(MAX_STEPS):
        try:
            resp = client.messages.create(
                model=LLM_MODEL,
                max_tokens=512,
                temperature=0.7,
                timeout=30.0,
                system=system_prompt,
                tools=MC_TOOLS,
                messages=messages,
            )
        except Exception as e:
            raise RuntimeError(f"MC Agent 호출 실패: {repr(e)}")

        # MC의 텍스트 발언 수집 (브리핑)
        for block in resp.content:
            if hasattr(block, "text") and block.text.strip():
                mc_brief = block.text.strip()
                append_panel_history(session_id, "MC", mc_brief)

        # 종료 조건
        if resp.stop_reason == "end_turn":
            break

        if resp.stop_reason != "tool_use":
            break

        # 툴 호출 처리
        messages.append({"role": "assistant", "content": resp.content})
        tool_results = []

        for block in resp.content:
            if block.type != "tool_use":
                continue

            try:
                if block.name == "call_t_panel":
                    result = _call_t_panel(
                        client, mc_brief, summary_text, facts_text, full_context, dialogue_so_far
                    )
                    t_result = result
                    append_panel_history(session_id, "T", result)
                    dialogue_so_far += f"[T] {result}\n"

                elif block.name == "call_f_panel":
                    result = _call_f_panel(
                        client, mc_brief, summary_text, facts_text, full_context,
                        t_result, dialogue_so_far
                    )
                    f_result = result
                    append_panel_history(session_id, "F", result)
                    dialogue_so_far += f"[F] {result}\n"

                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result,
                })

            except Exception as e:
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": f"오류: {repr(e)}",
                    "is_error": True,
                })

        messages.append({"role": "user", "content": tool_results})

    # T 또는 F 결과 누락 시 fallback
    if not t_result:
        try:
            t_result = _call_t_panel(
                client, mc_brief, summary_text, facts_text, full_context, dialogue_so_far
            )
            append_panel_history(session_id, "T", t_result)
        except Exception:
            t_result = "상황을 좀 더 지켜봐야 할 것 같아."

    if not f_result:
        try:
            f_result = _call_f_panel(
                client, mc_brief, summary_text, facts_text, full_context,
                t_result, dialogue_so_far
            )
            append_panel_history(session_id, "F", f_result)
        except Exception:
            f_result = "두 사람 마음이 다 이해돼."

    return {"mc": mc_brief, "t_panel": t_result, "f_panel": f_result}