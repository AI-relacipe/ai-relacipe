import { useState, useRef, useEffect } from 'react'

const API = 'http://localhost:8000'

const lighten = (hex, amount = 26) => {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (n >> 16) + amount)
  const g = Math.min(255, ((n >> 8) & 0xff) + amount)
  const b = Math.min(255, (n & 0xff) + amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

const FIELDS = [
  { key: 'name',         label: '이름' },
  { key: 'age',          label: '나이', type: 'number' },
  { key: 'gender',       label: '성별' },
  { key: 'nationality',  label: '국적' },
  { key: 'job',          label: '직업' },
  { key: 'personality',  label: '성격' },
  { key: 'speech_style', label: '말투' },
]

export default function ChatPanel({ sessionId, persona, onPanelStart, onPanel, onReset, theme, themeSlot }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState(persona)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || isTyping) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }, { role: 'assistant', content: '' }])
    setIsTyping(true)
    let aiText = ''
    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, message: text }),
      })
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = '', eventType = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (eventType === 'text') {
              try { aiText += JSON.parse(data) } catch { aiText += data }
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: aiText }
                return updated
              })
            } else if (eventType === 'panel_start') {
              onPanelStart()
            } else if (eventType === 'panel') {
              try { onPanel(JSON.parse(data)) } catch {}
            }
          }
        }
      }
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const handleSaveEdit = async () => {
    const res = await fetch(`${API}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...draft, scenario: persona.scenario }),
    })
    if (!res.ok) { alert('저장 실패'); return }
    const data = await res.json()
    setMessages([])
    setEditMode(false)
    onReset(data.session_id, { ...draft, scenario: persona.scenario })
  }

  const s = makeStyles(theme)

  return (
    <div style={s.wrap}>

      {/* 사이드바 */}
      <div style={s.sidebar}>
        <div style={s.avatarBtn} onClick={() => { setEditMode(v => !v); setDraft(persona) }}>
          {persona.name[0]}
        </div>
        {editMode ? (
          <>
            <span style={s.sideLabel}>수정</span>
            {FIELDS.map(f => (
              <div key={f.key} style={s.fieldRow}>
                <span style={s.fieldKey}>{f.label}</span>
                <input
                  type={f.type || 'text'}
                  value={draft[f.key]}
                  onChange={e => setDraft(p => ({ ...p, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
                  style={s.editInput}
                />
              </div>
            ))}
            <button onClick={handleSaveEdit} style={s.saveBtn}>저장·초기화</button>
            <button onClick={() => setEditMode(false)} style={s.cancelBtn}>취소</button>
          </>
        ) : (
          <>
            {FIELDS.map(f => (
              <div key={f.key} style={s.fieldRow}>
                <span style={s.fieldKey}>{f.label}</span>
                <span style={s.fieldVal}>{persona[f.key]}</span>
              </div>
            ))}
          </>
        )}
        <div style={{ marginTop: 'auto', paddingTop: 12 }}>
          {themeSlot}
        </div>
      </div>

      {/* 채팅 컬럼 */}
      <div style={s.chatColumn}>

        {/* 시나리오 바 */}
        <div style={s.scenarioBar}>
          <span style={s.scenarioLabel}>사용자 상황 설정</span>
          <span style={s.scenarioValue}>입력한 상황: {persona.scenario}</span>
        </div>

        {/* 메시지 영역 */}
        <div style={s.messages}>
          {messages.length === 0 && <div style={s.watermark}>사용자 대화창</div>}
          <div style={s.messagesInner}>
            {messages.map((msg, i) => (
              <div key={i} style={{ ...s.msgRow, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.role === 'assistant' && <div style={s.avatar}>{persona.name[0]}</div>}
                <div style={msg.role === 'user' ? s.bubbleUser : s.bubbleAI}>
                  {msg.content
                    ? msg.content
                    : (isTyping && i === messages.length - 1 ? <span style={s.typing}>···</span> : '')}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* 입력창 */}
        <div style={s.inputBar}>
          <div style={s.inputInner}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지 입력..."
              style={s.input}
            />
            <button onClick={sendMessage} disabled={isTyping} style={s.sendBtn}>전송</button>
          </div>
        </div>

      </div>
    </div>
  )
}

const makeStyles = (t) => ({
  wrap: { display: 'flex', flexDirection: 'row', height: '100%', width: '100%', overflow: 'hidden' },

  sidebar: {
    width: 160, flexShrink: 0, background: t.bgBase,
    borderRight: `1px solid ${t.border}`,
    display: 'flex', flexDirection: 'column', gap: 10,
    padding: '16px 12px', overflowY: 'auto',
  },
  avatarBtn: {
    width: 56, height: 56, borderRadius: '50%', background: t.accent,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 22, fontWeight: 700, color: '#fff',
    cursor: 'pointer', alignSelf: 'center', marginBottom: 6, flexShrink: 0,
  },
  sideLabel: { fontSize: 12, color: t.textMuted, fontWeight: 600 },
  fieldRow: { display: 'flex', flexDirection: 'column', gap: 2 },
  fieldKey: { fontSize: 11, color: t.textMuted },
  fieldVal: { fontSize: 14, color: t.textMain, wordBreak: 'break-all' },
  editInput: {
    padding: '3px 6px', borderRadius: 4, border: `1px solid ${t.border}`,
    background: t.bgInput, color: t.textMain, fontSize: 13, outline: 'none', width: '100%',
  },
  saveBtn: {
    padding: '6px 0', borderRadius: 6, background: t.primary,
    color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
  },
  cancelBtn: {
    padding: '6px 0', borderRadius: 6, background: t.bgPanel,
    color: t.textMuted, border: 'none', cursor: 'pointer', fontSize: 12,
  },

  chatColumn: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },

  scenarioBar: {
    padding: '8px 16px', background: t.bgPanel, flexShrink: 0,
    borderBottom: `1px solid ${t.border}`,
    display: 'flex', flexDirection: 'column', gap: 2,
  },
  scenarioLabel: { fontSize: 11, color: t.textMuted, fontWeight: 600 },
  scenarioValue: { fontSize: 12, color: t.textMuted },

  messages: {
    flex: 1, overflowY: 'auto', padding: '16px',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    position: 'relative',
  },
  watermark: {
    position: 'absolute', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: 22, color: t.border, fontWeight: 700, pointerEvents: 'none',
  },
  messagesInner: {
    width: '100%', maxWidth: 520,
    display: 'flex', flexDirection: 'column', gap: 10,
  },

  msgRow: { display: 'flex', alignItems: 'flex-end', gap: 8 },
  avatar: {
    width: 32, height: 32, borderRadius: '50%', background: t.accent,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 700, flexShrink: 0, color: '#fff',
  },
  bubbleUser: {
    maxWidth: '70%', padding: '10px 14px',
    borderRadius: '18px 18px 4px 18px',
    background: '#fee500', color: '#000', fontSize: 14, lineHeight: 1.5,
  },
  bubbleAI: {
    maxWidth: '70%', padding: '10px 14px',
    borderRadius: '18px 18px 18px 4px',
    background: lighten(t.bgPanel), color: t.textMain, fontSize: 14, lineHeight: 1.5,
  },
  typing: { fontSize: 18, letterSpacing: 3, color: t.textMuted },

  inputBar: {
    display: 'flex', justifyContent: 'center',
    padding: '12px 16px', flexShrink: 0,
    borderTop: `1px solid ${t.border}`, background: t.bgBase,
  },
  inputInner: {
    display: 'flex', gap: 8, width: '100%',
  },
  input: {
    flex: 1, padding: '10px 14px', borderRadius: 20,
    border: `1px solid ${t.border}`, background: t.bgInput,
    color: t.textMain, fontSize: 14, outline: 'none',
  },
  sendBtn: {
    padding: '10px 20px', borderRadius: 20, background: t.primary,
    color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
  },
})
