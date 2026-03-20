import { useState } from 'react'
import SetupForm from './components/SetupForm'
import ChatPanel from './components/ChatPanel'
import PanelSection from './components/PanelSection'
import { theme as defaultTheme, THEMES } from './theme'
import LandingPage from './components/LandingPage' 

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
  const [sessionId, setSessionId] = useState(null)
  const [persona, setPersona] = useState(null)
  const [panels, setPanels] = useState([])
  const [isPanelActive, setIsPanelActive] = useState(false)
  const [activeTheme, setActiveTheme] = useState(defaultTheme)
  const [showLanding, setShowLanding] = useState(true) 

  const handleStart = (sid, form) => {
    setSessionId(sid)
    setPersona(form)
  }

  const handlePanelStart = () => setIsPanelActive(true)

  const handlePanel = (data) => {
    setPanels(prev => [...prev, data])
    setIsPanelActive(false)
  }

  const handleReset = (newSid, newPersona) => {
    setSessionId(newSid)
    setPersona(newPersona)
    setPanels([])
    setIsPanelActive(false)
  }

  const themeSwitcher = <ThemeSwitcher activeTheme={activeTheme} onChange={setActiveTheme} />


  if (showLanding) {
  return <LandingPage onEnter={() => setShowLanding(false)} />
} 

  if (!sessionId) {
    return (
      <>
        <SetupForm onStart={handleStart} theme={activeTheme} />
        <div style={{ position: 'fixed', bottom: 20, left: 20, width: 160 }}>
          {themeSwitcher}
        </div>
      </>
    )
  }

  return (
    <div style={{ height: '100vh', width: '100vw', background: activeTheme.bgBase, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '95%', height: '95%', display: 'flex', overflow: 'hidden', borderRadius: 16, border: `1px solid ${activeTheme.border}` }}>
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <ChatPanel sessionId={sessionId} persona={persona} onPanelStart={handlePanelStart} onPanel={handlePanel} onReset={handleReset} theme={activeTheme} themeSlot={themeSwitcher} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <PanelSection panels={panels} isActive={isPanelActive} theme={activeTheme} />
        </div>
      </div>
    </div>
  )
}
