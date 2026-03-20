import { useState, useRef, useEffect, useCallback } from 'react'
import * as faceapi from 'face-api.js'

const API = 'http://localhost:8000'

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
  const [meetMode, setMeetMode] = useState(persona.chat_type === 'offline')
  const bottomRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const detectIntervalRef = useRef(null)

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

  useEffect(() => {
    if (persona.chat_type === 'offline' && modelsLoaded && !cameraOn) {
      startCamera()
    }
  }, [modelsLoaded])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } })
      streamRef.current = stream
      setCameraOn(true)
      setMeetMode(true)
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
    setMeetMode(false)
  }

  const toggleCamera = useCallback(() => { cameraOn ? stopCamera() : startCamera() }, [cameraOn])

  useEffect(() => { return () => { stopCamera() } }, [])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || isTyping) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setIsTyping(true)
    let aiText = '', currentLine = ''
    try {
      const body = { session_id: sessionId, message: text }
      if (emotion && cameraOn) body.emotion = emotion
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
              try { const chunk = JSON.parse(data); aiText += chunk; currentLine += chunk } catch { aiText += data; currentLine += data }
              if (persona.chat_type === 'online' && currentLine.includes('\n')) {
                const parts = currentLine.split('\n'); currentLine = parts.pop()
                for (const part of parts) { if (!part.trim()) continue; setMessages(prev => [...prev, { role: 'assistant', content: part, typing: false }]); await new Promise(r => setTimeout(r, 200)) }
              }
            } else if (eventType === 'panel_start') onPanelStart()
            else if (eventType === 'panel') { try { onPanel(JSON.parse(data)) } catch {} }
          }
        }
      }
      if (currentLine.trim()) setMessages(prev => [...prev, { role: 'assistant', content: currentLine.trim(), typing: false }])
    } finally { setIsTyping(false) }
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }

  const handleSaveEdit = async () => {
    const res = await fetch(API + '/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...draft, scenario: persona.scenario }) })
    if (!res.ok) { alert('저장 실패'); return }
    const data = await res.json()
    setMessages([]); setEditMode(false)
    onReset(data.session_id, { ...draft, scenario: persona.scenario })
  }

  const s = makeStyles(theme)

  return (
    <div style={s.wrap}>
      <div style={s.sidebar}>
        <div style={s.avatarBtn} onClick={() => { setEditMode(v => !v); setDraft(persona) }}>{persona.name[0]}</div>
        {editMode ? (
          <>
            <span style={s.sideLabel}>수정</span>
            {FIELDS.map(f => (<div key={f.key} style={s.fieldRow}><span style={s.fieldKey}>{f.label}</span><input type={f.type||'text'} value={draft[f.key]} onChange={e => setDraft(p => ({...p,[f.key]:f.type==='number'?Number(e.target.value):e.target.value}))} style={s.editInput}/></div>))}
            <button onClick={handleSaveEdit} style={s.saveBtn}>저장</button>
            <button onClick={() => setEditMode(false)} style={s.cancelBtn}>취소</button>
          </>
        ) : FIELDS.map(f => (<div key={f.key} style={s.fieldRow}><span style={s.fieldKey}>{f.label}</span><span style={s.fieldVal}>{persona[f.key]}</span></div>))}
        <div style={{marginTop:'auto',paddingTop:12}}>{themeSlot}</div>
      </div>
      <div style={s.chatColumn}>
        <div style={s.scenarioBar}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div><span style={s.scenarioLabel}>사용자 상황 설정</span><span style={s.scenarioValue}>입력한 상황: {persona.scenario}</span></div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              {meetMode && emotion && <span style={s.emotionBadge}>{EMOTION_KR[emotion.label]||emotion.label} {Math.round(emotion.score*100)}%</span>}
              <span style={{fontSize:11,color:meetMode?'#4ade80':theme.textMuted,fontWeight:600}}>{meetMode?'직접 만남 모드':'메신저 모드'}</span>
            </div>
          </div>
        </div>
        <div style={s.messages}>
          {messages.length===0&&<div style={s.watermark}>사용자 대화창</div>}
          <div style={s.messagesInner}>
            {messages.map((msg,i) => {
              if (msg.role==='assistant') {
                const lines = (persona.chat_type==='online'&&msg.content)?msg.content.split('\n').filter(l=>l.trim()):[msg.content||'']
                return lines.map((line,j)=>(<div key={i+'-'+j} style={{...s.msgRow,justifyContent:'flex-start'}}>{j===0&&<div style={s.avatar}>{persona.name[0]}</div>}{j>0&&<div style={{width:32,flexShrink:0}}/>}<div style={s.bubbleAI}>{msg.typing?<span style={s.typing}>...</span>:msg.content}</div></div>))
              }
              return <div key={i} style={{...s.msgRow,justifyContent:'flex-end'}}><div style={s.bubbleUser}>{msg.content}</div></div>
            })}
            <div ref={bottomRef}/>
          </div>
        </div>
        <div style={s.bottomArea}>
          {cameraOn&&<div style={s.cameraPreview}><video ref={videoRef} autoPlay muted playsInline style={s.video}/>{emotion&&<div style={s.emotionOverlay}>{EMOTION_KR[emotion.label]||emotion.label}</div>}</div>}
          <div style={s.inputBar}><div style={s.inputInner}>
            <button onClick={toggleCamera} disabled={!modelsLoaded} style={{...s.cameraBtn,background:cameraOn?'#ef4444':theme.bgPanel,color:cameraOn?'#fff':theme.textMain}} title={cameraOn?'카메라 끄기':'카메라 켜기'}>{cameraOn?'끄기':'만나서 대화'}</button>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={meetMode?'만나서 대화 중...':'메시지 입력...'} style={s.input}/>
            <button onClick={sendMessage} disabled={isTyping} style={s.sendBtn}>전송</button>
          </div></div>
        </div>
      </div>
    </div>
  )
}

const makeStyles=(t)=>({
  wrap:{display:'flex',flexDirection:'row',height:'100%',width:'100%',overflow:'hidden'},
  sidebar:{width:160,flexShrink:0,background:t.bgBase,borderRight:'1px solid '+t.border,display:'flex',flexDirection:'column',gap:10,padding:'16px 12px',overflowY:'auto'},
  avatarBtn:{width:56,height:56,borderRadius:'50%',background:t.accent,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontWeight:700,color:'#fff',cursor:'pointer',alignSelf:'center',marginBottom:6,flexShrink:0},
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
