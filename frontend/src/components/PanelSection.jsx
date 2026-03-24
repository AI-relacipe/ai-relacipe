import { useState, useEffect, useRef, Fragment } from 'react'
import { createPortal } from 'react-dom'
import { getDominantColor } from '../utils/colorUtils'

import { API } from '../utils/api'

export default function PanelSection({ panels, isActive, theme }) {
  const bottomRef = useRef(null)
  const [blink, setBlink] = useState(false)
  const [tImage, setTImage] = useState(() => localStorage.getItem('panel_t_image') || null)
  const [fImage, setFImage] = useState(() => localStorage.getItem('panel_f_image') || null)
  const [tBgColor, setTBgColor] = useState(() => localStorage.getItem('panel_t_bg') || null)
  const [fBgColor, setFBgColor] = useState(() => localStorage.getItem('panel_f_bg') || null)
  const [modal, setModal] = useState(null) // 'T' | 'F' | null
  const tFileRef = useRef(null)
  const fFileRef = useRef(null)

  useEffect(() => {
    if (!isActive) return
    let cancelled = false
    const tick = (on) => {
      if (cancelled) return
      setBlink(on)
      setTimeout(() => tick(!on), on ? 400 : 2400)
    }
    tick(true)
    return () => { cancelled = true }
  }, [isActive])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [panels])

  const handleAvatarClick = (label) => {
    const hasImage = label === 'T' ? tImage : fImage
    if (hasImage) {
      setModal(label)
    } else {
      label === 'T' ? tFileRef.current?.click() : fFileRef.current?.click()
    }
  }

  const handleAvatarUpload = async (e, label) => {
    const file = e.target.files?.[0]
    if (!file) return
    const token = localStorage.getItem('token')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('token', token)
    try {
      const res = await fetch(API + '/upload/avatar', { method: 'POST', body: formData })
      if (!res.ok) { alert('업로드 실패'); return }
      const data = await res.json()
      if (label === 'T') {
        setTImage(data.image_url)
        localStorage.setItem('panel_t_image', data.image_url)
        getDominantColor(API + data.image_url).then(color => {
          if (color) { setTBgColor(color); localStorage.setItem('panel_t_bg', color) }
        }).catch(() => {})
      } else {
        setFImage(data.image_url)
        localStorage.setItem('panel_f_image', data.image_url)
        getDominantColor(API + data.image_url).then(color => {
          if (color) { setFBgColor(color); localStorage.setItem('panel_f_bg', color) }
        }).catch(() => {})
      }
    } catch {
      alert('업로드 중 오류가 발생했습니다.')
    } finally {
      e.target.value = ''
      setModal(null)
    }
  }

  const handleRemoveImage = (label) => {
    if (label === 'T') {
      setTImage(null); setTBgColor(null)
      localStorage.removeItem('panel_t_image'); localStorage.removeItem('panel_t_bg')
    } else {
      setFImage(null); setFBgColor(null)
      localStorage.removeItem('panel_f_image'); localStorage.removeItem('panel_f_bg')
    }
    setModal(null)
  }

  const s = makeStyles(theme)
  const currentModalImage = modal === 'T' ? tImage : fImage

  return (
    <div style={s.wrap}>

      {/* 상단 상태 바 */}
      <div style={s.statusBar}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
          width: '100%',
          border: isActive ? '2px solid rgba(220,20,20,0.6)' : '2px solid rgba(100,100,100,0.3)',
          borderRadius: 8, padding: '16px 36px',
          transition: 'all 0.3s',
        }}>
          <span style={{
            ...s.dot,
            background: isActive ? '#ff2222' : '#555',
            boxShadow: isActive ? '0 0 6px 3px #ff4444, 0 0 16px 6px rgba(255,60,60,0.5)' : 'none',
            opacity: isActive ? (blink ? 1 : 0.05) : 1,
            transition: blink ? 'opacity 1s ease-in' : 'opacity 3s ease-out',
          }} />
          <span style={{
            fontSize: 20, fontWeight: 800, letterSpacing: '0.25em',
            color: isActive ? '#ff5555' : '#666',
          }}>ON AIR</span>
        </div>
      </div>

      {/* 대화 영역 */}
      <div style={s.bubbleSection}>
        <div style={s.bubbleBox}>
          <div style={s.bubbleTitle}>패널들의 대화창</div>
          <div style={s.bubbleContent}>
            {panels.length === 0 ? (
              <span style={{ ...s.placeholder, gridColumn: '1 / -1' }}>대화를 진행하면 패널이 생성됩니다.</span>
            ) : (
              panels.map((p, i) => (
                <Fragment key={i}>
                  {i > 0 && <div style={{ gridColumn: '1 / -1', height: 8 }} />}
                  <PanelAvatar label="T" color={tBgColor || theme.primary} image={tImage} onClick={() => handleAvatarClick('T')} />
                  <PanelBubble text={p.t} theme={theme} color={theme.primary} align="left" />
                  <div />
                  <div />
                  <PanelBubble text={p.f} theme={theme} color={theme.accent} align="right" />
                  <PanelAvatar label="F" color={fBgColor || theme.accent} image={fImage} onClick={() => handleAvatarClick('F')} />
                </Fragment>
              ))
            )}
            <div ref={bottomRef} style={{ gridColumn: '1 / -1' }} />
          </div>
        </div>
      </div>

      {/* hidden file inputs */}
      <input ref={tFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleAvatarUpload(e, 'T')} />
      <input ref={fFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleAvatarUpload(e, 'F')} />

      {/* 이미지 변경 모달 */}
      {modal && createPortal(
        <div style={s.modalOverlay} onClick={() => setModal(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalPreview}>
              <img src={`${API}${currentModalImage}`} alt="프로필" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
            </div>
            <div style={s.modalBtns}>
              <button style={s.modalBtnChange} onClick={() => (modal === 'T' ? tFileRef : fFileRef).current?.click()}>이미지 변경</button>
              <button style={s.modalBtnRemove} onClick={() => handleRemoveImage(modal)}>이미지 제거</button>
              <button style={s.modalBtnClose} onClick={() => setModal(null)}>닫기</button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  )
}

function PanelAvatar({ label, color, image, onClick }) {
  return (
    <div
      onClick={onClick}
      title={image ? '클릭하여 이미지 관리' : '클릭하여 이미지 추가'}
      style={{
        width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, color: '#fff',
        backgroundColor: color,
        backgroundImage: image ? `url(${API}${image})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        margin: '0 auto', cursor: 'pointer',
      }}
    >
      {!image && label}
    </div>
  )
}

function PanelBubble({ text, theme, color, align }) {
  const isRight = align === 'right'
  return (
    <div style={{
      padding: '10px 14px',
      borderRadius: isRight ? '14px 0 14px 14px' : '0 14px 14px 14px',
      background: theme.bgPanel, border: `1px solid ${color}`,
      display: 'flex', flexDirection: 'column', gap: 4,
      justifySelf: isRight ? 'end' : 'start',
      maxWidth: '100%',
    }}>
      <span style={{ color, fontSize: 11, fontWeight: 700 }}>{isRight ? 'F형' : 'T형'}</span>
      <p style={{ fontSize: 13, color: theme.textMain, lineHeight: 1.6, margin: 0 }}>{text}</p>
    </div>
  )
}

const makeStyles = (t) => ({
  wrap: {
    display: 'flex', flexDirection: 'column', height: '100%',
    background: t.bgBase, borderLeft: `2px solid ${t.border}`,
  },
  statusBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '12px 20px', borderBottom: `2px solid ${t.border}`,
    flexShrink: 0,
  },
  dot: { width: 14, height: 14, borderRadius: '50%', transition: 'all 0.3s' },
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
    display: 'grid',
    gridTemplateColumns: '82px 1fr 82px',
    columnGap: 10,
    rowGap: 12,
    alignItems: 'start',
    alignContent: 'start',
  },
  placeholder: { color: t.textMuted, fontSize: 14, textAlign: 'center', marginTop: 20 },
  modalOverlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  modalBox: {
    background: t.bgPanel, border: `1px solid ${t.border}`,
    borderRadius: 16, padding: 24,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
    minWidth: 240,
  },
  modalPreview: {
    width: 160, height: 160, borderRadius: 12,
    overflow: 'hidden', border: `1px solid ${t.border}`,
  },
  modalBtns: { display: 'flex', flexDirection: 'column', gap: 8, width: '100%' },
  modalBtnChange: {
    width: '100%', padding: '10px 0', borderRadius: 8, border: 'none',
    background: t.primary, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
  },
  modalBtnRemove: {
    width: '100%', padding: '10px 0', borderRadius: 8, border: `1px solid rgba(220,60,60,0.5)`,
    background: 'transparent', color: '#ff6666', fontWeight: 700, fontSize: 14, cursor: 'pointer',
  },
  modalBtnClose: {
    width: '100%', padding: '10px 0', borderRadius: 8, border: `1px solid ${t.border}`,
    background: 'transparent', color: t.textMuted, fontWeight: 600, fontSize: 14, cursor: 'pointer',
  },
})
