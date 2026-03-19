const API = 'http://localhost:8000'

const fields = [
  { key: 'name',        label: '이름',    type: 'text',   default: '지수' },
  { key: 'age',         label: '나이',    type: 'number', default: '24' },
  { key: 'gender',      label: '성별',    type: 'text',   default: '여성' },
  { key: 'nationality', label: '국적',    type: 'text',   default: '한국' },
  { key: 'job',         label: '직업',    type: 'text',   default: '대학원생' },
  { key: 'personality', label: '성격',    type: 'text',   default: '쿨하고 감정 표현이 적음' },
  { key: 'speech_style',label: '말투',    type: 'text',   default: '짧고 직설적인 반말' },
]

export default function SetupForm({ onStart, theme }) {
  const handleSubmit = async (e) => {
    e.preventDefault()
    const form = Object.fromEntries(new FormData(e.target))
    form.age = Number(form.age)

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
  }

  const s = makeStyles(theme)

  return (
    <div style={s.wrap}>
      <h2 style={s.title}>캐릭터 설정</h2>
      <form onSubmit={handleSubmit} style={s.form}>
        {fields.map(f => (
          <div key={f.key} style={s.row}>
            <label style={s.label}>{f.label}</label>
            <input
              name={f.key}
              type={f.type}
              placeholder={f.placeholder || ''}
              defaultValue={f.default || ''}
              required
              style={s.input}
            />
          </div>
        ))}
        <div style={s.row}>
          <label style={s.label}>시나리오</label>
          <textarea
            name="scenario"
            required
            rows={3}
            defaultValue="카페에서 만나 대화 중인 상황"
            placeholder="오늘의 만남 상황을 입력하세요"
            style={{ ...s.input, resize: 'vertical' }}
          />
        </div>
        <button type="submit" style={s.btn}>시작</button>
      </form>
    </div>
  )
}

const makeStyles = (t) => ({
  wrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '100vh', gap: 24,
    background: t.bgBase,
  },
  title: { fontSize: 22, fontWeight: 600, color: t.textMain },
  form: { display: 'flex', flexDirection: 'column', gap: 12, width: 400 },
  row: { display: 'flex', alignItems: 'flex-start', gap: 12 },
  label: { width: 60, paddingTop: 8, fontSize: 14, color: t.textMuted, flexShrink: 0 },
  input: {
    flex: 1, padding: '8px 12px', borderRadius: 8,
    border: `1px solid ${t.border}`, background: t.bgInput,
    color: t.textMain, fontSize: 14, outline: 'none',
  },
  btn: {
    marginTop: 8, padding: '10px 0', borderRadius: 8,
    background: t.primary, color: '#fff', fontSize: 15,
    border: 'none', cursor: 'pointer', fontWeight: 600,
  },
})
