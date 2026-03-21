"""
MC 오케스트레이터
- 요약 + fact 추출 (10메시지마다)
- LLM에게 넘길 컨텍스트 조립
- 패널 대화 실행 (MC → T → F → T, 2턴)
"""
import json
import re

from db.redis_client import (
    get_history, get_history_count,
    get_facts, merge_facts,
    get_summaries, append_summary,
    append_panel_history,
)
from mc.prompts import SUMMARY_AND_FACT_PROMPT, MC_BRIEF_PROMPT
from llm.panel import T_PANEL_PROMPT, F_PANEL_PROMPT, T_PANEL_REPLY_PROMPT

SUMMARY_INTERVAL = 10  # 메시지 10개마다 요약


def _llm(client, prompt, max_tokens=512, temperature=0.3):
    resp = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=max_tokens,
        temperature=temperature,
        messages=[{"role": "user", "content": prompt}],
    )
    return resp.content[0].text.strip()


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


def run_mc_panel(client, session_id, trigger_context):
    """
    패널 대화 실행: MC 브리핑 → T → F → T (2턴 교환)
    반환: {"mc": ..., "t_panel": ..., "f_panel": ..., "t_reply": ...}
    """
    summaries = get_summaries(session_id)
    facts = get_facts(session_id)
    recent_history = get_history(session_id, last_n=10)
    summary_text = summaries[-1]["content"] if summaries else "요약 없음"

    non_empty = {k: v for k, v in facts.items() if v}
    facts_text = (
        "\n".join([f"- {k}: {', '.join(v)}" for k, v in non_empty.items()])
        if non_empty
        else "없음"
    )

    # 최근 대화 텍스트 (패널이 전체 흐름을 파악하도록)
    recent_chat = "\n".join(
        [f"{'사용자' if m['role'] == 'user' else '연인'}: {m['content']}" for m in recent_history]
    ) if recent_history else "대화 없음"

    # trigger_context에 최근 대화 포함
    full_context = f"[최근 대화 흐름]\n{recent_chat}\n\n[트리거 상황]\n{trigger_context}"

    # 1. MC 브리핑
    mc_brief = _llm(
        client,
        MC_BRIEF_PROMPT.format(
            summary=summary_text,
            facts=facts_text,
            recent_context=full_context,
        ),
        max_tokens=256,
        temperature=0.7,
    )
    append_panel_history(session_id, "MC", mc_brief)

    # 2. T패널 첫 발언
    t_response = _llm(
        client,
        T_PANEL_PROMPT.format(
            mc_brief=mc_brief,
            summary=summary_text,
            facts=facts_text,
            trigger_context=full_context,
            prev_text="",
        ),
        max_tokens=256,
        temperature=0.8,
    )
    append_panel_history(session_id, "T", t_response)

    # 3. F패널 발언 (T 읽고 반응)
    f_response = _llm(
        client,
        F_PANEL_PROMPT.format(
            mc_brief=mc_brief,
            summary=summary_text,
            facts=facts_text,
            t_response=t_response,
            trigger_context=full_context,
            prev_text=f"[앞서 나온 대화]\n[T] {t_response}\n위 대화를 참고해서 자연스럽게 이어받아 반응해.",
        ),
        max_tokens=256,
        temperature=0.8,
    )
    append_panel_history(session_id, "F", f_response)

    # 4. T패널 마무리 (2턴)
    t_reply = _llm(
        client,
        T_PANEL_REPLY_PROMPT.format(mc_brief=mc_brief, f_response=f_response),
        max_tokens=256,
        temperature=0.8,
    )
    append_panel_history(session_id, "T", t_reply)

    return {"mc": mc_brief, "t_panel": t_response, "f_panel": f_response, "t_reply": t_reply}