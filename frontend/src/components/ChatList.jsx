import { useState, useEffect } from 'react'

import { API } from '../utils/api'

export default function ChatList({ token, username, onSelectSession, onNewChat, onLogout, theme }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${API}/sessions?token=${token}`)
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
      }
    } catch (err) {
      console.error('세션 목록 로드 실패:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (sessionId, e) => {
    e.stopPropagation()
    if (!confirm('이 대화를 삭제하시겠습니까?')) return
    try {
      await fetch(`${API}/session/${sessionId}?token=${token}`, { method: 'DELETE' })
      setSessions(prev => prev.filter(s => s.session_id !== sessionId))
    } catch (err) {
      alert('삭제 실패')
    }
  }

  const s = makeStyles(theme)

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.header}>
          <div>
            <h2 style={s.title}>내 대화</h2>
            <p style={s.subtitle}>{username}님, 안녕하세요!</p>
          </div>
          <button onClick={onLogout} style={s.logoutBtn}>로그아웃</button>
        </div>

        <button onClick={onNewChat} style={s.newBtn}>+ 새 대화 시작</button>

        <div style={s.list}>
          {loading ? (
            <p style={s.empty}>로딩 중...</p>
          ) : sessions.length === 0 ? (
            <div style={s.emptyBox}>
              <span style={{ fontSize: 40 }}>💬</span>
              <p style={s.empty}>아직 대화가 없습니다</p>
              <p style={s.emptyHint}>위 버튼을 눌러 새 대화를 시작해보세요!</p>
            </div>
          ) : (
            sessions.map(session => (
              <div
                key={session.session_id}
                style={s.sessionCard}
                onClick={() => onSelectSession(session)}
                onMouseEnter={e => e.currentTarget.style.borderColor = theme.primary}
                onMouseLeave={e => e.currentTarget.style.borderColor = theme.border}
              >
                <div style={s.sessionTop}>
                  <div style={s.avatar}>{session.persona_name[0]}</div>
                  <div style={s.sessionInfo}>
                    <span style={s.personaName}>{session.persona_name}</span>
                    <span style={s.scenario}>{session.scenario}</span>
                  </div>
                  <div style={s.sessionMeta}>
                    <span style={{
                      ...s.badge,
                      background: session.chat_type === 'offline' ? '#4ade80' : theme.primary,
                    }}>
                      {session.chat_type === 'offline' ? '만남' : '메신저'}
                    </span>
                    <button
                      onClick={(e) => handleDelete(session.session_id, e)}
                      style={s.deleteBtn}
                    >삭제</button>
                  </div>
                </div>
                <span style={s.date}>
                  {new Date(session.updated_at).toLocaleDateString('ko-KR', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

const makeStyles = (t) => ({
  wrap: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100vh', background: t.bgBase,
  },
  card: {
    width: 480, maxHeight: '85vh', padding: '32px',
    borderRadius: 20, background: t.bgPanel,
    border: `1px solid ${t.border}`,
    display: 'flex', flexDirection: 'column', gap: 20,
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  title: { fontSize: 22, fontWeight: 700, color: t.textMain, margin: 0 },
  subtitle: { fontSize: 13, color: t.textMuted, margin: '4px 0 0' },
  logoutBtn: {
    padding: '6px 14px', borderRadius: 8, border: `1px solid ${t.border}`,
    background: 'transparent', color: t.textMuted, fontSize: 12,
    cursor: 'pointer', fontWeight: 600,
  },

  newBtn: {
    padding: '14px 0', borderRadius: 12, background: t.primary,
    color: '#fff', fontSize: 15, fontWeight: 600,
    border: 'none', cursor: 'pointer',
    transition: 'opacity 0.2s',
  },

  list: {
    display: 'flex', flexDirection: 'column', gap: 10,
    overflowY: 'auto', flex: 1,
  },
  emptyBox: {
    textAlign: 'center', padding: '40px 0',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
  },
  empty: { color: t.textMuted, fontSize: 14, margin: 0 },
  emptyHint: { color: t.textMuted, fontSize: 12, margin: 0, opacity: 0.7 },

  sessionCard: {
    padding: '14px 16px', borderRadius: 12,
    border: `1px solid ${t.border}`, background: t.bgBase,
    cursor: 'pointer', transition: 'border-color 0.2s',
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  sessionTop: {
    display: 'flex', alignItems: 'center', gap: 12,
  },
  avatar: {
    width: 40, height: 40, borderRadius: '50%', background: t.accent,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0,
  },
  sessionInfo: {
    flex: 1, display: 'flex', flexDirection: 'column', gap: 2,
  },
  personaName: { fontSize: 15, fontWeight: 600, color: t.textMain },
  scenario: { fontSize: 12, color: t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sessionMeta: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4,
  },
  badge: {
    padding: '2px 8px', borderRadius: 6, color: '#fff',
    fontSize: 11, fontWeight: 600,
  },
  deleteBtn: {
    padding: '2px 8px', borderRadius: 4, border: 'none',
    background: 'rgba(239,68,68,0.15)', color: '#ef4444',
    fontSize: 11, cursor: 'pointer',
  },
  date: { fontSize: 11, color: t.textMuted, opacity: 0.7 },
})
