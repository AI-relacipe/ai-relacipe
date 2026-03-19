import json
import re
import random

def detect_trigger(client, history, turn_count, psychological_state):
    recent = history[-4:]
    recent_text = "\n".join([f"{m['role']}: {m['content']}" for m in recent])

    if turn_count >= 5 and random.random() < 0.18:
        return {"trigger": True, "reason": "랜덤", "context": recent_text}

    prompt = f"""
아래 대화를 보고 두 가지를 판단해.
반드시 JSON으로만 응답해. 다른 텍스트 절대 포함하지 마.

1. 패널 개입 여부
개입 기준 (셋 중 하나라도 해당될 때만 true):
- 고백, 이별, 싸움처럼 감정이 폭발하는 결정적 순간
- 대화 분위기가 완전히 뒤집히는 순간
- 일반적인 대화, 짧은 답변, 가벼운 감정 표현은 반드시 false

2. 연인의 현재 심리 상태 업데이트

[현재 심리 상태]
감정: {psychological_state['emotion']}
행동 방향: {psychological_state['direction']}

[최근 대화]
{recent_text}

{{
  "trigger": true 또는 false,
  "reason": "이벤트 | 상황변화 | 없음",
  "context": "패널에게 전달할 상황 요약 (trigger가 false면 빈 문자열)",
  "new_state": {{
    "emotion": "현재 감정 상태 30자 이내",
    "direction": "앞으로 행동 방향 30자 이내"
  }}
}}
"""

    response = client.messages.create(
        model="claude-sonnet-4-6",
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
