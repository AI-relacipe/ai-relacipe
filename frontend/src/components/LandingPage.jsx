import { useState, useEffect } from 'react'

const COLORS = {
  bg: '#1a0d1f',
  bgPanel: '#240d28',
  primary: '#c026d3',
  accent: '#db2777',
  neon: '#e879f9',
  textMain: '#f9fafb',
  textMuted: '#9d8fba',
  border: '#3b1e42',
  red: '#ff2222',
}

// ─── 맛보기 예시 데이터 ───
const CHAT_MESSAGES = [
  { from: 'user', text: '오늘 친구들이랑 홍대 나왔어' },
  { from: 'ai',   text: '재밌겠다. 누구랑?' },
  { from: 'user', text: '아 남사친들이랑. 왜?' },
  { from: 'ai',   text: '아니 그냥' },
  { from: 'user', text: '...질투해?' },
  { from: 'ai',   text: '아니거든요. 재밌게놀아.' },
]

const PANEL_MESSAGES = [
  { role: 'T', text: '"아니거든요"는 100% 맞다는 뜻입니다. 데이터상.' },
  { role: 'F', text: '질투 맞죠?! 이 부정이 더 귀여워서 못 봐주겠어요!!' },
  { role: 'T', text: '저 지금 연락 끊고 기다리는 전략 쓸 것 같은데요.' },
  { role: 'F', text: 'T씨 맞아요! 답장 늦게 오면 그거 신호예요 신호!!' },
]

