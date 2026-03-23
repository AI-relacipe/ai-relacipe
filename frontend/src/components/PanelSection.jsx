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

      {/* 대화 영역 (전체 확장) */}
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
      </div>

    </div>
  )
}

function PanelBubble({ label, color, text, theme, side = 'left' }) {
  const isRight = side === 'right'
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: isRight ? 'row-reverse' : 'row' }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, color: '#fff', background: color,
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
    padding: '20px', minHeight: 0,
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
})
