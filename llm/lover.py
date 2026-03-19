import time
from llm.context import build_system_prompt

MAX_TURNS = 10

def get_recent_history(history, max_turns=MAX_TURNS):
    return history[-(max_turns * 2):]

def chat_stream_gen(client, user_input, history, persona, scenario, state):
    """API용 - 텍스트 청크를 yield하고 usage를 마지막에 yield"""
    system_prompt = build_system_prompt(persona, scenario, state)
    history.append({"role": "user", "content": user_input})
    full_response = ""

    with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=256,
        system=system_prompt,
        messages=get_recent_history(history)
    ) as stream:
        for text in stream.text_stream:
            full_response += text
            yield ("text", text)
        usage = stream.get_final_message().usage

    history.append({"role": "assistant", "content": full_response})
    yield ("done", usage.input_tokens + usage.output_tokens)


def chat_stream(client, user_input, history, persona, scenario, state):
    system_prompt = build_system_prompt(persona, scenario, state)

    history.append({"role": "user", "content": user_input})

    full_response = ""
    print(f"{persona['name']}: ", end="")

    with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=256,
        system=system_prompt,
        messages=get_recent_history(history)
    ) as stream:
        for text in stream.text_stream:
            print(text, end="", flush=True)
            full_response += text
            time.sleep(0.03)
        usage = stream.get_final_message().usage

    print("\n")
    history.append({"role": "assistant", "content": full_response})
    return usage.input_tokens + usage.output_tokens
