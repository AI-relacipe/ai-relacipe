import time
from llm.context import build_system_prompt

MAX_TURNS = 10

# 온라인 모드 "읽는 척" 딜레이 (초)
# 메시지 길이에 비례해서 자연스럽게
def _reading_delay(text: str) -> float:
    chars = len(text)
    if chars <= 5:
        return 1.2
    elif chars <= 15:
        return 1.8
    elif chars <= 40:
        return 2.3
    else:
        return 3.0

def get_recent_history(history, max_turns=MAX_TURNS):
    return history[-(max_turns * 2):]

def chat_stream_gen(client, user_input, history, persona, scenario, state, extra_context="", user_info=None, user_camera_emotion=None, user_voice_emotion=None, chat_type=None, rapid_followup=False):
    """API용 - 텍스트 청크를 yield하고 usage를 마지막에 yield"""
    system_prompt = build_system_prompt(persona, scenario, state, extra_context, user_info=user_info, user_camera_emotion=user_camera_emotion, user_voice_emotion=user_voice_emotion, chat_type=chat_type, rapid_followup=rapid_followup)
    history.append({"role": "user", "content": user_input})
    if chat_type == "online":
        # 첫 메시지는 인트로 패널이 별도로 딜레이를 주므로 짧게
        is_first = len([m for m in history if m["role"] == "user"]) == 1
        delay = _reading_delay(user_input) * 0.5 if is_first else _reading_delay(user_input)
        time.sleep(delay)
    full_response = ""
    with client.messages.stream(
        model="claude-haiku-4-5-20251001",
        max_tokens=128,
        system=system_prompt,
        messages=get_recent_history(history)
    ) as stream:
        for text in stream.text_stream:
            full_response += text
            yield ("text", text)
        usage = stream.get_final_message().usage
    history.append({"role": "assistant", "content": full_response})
    yield ("done", usage.input_tokens + usage.output_tokens)
