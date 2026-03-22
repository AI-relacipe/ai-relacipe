from llm.context import build_system_prompt

MAX_TURNS = 10

def get_recent_history(history, max_turns=MAX_TURNS):
    return history[-(max_turns * 2):]

def chat_stream_gen(client, user_input, history, persona, scenario, state, extra_context="", user_info=None, user_camera_emotion=None, user_voice_emotion=None, chat_type=None):
    """API용 - 텍스트 청크를 yield하고 usage를 마지막에 yield"""
    system_prompt = build_system_prompt(persona, scenario, state, extra_context, user_info=user_info, user_camera_emotion=user_camera_emotion, user_voice_emotion=user_voice_emotion, chat_type=chat_type)
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
