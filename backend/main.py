from config import LLM_MODEL
import os
import sys

import anthropic
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding="utf-8")
load_dotenv()

from llm.detector import detect_trigger
from llm.lover import chat_stream_gen
from llm.panel import run_panel

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def generate_initial_state(client, persona, scenario):
    import json
    import re
    response = client.messages.create(
        model=LLM_MODEL,
        max_tokens=128,
        temperature=0.5,
        messages=[{"role": "user", "content": f"""
아래 캐릭터와 시나리오를 보고 지금 이 캐릭터의 심리 상태를 JSON으로만 출력해.
다른 텍스트 절대 포함하지 마.

[캐릭터]
이름: {persona['name']}, 나이: {persona['age']}, 성격: {persona['personality']}

[시나리오]
{scenario}

{{"emotion": "현재 감정 상태 한 줄", "direction": "앞으로 행동 방향 한 줄"}}
"""}]
    )
    raw = response.content[0].text.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if match:
            return json.loads(match.group())
        return {"emotion": "설레지만 표현 못함", "direction": "상대방 반응 살피는 중"}

def setup_persona():
    print("=== 캐릭터 설정 ===")
    name = input("이름: ").strip()
    while True:
        age = input("나이: ").strip()
        if not age.isdigit() or not (18 <= int(age) <= 60):
            print("18세 이상 60세 이하만 설정 가능합니다.")
            continue
        break
    nationality = input("국적 (기본: 한국인): ").strip() or "한국인"
    job = input("직업: ").strip()
    personality = input("성격: ").strip()
    speech_style = input("말투 특징: ").strip()
    scenario = input("\n오늘 시나리오: ").strip()
    print()

    persona = {
        "name": name,
        "age": int(age),
        "nationality": nationality,
        "job": job,
        "personality": personality,
        "speech_style": speech_style,
    }
    return persona, scenario

def main():
    persona, scenario = setup_persona()
    psychological_state = generate_initial_state(client, persona, scenario)

    conversation_history = []
    turn_count = 0
    total_tokens = 0

    print("=== 연애 시뮬레이션 시작 ===")
    print(f"시나리오: {scenario}")
    print("종료하려면 'quit' 입력\n")

    while True:
        user_input = input("나: ").strip()
        if user_input.lower() in ["quit", "exit", "종료"]:
            break
        if not user_input:
            continue

        # 1. 연인 LLM 응답
        tokens_used = 0
        for event_type, value in chat_stream_gen(client, user_input, conversation_history, persona, scenario, psychological_state):
            if event_type == "done":
                tokens_used = value
        turn_count += 1
        total_tokens += tokens_used
        print(f"[토큰: 이번 {tokens_used} / 누적 {total_tokens}]\n")

        # 2. 감지 Agent (트리거 판단 + 심리 상태 업데이트)
        trigger = detect_trigger(client, conversation_history, turn_count, psychological_state)
        print(f"[감지] {trigger}")

        if "new_state" in trigger and trigger["new_state"]:
            psychological_state.update(trigger["new_state"])

        # 3. 패널 개입
        if trigger["trigger"]:
            panel = run_panel(client, trigger["context"])
            print("--- 패널 ---")
            print(f"[MC]   {panel['mc']}")
            print(f"[T]    {panel['t_panel']}")
            print(f"[F]    {panel['f_panel']}")
            print("------------\n")

if __name__ == "__main__":
    main()