// ─── 채팅 말풍선 프리뷰 ───
function ChatPreview() {
  const [visible, setVisible] = useState(0)

  useEffect(() => {
    if (visible >= CHAT_MESSAGES.length) return
    const t = setTimeout(() => setVisible(v => v + 1), 900)
    return () => clearTimeout(t)
  }, [visible])

  return (
    <div style={ps.box}>
      <div style={ps.header}>
        <span style={ps.dot} />
        <span style={ps.headerText}>💬 AI 연인과의 대화</span>
      </div>
      <div style={ps.body}>
        {CHAT_MESSAGES.slice(0, visible).map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
            {m.from === 'ai' && (
              <div style={ps.avatar}>AI</div>
            )}
            <div style={m.from === 'user' ? ps.bubbleUser : ps.bubbleAi}>
              {m.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── 패널 반응 프리뷰 ───
function PanelPreview() {
  const [visible, setVisible] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => {
      if (visible < PANEL_MESSAGES.length) setVisible(v => v + 1)
    }, visible === 0 ? 5800 : 1000)
    return () => clearTimeout(t)
  }, [visible])

  const roleStyle = {
    MC: { color: COLORS.neon, bg: 'rgba(232,121,249,0.12)', border: 'rgba(232,121,249,0.3)' },
    T:  { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.25)' },
    F:  { color: '#f472b6', bg: 'rgba(244,114,182,0.1)',  border: 'rgba(244,114,182,0.25)' },
  }

  return (
    <div style={ps.box}>
      <div style={{ ...ps.header, borderColor: 'rgba(232,121,249,0.2)' }}>
        <span style={{ ...ps.dot, background: COLORS.neon }} />
        <span style={ps.headerText}>🎙 패널 실시간 반응</span>
      </div>
      <div style={ps.body}>
        {PANEL_MESSAGES.slice(0, visible).map((m, i) => {
          const rs = roleStyle[m.role]
          return (
            <div key={i} style={{ marginBottom: 12, animation: 'fadeUp 0.4s ease' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ ...ps.roleTag, color: rs.color, background: rs.bg, border: `1px solid ${rs.border}` }}>
                  {m.role}
                </span>
                <span style={ps.panelText}>{m.text}</span>
              </div>
            </div>
          )
        })}
        {visible === 0 && (
          <p style={{ color: COLORS.textMuted, fontSize: 13, textAlign: 'center', marginTop: 24 }}>
            대화가 시작되면 패널이 개입합니다...
          </p>
        )}
      </div>
    </div>
  )
}

const ps = {
  box: {
    flex: 1,
    minWidth: 0,
    background: COLORS.bgPanel,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 16,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 380,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 16px',
    borderBottom: `1px solid ${COLORS.border}`,
    background: 'rgba(255,255,255,0.03)',
  },
  dot: {
    width: 8, height: 8,
    borderRadius: '50%',
    background: COLORS.red,
    boxShadow: `0 0 6px ${COLORS.red}`,
  },
  headerText: {
    fontSize: 13,
    fontWeight: 600,
    color: COLORS.textMuted,
  },
  body: {
    flex: 1,
    padding: '16px',
    overflowY: 'auto',
  },
  avatar: {
    width: 30, height: 30,
    borderRadius: '50%',
    background: COLORS.primary,
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    flexShrink: 0,
  },
  bubbleAi: {
    background: '#36143c',
    color: COLORS.textMain,
    padding: '10px 14px',
    borderRadius: '4px 16px 16px 16px',
    fontSize: 14,
    maxWidth: '75%',
    lineHeight: 1.5,
  },
  bubbleUser: {
    background: COLORS.primary,
    color: '#fff',
    padding: '10px 14px',
    borderRadius: '16px 4px 16px 16px',
    fontSize: 14,
    maxWidth: '75%',
    lineHeight: 1.5,
  },
  roleTag: {
    fontSize: 11,
    fontWeight: 800,
    padding: '3px 10px',
    borderRadius: 20,
    letterSpacing: '0.05em',
    flexShrink: 0,
    marginTop: 2,
  },
  panelText: {
    fontSize: 14,
    color: COLORS.textMain,
    lineHeight: 1.6,
  },
}

// ─── 패널 소개 카드 ───
function PanelCard({ icon, role, name, desc, color }) {
  return (
    <div style={{ ...pc.card, borderColor: color + '44' }}>
      <div style={{ ...pc.iconBox, background: color + '22', border: `1px solid ${color}55` }}>
        <span style={{ fontSize: 28 }}>{icon}</span>
      </div>
      <div style={pc.roleLabel(color)}>{role}</div>
      <div style={pc.name}>{name}</div>
      <div style={pc.desc}>{desc}</div>
    </div>
  )
}

const pc = {
  card: {
    flex: 1,
    minWidth: 200,
    background: COLORS.bgPanel,
    border: '1px solid',
    borderRadius: 20,
    padding: '28px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    textAlign: 'center',
  },
  iconBox: {
    width: 64, height: 64,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  roleLabel: (color) => ({
    fontSize: 11,
    fontWeight: 800,
    color,
    letterSpacing: '0.12em',
    background: color + '18',
    border: `1px solid ${color}44`,
    borderRadius: 20,
    padding: '3px 14px',
  }),
  name: {
    fontSize: 18,
    fontWeight: 700,
    color: COLORS.textMain,
  },
  desc: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 1.7,
  },
}

// ─── 메인 컴포넌트 ───
export default function LandingPage({ onEnter }) {
  const [blink, setBlink] = useState(true)

  useEffect(() => {
    const t = setInterval(() => setBlink(v => !v), 800)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={s.page}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes scrollLeft {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>

      {/* 배경 글로우 */}
      <div style={s.glowLeft} />
      <div style={s.glowRight} />

      {/* 네비바 */}
      <nav style={s.nav}>
        <div style={s.logo}>
          <span style={s.logoIcon}>📺</span>
          <span style={s.logoText}>ai-relacipe</span>
        </div>
        <button style={s.navBtn} onClick={onEnter}>대화 시작하기</button>
      </nav>

      {/* ── 섹션 1: 히어로 ── */}
      <section style={s.hero}>

        <div style={s.onAirBadge}>
          <span style={{ ...s.onAirDot, opacity: blink ? 1 : 0.15 }} />
          <span style={s.onAirText}>ON AIR</span>
        </div>

        <h1 style={s.title}>
          당신의 연애,<br />
          <span style={s.titleAccent}>지금 방송 중</span>
        </h1>

        <p style={s.subtitle}>
          AI 연인과 직접 대화하는 순간<br />
          MC, T패널, F패널이 당신의 연애를 <strong style={{ color: COLORS.neon }}>실시간으로 중계</strong>합니다
        </p>

        <button
          style={s.ctaBtn}
          onClick={onEnter}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = `0 0 36px ${COLORS.primary}99` }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = `0 0 20px ${COLORS.primary}55` }}
        >
          🎙 지금 대화 시작하기
        </button>

        <div style={s.broadcastBar}>
          <span style={s.liveTag}>LIVE</span>
          <span style={s.broadcastText}>지금 이 순간에도 패널들이 지켜보고 있습니다</span>
        </div>
      </section>

      {/* ── 섹션 2: 맛보기 프리뷰 ── */}
      <section style={s.section}>
        <div style={s.sectionLabel}>미리보기</div>
        <h2 style={s.sectionTitle}>이런 느낌이에요</h2>
        <p style={s.sectionDesc}>AI 연인과 나누는 대화, 패널들이 바로 옆에서 실시간으로 반응합니다</p>
        <div style={s.previewWrap}>
          <ChatPreview />
          <PanelPreview />
        </div>
      </section>

      {/* ── 섹션 3: 서비스 흐름 ── */}
      <section style={{ ...s.section, background: 'rgba(192,38,211,0.04)', width: '100%', alignItems: 'center' }}>
        <div style={s.sectionLabel}>진행 방식</div>
        <h2 style={s.sectionTitle}>어떻게 진행되나요?</h2>
        <div style={s.stepsWrap}>
          {[
            { num: '01', title: 'AI 연인 설정', desc: '이름, 나이, 성격, 말투, 상황까지\n원하는 연인을 직접 만들어요', icon: '💝' },
            { num: '02', title: '자유롭게 대화', desc: '퇴근 후 대화, 카페 만남 등\n다양한 상황으로 대화해요', icon: '💬' },
            { num: '03', title: '패널들이 개입', desc: '결정적인 순간, 패널들이\n당신의 연애에 참견합니다', icon: '📺' },
          ].map((step, i) => (
            <div key={i} style={s.stepCard}>
              <div style={s.stepNum}>{step.num}</div>
              <div style={s.stepIcon}>{step.icon}</div>
              <div style={s.stepTitle}>{step.title}</div>
              <div style={s.stepDesc}>{step.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 섹션 4: 패널 소개 ── */}
      <section style={s.section}>
        <div style={s.sectionLabel}>출연진</div>
        <h2 style={s.sectionTitle}>당신의 연애를 지켜보는 패널들</h2>
        <p style={s.sectionDesc}>혼자 고민하지 마세요 T패널과 F패널이 정반대 시각으로 당신 연애를 분석합니다</p>
        <div style={s.panelCardsWrap}>
          {/* <PanelCard
            icon="🎙"
            role="MC"
            name="메인 MC"
            desc={`상황을 정리하고 패널들을 이끄는\n진행자. 결정적인 순간을 놓치지 않아요`}
            color={COLORS.neon}
          /> */}
          <PanelCard
            icon="🧠"
            role="T 패널"
            name="팩트 분석가"
            desc={`감정보다 논리. 솔직한 팩트 직구로\n냉철하게 상황을 분석합니다`}
            color="#60a5fa"
          />
          <PanelCard
            icon="💗"
            role="F 패널"
            name="감성 해설가"
            desc={`공감과 위로, 그리고 화끈한 사이다.\n당신 편에서 함께 설레고 분노합니다`}
            color="#f472b6"
          />
        </div>
      </section>

      {/* ── 섹션 5: 최하단 CTA ── */}
      <section style={s.ctaSection}>
        <div style={s.onAirBadge}>
          <span style={{ ...s.onAirDot, opacity: blink ? 1 : 0.15 }} />
          <span style={s.onAirText}>ON AIR</span>
        </div>
        <h2 style={{ ...s.title, fontSize: 'clamp(28px, 4vw, 52px)' }}>
          지금 당신의 연애를<br />
          <span style={s.titleAccent}>시작해보세요</span>
        </h2>
        <p style={s.subtitle}>패널들이 기다리고 있습니다</p>
        <button
          style={s.ctaBtn}
          onClick={onEnter}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = `0 0 36px ${COLORS.primary}99` }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = `0 0 20px ${COLORS.primary}55` }}
        >
          🎙 대화 시작하기
        </button>
      </section>

      {/* 푸터 */}
      <footer style={s.footer}>
        <span style={{ color: COLORS.textMuted, fontSize: 13 }}>© 2026 ai-relacipe. AI 연애 리얼리티쇼</span>
      </footer>

    </div>
  )
}

