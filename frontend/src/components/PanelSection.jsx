import { useEffect, useRef } from 'react'

export default function PanelSection({ panels, isActive, theme }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [panels])

  const s = makeStyles(theme)

  return (
    <div style={s.wrap}>

      {/* 상단 상태 바 */}
      <div style={s.statusBar}>
        <span style={{ ...s.dot, background: isActive ? '#4ade80' : '#555', boxShadow: isActive ? '0 0 8px #4ade80' : 'none' }} />
        <span style={s.statusText}>대화중</span>
      </div>

      {/* 말풍선 영역 */}
      <div style={s.bubbleSection}>
        <div style={s.bubbleBox}>
          <div style={s.bubbleTitle}>패널들의 대화창</div>
          <div style={s.bubbleContent}>
            {panels.length === 0 ? (
              <span style={s.placeholder}>대화를 진행하면 패널이 생성됩니다.</span>
            ) : (
              panels.map((p, i) => (
                <div key={i} style={s.panelGroup}>
                  <PanelBubble label="T" color={theme.primary} text={p.t} theme={theme} side="left" />
                  <PanelBubble label="F" color={theme.accent} text={p.f} theme={theme} side="right" />
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
        </div>
        {/* 말풍선 꼬리 */}
        <div style={s.bubbleTail} />
      </div>

      {/* 캐릭터 삽입 영역 */}
      <div style={s.charSection}>
        <div style={s.charTitle}>캐릭터 삽입 영역</div>
        <div style={s.charBoxRow}>
          <div style={s.charBox} />
          <div style={s.charBox} />
        </div>
      </div>

    </div>
  )
}

function PanelBubble({ label, color, text, theme, side = 'left' }) {
  const isRight = side === 'right'
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: isRight ? 'row-reverse' : 'row' }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700, color: '#fff', background: color,
      }}>{label}</div>
      <div style={{
        flex: 1, padding: '10px 14px',
        borderRadius: isRight ? '14px 0 14px 14px' : '0 14px 14px 14px',
        background: theme.bgPanel, border: `1px solid ${color}`,
        display: 'flex', flexDirection: 'column', gap: 4,
        alignItems: isRight ? 'flex-end' : 'flex-start',
      }}>
        <span style={{ color, fontSize: 11, fontWeight: 700 }}>{label}형</span>
        <p style={{ fontSize: 13, color: theme.textMain, lineHeight: 1.6, margin: 0, textAlign: isRight ? 'right' : 'left' }}>{text}</p>
      </div>
    </div>
  )
}

const makeStyles = (t) => ({
  wrap: {
    display: 'flex', flexDirection: 'column', height: '100%',
    background: t.bgBase, borderLeft: `2px solid ${t.border}`,
  },

  statusBar: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 20px', borderBottom: `2px solid ${t.border}`,
    background: t.bgBase, flexShrink: 0,
  },
  dot: { width: 12, height: 12, borderRadius: '50%', transition: 'all 0.3s' },
  statusText: { fontSize: 14, color: t.textMain, fontWeight: 600 },

  bubbleSection: {
    flex: 1, display: 'flex', flexDirection: 'column',
    padding: '20px 20px 0 20px', minHeight: 0,
  },
  bubbleBox: {
    flex: 1, border: `2px solid ${t.border}`, borderRadius: 16,
    background: t.bgPanel, display: 'flex', flexDirection: 'column',
    overflow: 'hidden', minHeight: 0,
  },
  bubbleTitle: {
    padding: '14px 20px', fontSize: 18, fontWeight: 700, color: t.textMain,
    borderBottom: `1px solid ${t.border}`, flexShrink: 0,
  },
  bubbleContent: {
    flex: 1, overflowY: 'auto', padding: '16px',
    display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center',
  },
  placeholder: { color: t.textMuted, fontSize: 14, textAlign: 'center', marginTop: 20 },
  panelGroup: { display: 'flex', flexDirection: 'column', gap: 10 },

  bubbleTail: {
    width: 0, height: 0, alignSelf: 'center',
    borderLeft: '16px solid transparent',
    borderRight: '16px solid transparent',
    borderTop: `18px solid ${t.border}`,
    flexShrink: 0,
  },

  charSection: {
    flexShrink: 0, padding: '16px 20px 20px 20px',
    borderTop: `2px solid ${t.border}`, background: t.bgBase,
  },
  charTitle: {
    fontSize: 16, fontWeight: 700, color: t.textMain,
    textAlign: 'center', marginBottom: 12,
  },
  charBoxRow: { display: 'flex', gap: 16, justifyContent: 'center' },
  charBox: {
    width: 140, height: 100, border: `2px solid ${t.border}`,
    borderRadius: 8, background: t.bgPanel,
  },
})
