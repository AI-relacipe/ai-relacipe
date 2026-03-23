import { useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import LoginPage from './components/LoginPage'
import ChatList from './components/ChatList'
import SetupForm from './components/SetupForm'
import ChatPanel from './components/ChatPanel'
import PanelSection from './components/PanelSection'
import LandingPage from './components/LandingPage'
import { theme as defaultTheme, THEMES } from './theme'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function ThemeSwitcher({ activeTheme, onChange }) {
  const [open, setOpen] = useState(false)
  const activeName = Object.entries(THEMES).find(([, t]) => t === activeTheme)?.[0] ?? '로맨스'

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button
        style={{ ...sw.btn, borderColor: activeTheme.primary, color: activeTheme.textMain }}
        onClick={() => setOpen(v => !v)}
      >
        🎨 {activeName}
      </button>
      {open && (
        <div style={{ ...sw.dropdown, background: activeTheme.bgPanel, borderColor: activeTheme.border }}>
          {Object.entries(THEMES).map(([name, t]) => (
            <div
              key={name}
              style={{
                ...sw.item,
                color: t === activeTheme ? activeTheme.primary : activeTheme.textMain,
                background: t === activeTheme ? activeTheme.bgBase : 'transparent',
              }}
              onClick={() => { onChange(t); setOpen(false) }}
            >
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const sw = {
  btn: {
    width: '100%', padding: '8px 10px', borderRadius: 20, border: '1px solid',
    background: 'rgba(0,0,0,0.3)', fontSize: 12, cursor: 'pointer',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  dropdown: {
    position: 'absolute', bottom: '110%', left: 0,
    border: '1px solid', borderRadius: 12,
    overflow: 'hidden', width: '100%', zIndex: 100,
  },
  item: {
    padding: '10px 12px', fontSize: 13, cursor: 'pointer', fontWeight: 600,
  },
}

export default function App() {
  const navigate = useNavigate()

  // 인증 상태
  const [token, setToken] = useState(localStorage.getItem('token') || null)
  const [username, setUsername] = useState(localStorage.getItem('username') || null)

  // 채팅 상태
  const [sessionId, setSessionId] = useState(null)
  const [persona, setPersona] = useState(null)
  const [initialHistory, setInitialHistory] = useState([])
  const [panels, setPanels] = useState([])
  const [isPanelActive, setIsPanelActive] = useState(false)
  const [activeTheme, setActiveTheme] = useState(defaultTheme)

  const handleLogin = (newToken, newUsername) => {
    setToken(newToken)
    setUsername(newUsername)
    navigate('/chatlist')
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    setToken(null)
    setUsername(null)
    setSessionId(null)
    setPersona(null)
    setPanels([])
    navigate('/login')
  }

  const handleNewChat = () => {
    setSessionId(null)
    setPersona(null)
    setInitialHistory([])
    setPanels([])
    setIsPanelActive(false)
    navigate('/setup')
  }

  const handleStart = (sid, form) => {
    setSessionId(sid)
    setPersona(form)
    setInitialHistory([])
    setPanels([])
    setIsPanelActive(false)
    navigate('/chat')
  }

  const handleSelectSession = async (session) => {
    try {
      const res = await fetch(`${API}/session/${session.session_id}/resume?token=${token}`)
      if (res.ok) {
        const data = await res.json()
        setSessionId(session.session_id)
        setPersona({
          ...data.persona,
          scenario: session.scenario,
          chat_type: session.chat_type,
          profileImage: data.profile_image || null,
        })
        setInitialHistory(data.history || [])
        setPanels([])
        setIsPanelActive(false)
        navigate('/chat')
      } else {
        alert('세션을 불러올 수 없습니다.')
      }
    } catch {
      alert('서버 연결에 실패했습니다.')
    }
  }

  const handlePanelStart = () => setIsPanelActive(true)

  const handlePanel = (data) => {
    setPanels(prev => [...prev, data])
    setIsPanelActive(true)
    setTimeout(() => setIsPanelActive(false), 2000)
  }

  const handleReset = (newSid, newPersona) => {
    setSessionId(newSid)
    setPersona(newPersona)
    setPanels([])
    setIsPanelActive(false)
  }

  const handleBackToList = () => {
    setSessionId(null)
    setPersona(null)
    setPanels([])
    navigate('/chatlist')
  }

  const themeSwitcher = <ThemeSwitcher activeTheme={activeTheme} onChange={setActiveTheme} />

  return (
    <Routes>
      {/* 랜딩 */}
      <Route
        path="/"
        element={<LandingPage onEnter={() => navigate(token ? '/chatlist' : '/login')} />}
      />

      {/* 로그인 */}
      <Route
        path="/login"
        element={
          token ? <Navigate to="/chatlist" replace /> : (
            <>
              <LoginPage onLogin={handleLogin} theme={activeTheme} />
              <div style={{ position: 'fixed', bottom: 20, left: 20, width: 160 }}>
                {themeSwitcher}
              </div>
            </>
          )
        }
      />

      {/* 대화 목록 */}
      <Route
        path="/chatlist"
        element={
          !token ? <Navigate to="/login" replace /> : (
            <>
              <ChatList
                token={token}
                username={username}
                onSelectSession={handleSelectSession}
                onNewChat={handleNewChat}
                onLogout={handleLogout}
                theme={activeTheme}
              />
              <div style={{ position: 'fixed', bottom: 20, left: 20, width: 160 }}>
                {themeSwitcher}
              </div>
            </>
          )
        }
      />

      {/* 캐릭터 설정 */}
      <Route
        path="/setup"
        element={
          !token ? <Navigate to="/login" replace /> : (
            <>
              <SetupForm onStart={handleStart} theme={activeTheme} />
              <div style={{ position: 'fixed', bottom: 20, left: 20, width: 160 }}>
                {themeSwitcher}
              </div>
              <button
                onClick={handleBackToList}
                style={{
                  position: 'fixed', top: 20, left: 20,
                  padding: '8px 16px', borderRadius: 8,
                  background: activeTheme.bgPanel, color: activeTheme.textMuted,
                  border: `1px solid ${activeTheme.border}`, cursor: 'pointer',
                  fontSize: 13, fontWeight: 600,
                }}
              >← 대화 목록</button>
            </>
          )
        }
      />

      {/* 채팅 */}
      <Route
        path="/chat"
        element={
          !token ? <Navigate to="/login" replace /> :
          !sessionId ? <Navigate to="/chatlist" replace /> : (
            <div style={{ height: '100vh', width: '100vw', background: activeTheme.bgBase, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '95%', height: '95%', display: 'flex', overflow: 'hidden', borderRadius: 16, border: `1px solid ${activeTheme.border}`, position: 'relative' }}>
                <button
                  onClick={handleBackToList}
                  style={{
                    position: 'absolute', top: 8, left: 8, zIndex: 10,
                    width: 184, padding: '6px 0', borderRadius: 6, textAlign: 'center',
                    background: activeTheme.bgPanel, color: activeTheme.textMuted,
                    border: `1px solid ${activeTheme.border}`, cursor: 'pointer',
                    fontSize: 13, fontWeight: 700,
                  }}
                >← 목록</button>
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                  <ChatPanel key={sessionId} sessionId={sessionId} persona={persona} initialHistory={initialHistory} onPanelStart={handlePanelStart} onPanel={handlePanel} onReset={handleReset} theme={activeTheme} themeSlot={themeSwitcher} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <PanelSection panels={panels} isActive={isPanelActive} theme={activeTheme} />
                </div>
              </div>
            </div>
          )
        }
      />

      {/* 없는 경로 → 랜딩으로 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
