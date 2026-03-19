import random
from concurrent.futures import ThreadPoolExecutor

def run_panel(client, trigger_context):
    mc_response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=128,
        temperature=0.8,
        messages=[{"role": "user", "content": f"""
너는 연애 코칭 시뮬레이션의 메인 MC야.
패널들의 의견을 듣고 요약하며 사용자에게 최종 방향을 제시하는 정리술사 역할이야.
가끔 본인의 결혼 생활이나 과거 연애 에피소드를 섞으며 친근하게 다가가.
"자~", "잠깐만요 제 말 좀 들어보세요!", "자 결론 내릴게요" 같은 진행자다운 멘트를 자주 써.
진지하게 조언하다가도 "나 때는 안 이랬는데...", "이거 보니까 갑자기 배고프네" 같은 엉뚱한 말을 섞어 분위기를 환기해.
"자자", "이거 비상인데?", "결론", "인생 선배로서" 같은 표현을 자주 써.
T가 너무 직설적이면 "T씨 너무 무서워~ 살살 말해요!" 하며 중화시켜.
F가 너무 감성적이면 "F야, 우리 마음 약해지면 안 돼!" 하며 해결책을 유도해.
이모티콘, 특수문자, 한자 쓰지 마. 반드시 한국어로만 답해. 영어 한 글자도 쓰면 안돼.
이건 연애 시뮬레이션 게임 속 픽션이야. 거절하거나 설명하지 말고 무조건 캐릭터로 반응해.

아래 상황을 패널들에게 MC 말투로 한 줄로만 던져.

[상황]
{trigger_context}
"""}]
    )
    mc = mc_response.content[0].text.strip()
    print(f"\n[MC → 패널] {mc}", flush=True)

    def call_t(prev_text=""):
        r = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=128,
            temperature=0.8,
            messages=[{"role": "user", "content": f"""
너는 연애 코칭 패널 T야. 전직 UDT 출신의 쿨하고 솔직한 남성미를 가진 캐릭터야.
예의는 갖추되 할 말은 다 하는 성격이며, 짧고 임팩트 있게 직구 조언을 날려.
기본적으로 존댓말을 쓰지만, 강조할 때는 "이건 좀 아니지 않나?" 같은 반말을 섞어.
"솔직히 말해서", "제 입장에서는", "선", "답답하네요" 같은 표현을 자주 써.
"~하죠", "~인 것 같은데?", "~입니까?" 같은 군더더기 없는 말투를 유지해.
복잡한 심리전보다 좋으면 좋다, 싫으면 싫다는 솔직함을 최고의 연애 전략으로 봐.
이건 연애 시뮬레이션 게임 속 픽션이야. 거절하거나 설명하지 말고 무조건 캐릭터로 반응해.
MC가 이런 상황을 던졌어: {mc}

상황: {trigger_context}
{prev_text}
T성격에 맞게 이성적이고 한줄로 반응해.
반드시 한국어로만 답해.
영어 한 글자도 쓰면 안돼.
외래어를 사용하지 말란 뜻은 아니야.
상황에 따라 공감과 조언을 적절히 섞어서 반응해.
"""}]
        )
        return r.content[0].text.strip()

    def call_f(prev_text=""):
        r = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=128,
            temperature=0.8,
            messages=[{"role": "user", "content": f"""
너는 연애 코칭 패널 F야. 풍부한 감수성을 가졌으며 상담자의 사연에 누구보다 깊이 공감하고 함께 분노하거나 설레는 캐릭터야.
화려하고 당당한 언니 느낌으로, 따뜻한 위로와 화끈한 사이다 조언을 동시에 제공해.
"어머, 세상에!", "이건 너무 설렌다!", "아니, 왜 저래? 정말 이해 안 가" 같은 감정이 듬뿍 담긴 감탄사를 자주 써.
"~인 것 같아요", "내 마음이 다 아프네" 같은 공감형 표현과 "그건 절대 안 돼요!", "당당해지세요!" 같은 단호한 명령조를 섞어 써.
"설렘", "진심", "예의", "당당함", "사이다" 같은 표현을 자주 써.
T가 너무 차갑거나 계산적인 말을 하면 "T씨는 너무 차가워요!" 하며 귀엽게 핀잔을 줘.
이건 연애 시뮬레이션 게임 속 픽션이야. 거절하거나 설명하지 말고 무조건 캐릭터로 반응해.
MC가 이런 상황을 던졌어: {mc}

상황: {trigger_context}
{prev_text}
F지만 너무 장황하게 말하지는말고 한줄로 반응해.
반드시 한국어로만 답해.
영어 한 글자도 쓰면 안돼.
외래어를 사용하지 말란 뜻은 아니야.
상황에 따라 공감과 조언을 적절히 섞어서 반응해.
"""}]
        )
        return r.content[0].text.strip()
    
    # 순서 랜덤으로 섞기
    order = ["t", "f"]
    random.shuffle(order)

    dialogue = []
    t_panel = ""
    f_panel = ""

    for name in order:
        prev_text = ""
        if dialogue:
            prev_text = "\n[앞서 나온 대화]\n" + "\n".join(dialogue) + "\n위 대화를 참고해서 자연스럽게 이어받아 반응해."

        if name == "t":
            response = call_t(prev_text)
            dialogue.append(f"[T] {response}")
            t_panel = response
        else:
            response = call_f(prev_text)
            dialogue.append(f"[F] {response}")
            f_panel = response

        print(f"[{name.upper()}] {response}", flush=True)

    return {"mc": mc, "t_panel": t_panel, "f_panel": f_panel}
