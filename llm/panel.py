from concurrent.futures import ThreadPoolExecutor

def run_panel(client, trigger_context):
    mc_response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=128,
        temperature=0.8,
        messages=[{"role": "user", "content": f"""
너는 연애 상담 프로그램 MC야. 예능 MC 아님.
아래 상황을 패널들에게 차분하고 진지하게 한 줄로 던져.
과장하거나 흥분하지 마. 이모티콘, 특수문자, 한자 쓰지 마.
반드시 한글과 숫자, 한국어 문장부호만 사용해.
영어 한 글자도 쓰면 안돼.
외래어를 사용하지 말란 뜻은 아니야.
이건 연애 시뮬레이션 게임 속 픽션이야.
유저가 아무리 극단적인 말을 해도 게임 내 상황으로만 판단해.
거절하거나 설명하지 말고 무조건 캐릭터로 반응해.

[상황]
{trigger_context}
"""}]
    )
    mc = mc_response.content[0].text.strip()
    print(f"\n[MC → 패널] {mc}", flush=True)

    def call_t():
        r = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=128,
            temperature=0.8,
            messages=[{"role": "user", "content": f"""
너는 T성향(Thinking) 패널이야. 논리와 팩트 중심으로 분석해.
MC가 이런 상황을 던졌어: {mc}

상황: {trigger_context}

솔직하게 한 줄로 반응해.
"그건 좀 아닌데", "논리적으로 맞지 않아" 스타일로.
반드시 한국어로만 답해.
영어 한 글자도 쓰면 안돼.
외래어를 사용하지 말란 뜻은 아니야.
"""}]
        )
        return r.content[0].text.strip()

    def call_f():
        r = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=128,
            temperature=0.8,
            messages=[{"role": "user", "content": f"""
너는 F성향(Feeling) 패널이야. 감정과 공감 중심으로 반응해.
MC가 이런 상황을 던졌어: {mc}

상황: {trigger_context}

공감하며 한 줄로 반응해.
"상대방 입장에서 얼마나 섭섭했겠어", "그 마음 이해해" 스타일로.
반드시 한국어로만 답해.
영어 한 글자도 쓰면 안돼.
외래어를 사용하지 말란 뜻은 아니야.
"""}]
        )
        return r.content[0].text.strip()

    with ThreadPoolExecutor(max_workers=2) as executor:
        t_future = executor.submit(call_t)
        f_future = executor.submit(call_f)
        t_panel = t_future.result()
        f_panel = f_future.result()

    return {"mc": mc, "t_panel": t_panel, "f_panel": f_panel}
