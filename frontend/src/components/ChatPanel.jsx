import { useState, useRef, useEffect, useCallback } from 'react'
import * as faceapi from 'face-api.js'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const VOICE_API = import.meta.env.VITE_VOICE_API_URL || 'http://localhost:8001'

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

export default function ChatPanel({ sessionId, persona, onPanelStart, onPanel, onReset, theme, themeSlot }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState(persona)
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

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, isTyping])

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

  useEffect(() => { return () => { stopCamera() } }, [])

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

  const callAPI = async (text, resolvedEmotion) => {
    let fullText = ''
    let pendingPanelStart = false
    let pendingPanel = null
    const isOnline = persona.chat_type === 'online'
    try {
      const body = { session_id: sessionId, message: text }
      if (resolvedEmotion) body.voice_emotion = resolvedEmotion
      if (emotion && cameraOn) body.camera_emotion = emotion
      const res = await fetch(API + '/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
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
                  await new Promise(r => setTimeout(r, Math.min(part.length * 200, 2000)))
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
              pendingPanelStart = true
            } else if (eventType === 'panel') {
              try { pendingPanel = JSON.parse(data) } catch { }
            }
          }
        }
      }
      if (pendingPanelStart) onPanelStart()
      if (pendingPanel) onPanel(pendingPanel)
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
    while (queueRef.current.length > 0) {
      const { text, resolvedEmotion } = queueRef.current.shift()
      await callAPI(text, resolvedEmotion)
    }
    processingRef.current = false
    setIsTyping(false)
  }

  const sendMessage = (overrideText, resolvedEmotion) => {
    const text = (overrideText ?? input).trim()
    if (!text) return
    setInput('')
    setTimeout(() => setInput(''), 0)
    setMessages(prev => [...prev, { role: 'user', content: text }])
    queueRef.current.push({ text, resolvedEmotion })
    processQueue()
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }

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
        <div style={s.avatarBtn} onClick={() => { setEditMode(v => !v); setDraft({...persona}) }}>{persona.name[0]}</div>
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
                      ? <div style={s.avatar}>{persona.name[0]}</div>
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
  avatarBtn:{width:56,height:56,borderRadius:'50%',background:t.accent,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontWeight:700,color:'#fff',cursor:'pointer',alignSelf:'center',marginBottom:16,flexShrink:0},
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
  avatar:{width:32,height:32,borderRadius:'50%',background:t.accent,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,flexShrink:0,color:'#fff'},
  bubbleUser:{maxWidth:'70%',padding:'10px 14px',borderRadius:'18px 18px 4px 18px',background:'#fee500',color:'#000',fontSize:14,lineHeight:1.5},
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
})
