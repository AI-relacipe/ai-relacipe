import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import * as faceapi from 'face-api.js'
import { getDominantColor } from '../utils/colorUtils'
import { API, VOICE_API } from '../utils/api'

const lighten = (hex, amount = 26) => {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (n >> 16) + amount)
  const g = Math.min(255, ((n >> 8) & 0xff) + amount)
  const b = Math.min(255, (n & 0xff) + amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

const EMOTION_KR = {
  happy: '행복', sad: '슬픔', angry: '화남', surprised: '놀람',
  disgusted: '불쾌', fearful: '불안', neutral: '무표정',
}

const FIELDS = [
  { key: 'name', label: '이름' }, { key: 'age', label: '나이', type: 'number' },
  { key: 'gender', label: '성별' }, { key: 'nationality', label: '국적' },
  { key: 'job', label: '직업' }, { key: 'personality', label: '성격' },
  { key: 'speech_style', label: '말투' },
]

export default function ChatPanel({ sessionId, persona, initialHistory, onPanelStart, onPanel, onReset, theme, themeSlot }) {
  const [messages, setMessages] = useState(
    () => (initialHistory || []).map(m => ({ role: m.role, content: m.content }))
  )
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState(persona)
  const [profileImage, setProfileImage] = useState(persona.profileImage || null)
  const [profileBgColor, setProfileBgColor] = useState(() => localStorage.getItem('profile_bg_color') || null)
  const [uploading, setUploading] = useState(false)
  const [profileModal, setProfileModal] = useState(false)
  const fileInputRef = useRef(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [emotion, setEmotion] = useState(null)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const bottomRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const detectIntervalRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const queueRef = useRef([])
  const processingRef = useRef(false)
  const debounceTimerRef = useRef(null)
  const abortControllerRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, isTyping])

  useEffect(() => {
    return () => { abortControllerRef.current?.abort() }
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models')
        await faceapi.nets.faceExpressionNet.loadFromUri('/models')
        setModelsLoaded(true)
      } catch (e) { console.error('모델 로드 실패:', e) }
    }
    load()
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } })
      streamRef.current = stream
      setCameraOn(true)
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream
        detectIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return
          const det = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions()).withFaceExpressions()
          if (det) {
            const sorted = Object.entries(det.expressions).sort((a, b) => b[1] - a[1])
            setEmotion({ label: sorted[0][0], score: sorted[0][1] })
          }
        }, 2000)
      }, 300)
    } catch (e) { alert('카메라 접근이 거부되었습니다.') }
  }

  const stopCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    if (detectIntervalRef.current) { clearInterval(detectIntervalRef.current); detectIntervalRef.current = null }
    setCameraOn(false)
    setEmotion(null)
  }

  const toggleCamera = useCallback(() => { cameraOn ? stopCamera() : startCamera() }, [cameraOn])

  useEffect(() => {
    return () => {
      stopCamera()
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      audioChunksRef.current = []
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const formData = new FormData()
        formData.append('file', blob, 'voice.webm')
        try {
          const res = await fetch(`${VOICE_API}/voice`, { method: 'POST', body: formData })
          if (res.ok) {
            const data = await res.json()
            const resolvedEmotion = data.emotion || null
            if (data.text?.trim()) sendMessage(data.text.trim(), resolvedEmotion)
          }
        } catch (e) { console.error('음성 서버 오류:', e) }
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
    } catch (e) { alert('마이크 접근이 거부되었습니다.') }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  const callAPI = async (text, resolvedEmotion, rapidFollowup = false) => {
    let fullText = ''
    let pendingPanel = null
    const isOnline = persona.chat_type === 'online'
    const controller = new AbortController()
    abortControllerRef.current = controller
    try {
      const body = { session_id: sessionId, message: text }
      if (resolvedEmotion) body.voice_emotion = resolvedEmotion
      if (emotion && cameraOn) body.camera_emotion = emotion
      if (rapidFollowup) body.rapid_followup = true
      const res = await fetch(API + '/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal })
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
          if (line.startsWith('event: ')) eventType = line.slice(7).trim()
          else if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (eventType === 'text') {
              let chunk = ''
              try { chunk = JSON.parse(data) } catch { chunk = data }
              fullText += chunk
              if (!isOnline) {
                // 오프라인: 스트리밍 버블 실시간 업데이트 (타이핑 효과)
                setMessages(prev => {
                  const last = prev[prev.length - 1]
                  if (last?.streaming) return [...prev.slice(0, -1), { ...last, content: last.content + chunk }]
                  return [...prev, { role: 'assistant', content: chunk, streaming: true }]
                })
              }
              // 온라인: fullText만 쌓고 화면엔 안 보여줌 (flash 방지)
            } else if (eventType === 'stream_done') {
              if (isOnline) {
                // 온라인: stream_done 후에 분리된 말풍선 순차 출력
                const parts = fullText.split('\n').filter(p => p.trim())
                for (const part of parts) {
                  setMessages(prev => [...prev, { role: 'assistant', content: part }])
                  await new Promise(r => setTimeout(r, Math.min(part.length * 250, 2500)))
                }
              } else {
                // 오프라인: 스트리밍 버블 확정
                setMessages(prev => {
                  const last = prev[prev.length - 1]
                  if (last?.streaming) return [...prev.slice(0, -1), { ...last, streaming: false }]
                  if (fullText.trim()) return [...prev, { role: 'assistant', content: fullText.trim() }]
                  return prev
                })
              }
            } else if (eventType === 'panel_start') {
              onPanelStart()
            } else if (eventType === 'panel') {
              try { pendingPanel = JSON.parse(data) } catch { }
            }
          }
        }
      }
      if (pendingPanel) onPanel(pendingPanel)
    } catch (e) {
      if (e.name === 'AbortError') {
        setIsTyping(false)
        return
      }
      throw e
    } finally {
      // stream_done 못 받은 경우 스트리밍 버블 강제 확정
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last?.streaming) return [...prev.slice(0, -1), { ...last, streaming: false }]
        return prev
      })
    }
  }

  const processQueue = async () => {
    if (processingRef.current) return
    processingRef.current = true
    setIsTyping(true)
    try {
      while (queueRef.current.length > 0) {
        const batch = []
        while (queueRef.current.length > 0) batch.push(queueRef.current.shift())
        const combinedText = batch.map(b => b.text).join('\n')
        const resolvedEmotion = batch[batch.length - 1]?.resolvedEmotion
        const rapidFollowup = batch.some(b => b.rapidFollowup)
        await callAPI(combinedText, resolvedEmotion, rapidFollowup)
      }
    } catch (e) {
      console.error('메시지 처리 오류:', e)
    } finally {
      processingRef.current = false
      setIsTyping(false)
    }
  }

  const sendMessage = (overrideText, resolvedEmotion) => {
    const text = (overrideText ?? input).trim()
    if (!text) return
    setInput('')
    setTimeout(() => setInput(''), 0)
    setMessages(prev => [...prev, { role: 'user', content: text }])
    // LLM이 이미 응답 중이면 즉시 큐에 넣고 rapid_followup 처리
    if (processingRef.current) {
      queueRef.current.push({ text, resolvedEmotion, rapidFollowup: true })
      return
    }
    // 아직 처리 안 했으면 debounce: 마지막 메시지 후 800ms 침묵 시 전송
    queueRef.current.push({ text, resolvedEmotion, rapidFollowup: false })
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null
      processQueue()
    }, 1200)
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }

  const handleProfileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const token = localStorage.getItem('token')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('session_id', sessionId)
    formData.append('token', token)
    setUploading(true)
    try {
      const res = await fetch(API + '/upload/profile', { method: 'POST', body: formData })
      if (!res.ok) { alert('업로드 실패'); return }
      const data = await res.json()
      setProfileImage(data.image_url)
      getDominantColor(API + data.image_url).then(color => {
        if (color) { setProfileBgColor(color); localStorage.setItem('profile_bg_color', color) }
      }).catch(() => {})
    } catch {
      alert('업로드 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleSaveEdit = async () => {
    const res = await fetch(API + '/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) })
    if (!res.ok) { alert('저장 실패'); return }
    const data = await res.json()
    setMessages([]); setEditMode(false)
    onReset(data.session_id, draft)
  }

  const s = makeStyles(theme)

  return (
    <div style={s.wrap}>
      <div style={s.sidebar}>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleProfileUpload} />
        <div
          style={{ ...s.avatarBtn, backgroundColor: profileBgColor || theme.accent, backgroundImage: profileImage ? `url(${API}${profileImage})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}
          onClick={() => {
            if (profileImage) { setProfileModal(true) }
            else if (editMode) { fileInputRef.current?.click() }
            else { setEditMode(true); setDraft({...persona}) }
          }}
          title={profileImage ? '클릭하여 이미지 관리' : editMode ? '클릭하여 프로필 사진 변경' : '클릭하여 정보 수정'}
        >
          {uploading ? <span style={{ fontSize: 12 }}>...</span> : !profileImage && persona.name[0]}
        </div>
        {editMode ? (
          <>
            <span style={s.sideLabel}>수정</span>
            {FIELDS.map(f => (<div key={f.key} style={s.fieldRow}><span style={s.fieldKey}>{f.label}</span><input type={f.type||'text'} value={draft[f.key]} onChange={e => setDraft(p => ({...p,[f.key]:f.type==='number'?Number(e.target.value):e.target.value}))} style={s.editInput}/></div>))}
            <div style={s.fieldRow}>
              <span style={s.fieldKey}>시나리오</span>
              <textarea value={draft.scenario||''} onChange={e => setDraft(p => ({...p, scenario: e.target.value}))} rows={3} style={{...s.editInput, resize:'vertical', fontFamily:'inherit'}}/>
            </div>
            <button onClick={handleSaveEdit} style={s.saveBtn}>저장</button>
            <button onClick={() => setEditMode(false)} style={s.cancelBtn}>취소</button>
          </>
        ) : (
          <>
            {FIELDS.map(f => (<div key={f.key} style={s.fieldRow}><span style={s.fieldKey}>{f.label}</span><span style={s.fieldVal}>{persona[f.key]}</span></div>))}
            <div style={s.fieldRow}><span style={s.fieldKey}>시나리오</span><span style={s.fieldVal}>{persona.scenario}</span></div>
          </>
        )}
        <div style={{marginTop:'auto',paddingTop:12}}>{themeSlot}</div>
      </div>

      {/* 프로필 이미지 모달 */}
      {profileModal && createPortal(
        <div style={s.modalOverlay} onClick={() => setProfileModal(false)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalPreview}>
              <img src={`${API}${profileImage}`} alt="프로필" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
            </div>
            <div style={s.modalBtns}>
              <button style={s.modalBtnChange} onClick={() => { setProfileModal(false); fileInputRef.current?.click() }}>이미지 변경</button>
              <button style={s.modalBtnRemove} onClick={() => { setProfileImage(null); setProfileBgColor(null); localStorage.removeItem('profile_bg_color'); setProfileModal(false) }}>이미지 제거</button>
              <button style={s.modalBtnClose} onClick={() => setProfileModal(false)}>닫기</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div style={s.chatColumn}>
        <div style={s.scenarioBar}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div><span style={s.scenarioLabel}>사용자 상황 설정</span><span style={s.scenarioValue}>입력한 상황: {persona.scenario}</span></div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              {emotion && cameraOn && <span style={s.emotionBadge}>{EMOTION_KR[emotion.label]||emotion.label} {Math.round(emotion.score*100)}%</span>}
              {cameraOn && <span style={{fontSize:11,color:'#4ade80',fontWeight:600}}>감정 감지 중</span>}
            </div>
          </div>
        </div>
        <div style={s.messages}>
          {messages.length===0&&<div style={s.watermark}>사용자 대화창</div>}
          <div style={s.messagesInner}>
            {messages.map((msg, msgIndex) => {
              if (msg.role === 'assistant') {
                const prevMsg = messages[msgIndex - 1]
                const showAvatar = !prevMsg || prevMsg.role !== 'assistant'
                if (!msg.content && !msg.typing) return null
                return (
                  <div key={msgIndex} style={{ ...s.msgRow, justifyContent: 'flex-start' }}>
                    {showAvatar
                      ? <div style={{ ...s.avatar, backgroundColor: profileBgColor || theme.accent, backgroundImage: profileImage ? `url(${API}${profileImage})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                          {!profileImage && persona.name[0]}
                        </div>
                      : <div style={{ width: 32, flexShrink: 0 }} />
                    }
                    <div style={s.bubbleAI}>
                      {msg.typing
                        ? <span style={s.typing}>···</span>
                        : <>{msg.content}{msg.streaming && <span style={s.cursor}>▌</span>}</>
                      }
                    </div>
                  </div>
                )
              }
              return <div key={msgIndex} style={{...s.msgRow,justifyContent:'flex-end'}}><div style={s.bubbleUser}>{msg.content}</div></div>
            })}
            <div ref={bottomRef}/>
          </div>
        </div>
        <div style={s.bottomArea}>
          {cameraOn&&<div style={s.cameraPreview}><video ref={videoRef} autoPlay muted playsInline style={s.video}/>{emotion&&<div style={s.emotionOverlay}>{EMOTION_KR[emotion.label]||emotion.label}</div>}</div>}
          <div style={s.inputBar}><div style={s.inputInner}>
            <button onClick={toggleCamera} disabled={!modelsLoaded} style={{...s.cameraBtn,background:cameraOn?'#ef4444':theme.bgPanel,color:cameraOn?'#fff':theme.textMain}} title={cameraOn?'카메라 끄기':'표정으로 감정 전달'}>
              {cameraOn ? '📷 끄기' : '📷'}
            </button>
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              style={{...s.cameraBtn, background: isRecording ? '#ef4444' : theme.bgPanel, color: isRecording ? '#fff' : theme.textMain}}
              title="누르고 있는 동안 녹음"
            >
              {isRecording ? '🎙️ 녹음 중' : '🎙️'}
            </button>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="메시지 입력..." style={s.input}/>
            <button onClick={() => sendMessage()} style={s.sendBtn}>전송</button>
          </div></div>
        </div>
      </div>
    </div>
  )
}

