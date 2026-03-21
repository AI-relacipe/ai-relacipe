import { useState } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function LoginPage({ onLogin, theme }) {
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password.trim()) {
      setError('아이디와 비밀번호를 입력해주세요.')
      return
    }

    if (isRegister && password !== confirmPw) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    setLoading(true)
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login'
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })

      if (!res.ok) {
        const err = await res.json()
        setError(err.detail || '요청에 실패했습니다.')
        return
      }

      const data = await res.json()
      localStorage.setItem('token', data.token)
      localStorage.setItem('username', data.username)
      onLogin(data.token, data.username)
    } catch (err) {
      setError('서버 연결에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const s = makeStyles(theme)

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.logoArea}>
          <span style={s.logo}>💜</span>
          <h1 style={s.title}>Relacipe</h1>
          <p style={s.subtitle}>AI 연애 시뮬레이션</p>
        </div>

        <div style={s.tabRow}>
          <button
            style={{ ...s.tab, ...(isRegister ? {} : s.tabActive) }}
            onClick={() => { setIsRegister(false); setError('') }}
          >로그인</button>
          <button
            style={{ ...s.tab, ...(isRegister ? s.tabActive : {}) }}
            onClick={() => { setIsRegister(true); setError('') }}
          >회원가입</button>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="아이디"
            style={s.input}
            autoFocus
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="비밀번호"
            style={s.input}
          />
          {isRegister && (
            <input
              type="password"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              placeholder="비밀번호 확인"
              style={s.input}
            />
          )}

          {error && <div style={s.error}>{error}</div>}

          <button type="submit" disabled={loading} style={s.btn}>
            {loading ? '처리 중...' : isRegister ? '가입하기' : '시작하기'}
          </button>
        </form>

        <p style={s.switchText}>
          {isRegister ? '이미 계정이 있나요? ' : '계정이 없나요? '}
          <span
            style={s.switchLink}
            onClick={() => { setIsRegister(!isRegister); setError('') }}
          >
            {isRegister ? '로그인' : '회원가입'}
          </span>
        </p>
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
    width: 380, padding: '40px 32px', borderRadius: 20,
    background: t.bgPanel, border: `1px solid ${t.border}`,
    display: 'flex', flexDirection: 'column', gap: 24,
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  logoArea: {
    textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
  },
  logo: { fontSize: 40 },
  title: {
    fontSize: 28, fontWeight: 700, color: t.textMain, margin: 0,
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 13, color: t.textMuted, margin: 0 },

  tabRow: {
    display: 'flex', gap: 0, borderRadius: 10, overflow: 'hidden',
    border: `1px solid ${t.border}`,
  },
  tab: {
    flex: 1, padding: '10px 0', border: 'none',
    background: 'transparent', color: t.textMuted,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabActive: {
    background: t.primary, color: '#fff',
  },

  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: {
    padding: '12px 14px', borderRadius: 10,
    border: `1px solid ${t.border}`, background: t.bgInput,
    color: t.textMain, fontSize: 14, outline: 'none',
    transition: 'border-color 0.2s',
  },
  error: {
    padding: '8px 12px', borderRadius: 8,
    background: 'rgba(239,68,68,0.1)', color: '#ef4444',
    fontSize: 13, textAlign: 'center',
  },
  btn: {
    padding: '12px 0', borderRadius: 10, background: t.primary,
    color: '#fff', fontSize: 15, fontWeight: 600,
    border: 'none', cursor: 'pointer',
    transition: 'opacity 0.2s',
  },

  switchText: {
    textAlign: 'center', fontSize: 13, color: t.textMuted, margin: 0,
  },
  switchLink: {
    color: t.primary, cursor: 'pointer', fontWeight: 600,
  },
})
