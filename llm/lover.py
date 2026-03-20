import time
from llm.context import build_system_prompt

MAX_TURNS = 10

def get_recent_history(history, max_turns=MAX_TURNS):
    return history[-(max_turns * 2):]

def chat_stream_gen(client, user_input, history, persona, scenario, state, extra_context="", user_emotion=None):
    system_prompt = build_system_prompt(persona, scenario, state, user_emotion)
    if extra_context:
        system_prompt += f"\n\n[추가 컨텍스트]\n{extra_context}"
    history.append({"role": "user", "content": user_input})
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