const makeStyles=(t)=>({
  wrap:{display:'flex',flexDirection:'row',height:'100%',width:'100%',overflow:'hidden'},
  sidebar:{width:200,flexShrink:0,background:t.bgBase,borderRight:'1px solid '+t.border,display:'flex',flexDirection:'column',gap:10,padding:'56px 16px 16px',overflowY:'auto'},
  avatarBtn:{width:56,height:56,borderRadius:'50%',backgroundColor:t.accent,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontWeight:700,color:'#fff',cursor:'pointer',alignSelf:'center',marginBottom:16,flexShrink:0},
  sideLabel:{fontSize:12,color:t.textMuted,fontWeight:600},
  fieldRow:{display:'flex',flexDirection:'column',gap:2},fieldKey:{fontSize:11,color:t.textMuted},fieldVal:{fontSize:14,color:t.textMain,wordBreak:'break-all'},
  editInput:{padding:'3px 6px',borderRadius:4,border:'1px solid '+t.border,background:t.bgInput,color:t.textMain,fontSize:13,outline:'none',width:'100%'},
  saveBtn:{padding:'6px 0',borderRadius:6,background:t.primary,color:'#fff',border:'none',cursor:'pointer',fontSize:12,fontWeight:600},
  cancelBtn:{padding:'6px 0',borderRadius:6,background:t.bgPanel,color:t.textMuted,border:'none',cursor:'pointer',fontSize:12},
  chatColumn:{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'},
  scenarioBar:{padding:'8px 16px',background:t.bgPanel,flexShrink:0,borderBottom:'1px solid '+t.border},
  scenarioLabel:{fontSize:11,color:t.textMuted,fontWeight:600,display:'block'},scenarioValue:{fontSize:12,color:t.textMuted,display:'block'},
  emotionBadge:{padding:'2px 10px',borderRadius:12,background:t.accent,color:'#fff',fontSize:12,fontWeight:600},
  messages:{flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',alignItems:'center',position:'relative'},
  watermark:{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',fontSize:22,color:t.border,fontWeight:700,pointerEvents:'none'},
  messagesInner:{width:'100%',maxWidth:520,display:'flex',flexDirection:'column',gap:10},
  msgRow:{display:'flex',alignItems:'flex-end',gap:8},
  avatar:{width:32,height:32,borderRadius:'50%',backgroundColor:t.accent,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,flexShrink:0,color:'#fff'},
  bubbleUser:{maxWidth:'70%',padding:'10px 14px',borderRadius:'18px 18px 4px 18px',background:t.bgBubbleUser||t.primary,color:t.textBubbleUser||'#fff',fontSize:14,lineHeight:1.5},
  bubbleAI:{maxWidth:'70%',padding:'10px 14px',borderRadius:'18px 18px 18px 4px',background:lighten(t.bgPanel),color:t.textMain,fontSize:14,lineHeight:1.5},
  typing:{fontSize:18,letterSpacing:3,color:t.textMuted},
  cursor:{animation:'blink 0.8s step-end infinite',marginLeft:2,color:t.textMuted},
  bottomArea:{flexShrink:0,borderTop:'1px solid '+t.border,background:t.bgBase},
  cameraPreview:{display:'flex',justifyContent:'center',alignItems:'center',padding:'8px 16px',gap:8,position:'relative'},
  video:{width:200,height:150,borderRadius:12,objectFit:'cover',border:'2px solid '+t.accent,transform:'scaleX(-1)'},
  emotionOverlay:{position:'absolute',bottom:14,left:'50%',transform:'translateX(-50%)',padding:'2px 12px',borderRadius:8,background:'rgba(0,0,0,0.7)',color:'#fff',fontSize:13,fontWeight:600},
  inputBar:{display:'flex',justifyContent:'center',padding:'12px 16px'},
  inputInner:{display:'flex',gap:8,width:'100%'},
  cameraBtn:{padding:'10px 14px',borderRadius:20,border:'none',cursor:'pointer',fontSize:13,fontWeight:600,whiteSpace:'nowrap',transition:'all 0.2s'},
  input:{flex:1,padding:'10px 14px',borderRadius:20,border:'1px solid '+t.border,background:t.bgInput,color:t.textMain,fontSize:14,outline:'none'},
  sendBtn:{padding:'10px 20px',borderRadius:20,background:t.primary,color:'#fff',border:'none',cursor:'pointer',fontSize:14,fontWeight:600},
  modalOverlay:{position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center'},
  modalBox:{background:t.bgPanel,border:'1px solid '+t.border,borderRadius:16,padding:24,display:'flex',flexDirection:'column',alignItems:'center',gap:16,minWidth:240},
  modalPreview:{width:160,height:160,borderRadius:12,overflow:'hidden',border:'1px solid '+t.border},
  modalBtns:{display:'flex',flexDirection:'column',gap:8,width:'100%'},
  modalBtnChange:{width:'100%',padding:'10px 0',borderRadius:8,border:'none',background:t.primary,color:'#fff',fontWeight:700,fontSize:14,cursor:'pointer'},
  modalBtnRemove:{width:'100%',padding:'10px 0',borderRadius:8,border:'1px solid rgba(220,60,60,0.5)',background:'transparent',color:'#ff6666',fontWeight:700,fontSize:14,cursor:'pointer'},
  modalBtnClose:{width:'100%',padding:'10px 0',borderRadius:8,border:'1px solid '+t.border,background:'transparent',color:t.textMuted,fontWeight:600,fontSize:14,cursor:'pointer'},
})
