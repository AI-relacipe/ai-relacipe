import { useState } from 'react'

import { API } from '../utils/api'

// 사용자 초기 정보
const userFields = [
  { key: 'user_name', label: '내 이름', type: 'text', default: '김남성' },
  { key: 'user_gender', label: '내 성별', type: 'text', default: '남성' },
  { key: 'user_age', label: '내 나이', type: 'text', default: '25' },
  { key: 'user_job', label: '내 직업', type: 'text', default: '무직' },
]

// 연인 역할 초기 정보
const fields = [
  { key: 'name', label: '이름', type: 'text', default: '이지수' },
  { key: 'age', label: '나이', type: 'text', default: '24' },
  { key: 'gender', label: '성별', type: 'text', default: '여성' },
  { key: 'nationality', label: '국적', type: 'text', default: '한국' },
  { key: 'job', label: '직업', type: 'text', default: '대학원생' },
  { key: 'personality', label: '성격', type: 'text', default: '밝고 활발한 성격' },
  { key: 'speech_style', label: '말투', type: 'text', default: '반말을 하되 친구같은 연인 말투' },
]

export default function SetupForm({ onStart, theme }) {
  const [chatType, setChatType] = useState('online')
  const [step, setStep] = useState(1)
  const [visible, setVisible] = useState(true)
  const [myInfo, setMyInfo] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const goNext = (e) => {
    e.preventDefault()
    setMyInfo(Object.fromEntries(new FormData(e.target)))
    setVisible(false)
    setTimeout(() => {
      setStep(2)
      setVisible(true)
    }, 300)
  }

  const goBack = () => {
    setVisible(false)
    setTimeout(() => {
      setStep(1)
      setVisible(true)
    }, 300)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    const merged = { ...myInfo, ...Object.fromEntries(new FormData(e.target)), chat_type: chatType }
    merged.age = Number(merged.age)
    // 로그인 토큰 포함
    const token = localStorage.getItem('token')
    if (token) merged.token = token
    const form = merged

    if (form.age < 20 || form.age > 60) {
      alert("나이는 20세에서 60세 사이어야 합니다.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`${API}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.detail)
        return
      }
      const data = await res.json()
      onStart(data.session_id, form)
    } catch (err) {
      alert('서버 연결 실패! 백엔드가 켜져있는지 확인하세요.')
    } finally {
      setSubmitting(false)
    }
  }

  const s = makeStyles(theme)

  return (
    <div style={{
      transition: 'opacity 0.4s ease, transform 0.4s ease',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(20px)',
    }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center', padding: '16px 0', zIndex: 10 }}>
        <img src="/relacipe_logo.svg" alt="Relacipe" style={{ height: 230, width: 'auto', transform: 'translateX(-60px)' }} />
      </div>
      {step === 1 && (
        <div style={s.wrap}>
          <h2 style={s.title}>내 정보</h2>
          <form onSubmit={goNext} style={s.form}>
            {userFields.map(f => (
              <div key={f.key} style={s.row}>
                <label style={s.label}>{f.label}</label>
                <input name={f.key} type={f.type} defaultValue={f.default} required style={s.input} />
              </div>
            ))}
            <button type="submit" style={s.btn}>다음</button>
          </form>
        </div>
      )}
      {step === 2 && (
        <div style={s.wrap}>
          <h2 style={s.title}>캐릭터 설정</h2>
          <form onSubmit={handleSubmit} style={s.form}>
            {fields.map(f => (
              <div key={f.key} style={s.row}>
                <label style={s.label}>{f.label}</label>
                <input name={f.key} type={f.type} defaultValue={f.default} required style={s.input} />
              </div>
            ))}
            <div style={s.row}>
              <label style={s.label}>시나리오</label>
              <textarea name="scenario" required rows={3} defaultValue="퇴근 후, 각자 집에서 카카오톡으로 연락하는 상황" style={{ ...s.input, resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
            <div style={s.row}>
              <label style={s.label}>대화방식</label>
              <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                <button type="button" onClick={() => setChatType('online')}
                  style={{ ...s.modeBtn, background: chatType === 'online' ? theme.primary : '#333' }}>메신저</button>
                <button type="button" onClick={() => setChatType('offline')}
                  style={{ ...s.modeBtn, background: chatType === 'offline' ? theme.primary : '#333' }}>직접 만남</button>
              </div>
            </div>

            <button type="button" onClick={goBack} style={{ ...s.btn, background: '#333' }}>이전</button>
            <button type="submit" disabled={submitting} style={{ ...s.btn, opacity: submitting ? 0.6 : 1 }}>{submitting ? '생성 중...' : '시작'}</button>
          </form>
        </div>
      )}
    </div>
  )
}

const makeStyles = (t) => ({
  wrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 24, background: t.bgBase },
  title: { fontSize: 22, fontWeight: 600, color: t.textMain },
  form: { display: 'flex', flexDirection: 'column', gap: 12, width: 400 },
  row: { display: 'flex', alignItems: 'flex-start', gap: 12 },
  label: { width: 60, paddingTop: 8, fontSize: 14, color: t.textMuted, flexShrink: 0 },
  input: { flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${t.border}`, background: t.bgInput, color: t.textMain, fontSize: 14, outline: 'none' },
  modeBtn: { flex: 1, padding: '10px 0', borderRadius: 8, color: '#fff', fontSize: 14, border: 'none', cursor: 'pointer', fontWeight: 600 },
  btn: { marginTop: 8, padding: '10px 0', borderRadius: 8, background: t.primary, color: '#fff', fontSize: 15, border: 'none', cursor: 'pointer', fontWeight: 600 },
})
