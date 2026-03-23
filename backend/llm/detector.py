import json
import re


def detect_trigger(client, history, turn_count, psychological_state):
    if turn_count < 3:
        return {"trigger": False, "reason": "없음", "context": "", "new_state": None}

    recent = history[-6:]
    recent_text = "\n".join([f"{m['role']}: {m['content']}" for m in recent])

    prompt = f"""
아래 대화를 보고 두 가지를 판단해.
반드시 JSON으로만 응답해. 다른 텍스트 절대 포함하지 마.

1. 패널 개입 여부
개입 기준 (아래 중 하나라도 해당될 때만 true):
- 고백, 이별, 싸움처럼 감정이 폭발하는 결정적 순간
- 대화 분위기가 완전히 뒤집히는 순간
- 중요한 관계 변화가 일어나는 순간

절대 false여야 하는 경우:
- 일반적인 대화, 인사, 가벼운 농담
- 짧은 답변, 일상 대화
- 아직 감정이 고조되지 않은 상태

2. 연인의 현재 심리 상태 업데이트 (항상 제공)

[현재 심리 상태]
감정: {psychological_state['emotion']}
행동 방향: {psychological_state['direction']}

[최근 대화 (전체 흐름)]
{recent_text}

{{
  "trigger": true 또는 false,
  "reason": "이벤트 | 상황변화 | 없음",
  "context": "trigger가 true일 때만 - 대화의 전체 상황을 패널에게 요약해서 전달 (대화 흐름, 양쪽 감정 포함)",
  "new_state": {{
    "emotion": "현재 감정 상태 30자 이내",
    "direction": "앞으로 행동 방향 30자 이내"
  }}
}}
"""

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        temperature=0.2,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = response.content[0].text.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
        return {"trigger": False, "reason": "없음", "context": "", "new_state": None}