// ─── 스타일 ───
const s = {
  page: {
    minHeight: '100vh',
    background: COLORS.bg,
    color: COLORS.textMain,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    overflowX: 'hidden',
  },
  glowLeft: {
    position: 'absolute', top: '5%', left: '-15%',
    width: 600, height: 600, borderRadius: '50%',
    background: 'radial-gradient(circle, #c026d318 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  glowRight: {
    position: 'absolute', top: '15%', right: '-15%',
    width: 500, height: 500, borderRadius: '50%',
    background: 'radial-gradient(circle, #db277718 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  nav: {
    width: '100%', maxWidth: 1100,
    padding: '20px 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  logo: { display: 'flex', alignItems: 'center', gap: 8 },
  logoIcon: { fontSize: 22 },
  logoText: {
    fontSize: 18, fontWeight: 800,
    color: COLORS.neon, letterSpacing: '0.04em',
  },
  navBtn: {
    padding: '8px 20px', fontSize: 14, fontWeight: 600,
    color: COLORS.textMain,
    background: 'transparent',
    border: `1px solid ${COLORS.border}`,
    borderRadius: 100, cursor: 'pointer',
  },
  hero: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    textAlign: 'center',
    padding: '80px 24px 100px',
    gap: 28, zIndex: 10,
    maxWidth: 800,
  },
  onAirBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    background: 'rgba(220,20,20,0.12)',
    border: '1px solid rgba(220,20,20,0.35)',
    borderRadius: 100, padding: '6px 16px',
  },
  onAirDot: {
    width: 8, height: 8, borderRadius: '50%',
    background: COLORS.red,
    boxShadow: `0 0 6px ${COLORS.red}`,
    display: 'inline-block', transition: 'opacity 0.3s',
  },
  onAirText: {
    fontSize: 12, fontWeight: 800,
    color: '#ff5555', letterSpacing: '0.15em',
  },
  title: {
    fontSize: 'clamp(36px, 6vw, 72px)',
    fontWeight: 800, lineHeight: 1.15,
    color: COLORS.textMain, letterSpacing: '-0.02em',
    margin: 0,
  },
  titleAccent: {
    color: COLORS.primary,
    textShadow: `0 0 40px ${COLORS.primary}66`,
  },
  subtitle: {
    fontSize: 'clamp(15px, 2vw, 18px)',
    color: COLORS.textMuted, lineHeight: 1.8,
    maxWidth: 520, margin: 0,
  },
  ctaBtn: {
    padding: '16px 44px', fontSize: 17, fontWeight: 700,
    color: '#fff',
    background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
    border: 'none', borderRadius: 100, cursor: 'pointer',
    boxShadow: `0 0 20px ${COLORS.primary}55`,
    transition: 'transform 0.2s, box-shadow 0.2s',
    letterSpacing: '0.02em',
  },
  broadcastBar: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 8, padding: '8px 20px',
  },
  liveTag: {
    fontSize: 10, fontWeight: 800, color: '#ff4444',
    background: 'rgba(255,0,0,0.12)',
    border: '1px solid rgba(255,0,0,0.25)',
    borderRadius: 4, padding: '2px 7px', letterSpacing: '0.1em',
  },
  broadcastText: {
    fontSize: 13, color: COLORS.textMuted, letterSpacing: '0.01em',
  },
  section: {
    width: '100%', maxWidth: 1100,
    padding: '80px 32px',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 20, zIndex: 10,
  },
  sectionLabel: {
    fontSize: 12, fontWeight: 700,
    color: COLORS.primary, letterSpacing: '0.15em',
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 'clamp(24px, 3.5vw, 40px)',
    fontWeight: 800, color: COLORS.textMain,
    margin: 0, textAlign: 'center',
  },
  sectionDesc: {
    fontSize: 16, color: COLORS.textMuted,
    textAlign: 'center', lineHeight: 1.7,
    maxWidth: 540, margin: 0,
  },
  previewWrap: {
    display: 'flex', gap: 16,
    width: '100%', marginTop: 12,
    flexWrap: 'wrap',
  },
  stepsWrap: {
    display: 'flex', gap: 20,
    width: '100%', marginTop: 12,
    flexWrap: 'wrap', justifyContent: 'center',
  },
  stepCard: {
    flex: 1, minWidth: 200, maxWidth: 300,
    background: COLORS.bgPanel,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 20, padding: '28px 24px',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 10, textAlign: 'center',
  },
  stepNum: {
    fontSize: 11, fontWeight: 800,
    color: COLORS.primary, letterSpacing: '0.1em',
  },
  stepIcon: { fontSize: 32 },
  stepTitle: {
    fontSize: 17, fontWeight: 700, color: COLORS.textMain,
  },
  stepDesc: {
    fontSize: 14, color: COLORS.textMuted,
    lineHeight: 1.7, whiteSpace: 'pre-line',
  },
  panelCardsWrap: {
    display: 'flex', gap: 20,
    width: '100%', marginTop: 12,
    flexWrap: 'wrap', justifyContent: 'center',
  },
  ctaSection: {
    width: '100%',
    padding: '100px 24px',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 28,
    textAlign: 'center', zIndex: 10,
    background: 'rgba(192,38,211,0.05)',
    borderTop: `1px solid ${COLORS.border}`,
  },
  footer: {
    padding: '24px 32px',
    borderTop: `1px solid ${COLORS.border}`,
    width: '100%', textAlign: 'center',
  },
}