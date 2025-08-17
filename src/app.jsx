import React from 'react'
import { jsPDF } from 'jspdf'
import { createWorker } from 'tesseract.js'
import './index.css'

/* ---------------------- Chat bubble (simple, clean) ---------------------- */
function ChatBubble({ message, isUser }) {
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, maxWidth: '70%', flexDirection: isUser ? 'row-reverse' : 'row' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          backgroundColor: isUser ? '#003087' : '#00A9CE',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0
        }}>
          {isUser ? '👤' : '🤖'}
        </div>
        <div style={{
          padding: '12px 16px', borderRadius: 16,
          backgroundColor: isUser ? '#003087' : 'white',
          color: isUser ? 'white' : '#333',
          border: isUser ? 'none' : '1px solid #e5e7eb',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)', wordWrap: 'break-word'
        }}>
          {message}
        </div>
      </div>
    </div>
  )
}

/* ------------------ Robust speech synthesis helper (TTS) ------------------ */
function speakText(text, opts = { lang: 'en-GB', rate: 0.95, pitch: 1, preferLocalEnglish: true }) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const u = new SpeechSynthesisUtterance(text)
  u.lang = opts.lang; u.rate = opts.rate; u.pitch = opts.pitch
  const startSpeak = () => {
    const voices = window.speechSynthesis.getVoices()
    if (opts.preferLocalEnglish && voices.length) {
      const pick = voices.find(v => v.lang?.startsWith('en') && (v.localService || v.default)) || voices[0]
      if (pick) u.voice = pick
    }
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  }
  if (window.speechSynthesis.getVoices().length === 0) {
    const once = () => { window.speechSynthesis.removeEventListener('voiceschanged', once); startSpeak() }
    window.speechSynthesis.addEventListener('voiceschanged', once, { once: true })
    window.speechSynthesis.getVoices()
  } else {
    startSpeak()
  }
}

/* ---------------- Speech recognition hook (continuous, interim) ----------- */
function useVoiceRecognition({ onResult, onError }) {
  const recRef = React.useRef(null)
  const [isSupported, setIsSupported] = React.useState(true)
  const [isListening, setIsListening] = React.useState(false)
  const shouldBeListening = React.useRef(false)

  React.useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setIsSupported(false); return }
    const rec = new SR()
    rec.lang = 'en-GB'
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        const text = res[0]?.transcript?.trim() || ''
        if (text) onResult?.(text, res.isFinal)
      }
    }
    rec.onerror = (ev) => { onError?.(ev.error || 'speech-error'); stop() }
    rec.onend = () => {
      setIsListening(false)
      if (shouldBeListening.current) {
        // some UAs need a tick before start
        setTimeout(() => {
          try { rec.start(); setIsListening(true) } catch {}
        }, 150)
      }
    }
    recRef.current = rec
    return () => { try { rec.stop() } catch {} }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const start = () => {
    const rec = recRef.current
    if (!rec || isListening) return
    try { rec.start(); shouldBeListening.current = true; setIsListening(true) } catch { onError?.('failed-to-start') }
  }
  const stop = () => {
    const rec = recRef.current
    shouldBeListening.current = false
    if (!rec) return
    try { rec.stop() } catch {}
    setIsListening(false)
  }

  return { isSupported, isListening, start, stop }
}

/* -------------------------- Questionnaire helpers ------------------------- */
// Expected questionnaire.json shape:
// { version, sections: [{ id, title, icon?, questions: [{ id, type, prompt, options?, expectedOptions?, clarification? }] }] }
async function loadQuestionnaire() {
  const res = await fetch('/questionnaire.json')
  if (!res.ok) throw new Error('Missing questionnaire.json')
  return res.json()
}
function flattenQuestions(q) {
  return q.sections.flatMap(section =>
    section.questions.map(qn => ({ ...qn, sectionTitle: section.title, sectionIcon: section.icon }))
  )
}
function findUnansweredIds(q, answers) {
  const pending = []
  for (const section of q.sections) {
    for (const qn of section.questions) {
      if (answers[qn.id] === undefined || answers[qn.id] === '') pending.push(qn.id)
    }
  }
  return pending
}

/* ---------------------- Medication parsing helpers ------------------------ */
const FREQ_MAP = [
  [/^(od|o\.?d\.?|once daily|daily)\b/i, 'OD (once daily)'],
  [/^(bd|b\.?d\.?|twice daily)\b/i, 'BD (twice daily)'],
  [/^(tds|t\.?d\.?s\.?|three times daily)\b/i, 'TDS (three times daily)'],
  [/^(qds|qid|four times daily)\b/i, 'QDS (four times daily)'],
  [/\b(prn)\b/i, 'PRN (as needed)'],
  [/\bmane\b/i, 'mane (morning)'],
  [/\bnocte\b/i, 'nocte (night)'],
  [/\bevery\s?(\d+)\s?(h|hours?)\b/i, (m) => `q${m[1]}h (every ${m[1]} hours)`],
]
const ROUTE_MAP = [
  [/^(po|p\.?o\.?|oral)\b/i, 'Oral (PO)'],
  [/^(iv|i\.?v\.?)\b/i, 'IV'],
  [/^(im|i\.?m\.?)\b/i, 'IM'],
  [/^(sc|s\.?c\.?|subcut(?:aneous)?)\b/i, 'Subcut (SC)'],
  [/^(sl|s\.?l\.?)\b/i, 'Sublingual (SL)'],
  [/^(pr)\b/i, 'Per rectum (PR)'],
  [/^(pv)\b/i, 'Per vagina (PV)'],
  [/\b(inhal(?:e|ed|er)?|neb(?:ulise|ulizer|uliser)?)\b/i, 'Inhaled'],
  [/\b(top(?:ical)?|cream|ointment|patch|nasal|eye|ear|skin)\b/i, 'Topical'],
]
function normMatch(txt, table) {
  for (const [rx, v] of table) {
    const m = txt.match(rx)
    if (m) return typeof v === 'function' ? v(m) : v
  }
  return null
}
const STRENGTH_RX = /(\d+(?:\.\d+)?)\s*(mcg|microg(?:ram)?s?|mg|g|ml|units?|iu)\b/i
const DOSE_RX = /(\d+(?:\.\d+)?)\s*(tablets?|caps(?:ules)?|puffs?|sprays?|drops?|units?)\b/i
function parseMedLine(line) {
  const raw = line.replace(/\s+/g, ' ').trim()
  if (!raw) return null
  let drug = '', strength = '', dose = '', route = '', frequency = '', notes = ''
  const sM = raw.match(STRENGTH_RX); if (sM) strength = `${sM[1]} ${sM[2].toUpperCase()}`
  const dM = raw.match(DOSE_RX); if (dM) dose = `${dM[1]} ${dM[2].toLowerCase()}`
  const tokens = raw.split(/\s+/)
  for (const t of tokens) {
    if (!route) { const r = normMatch(t, ROUTE_MAP); if (r) route = r }
    if (!frequency) { const f = normMatch(t, FREQ_MAP); if (f) frequency = f }
  }
  if (sM) { drug = raw.slice(0, sM.index).trim() } else { drug = tokens.slice(0, Math.min(4, tokens.length)).join(' ') }
  drug = drug.replace(/[,\-–]+$/, '').trim()
  const parsedEnough = drug || strength || dose || route || frequency
  if (!parsedEnough) { notes = raw }
  return { drug, strength, dose, route, frequency, notes }
}
function parseMedsText(rawText) {
  const rows = []
  rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean).forEach(line => {
    const r = parseMedLine(line); if (r) rows.push(r)
  })
  return rows
}

/* ------------------------- Meds table & modal UI -------------------------- */
function MedsTable({ rows, setRows }) {
  const update = (idx, key, val) => { const copy = rows.slice(); copy[idx] = { ...copy[idx], [key]: val }; setRows(copy) }
  const delRow = (idx) => setRows(rows.filter((_,i)=>i!==idx))
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflowX: 'auto', background: 'white' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead>
          <tr style={{ background:'#F3F4F6' }}>
            {['Drug','Strength','Dose','Route','Frequency','Notes',''].map(h=>(
              <th key={h} style={{ textAlign:'left', fontWeight:600, fontSize:12, padding:'10px 8px', color:'#374151' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx}>
              {['drug','strength','dose','route','frequency','notes'].map(k=>(
                <td key={k} style={{ padding:'6px 8px' }}>
                  <input value={r[k] || ''} onChange={e=>update(idx, k, e.target.value)}
                         style={{ width:'100%', border:'1px solid #d1d5db', borderRadius:6, padding:'6px 8px', fontSize:13 }}/>
                </td>
              ))}
              <td style={{ padding:'6px 8px' }}>
                <button type="button" onClick={()=>delRow(idx)} style={{ border:'none', background:'#fee2e2', color:'#b91c1c', padding:'6px 10px', borderRadius:6 }}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
const ROUTE_OPTIONS = ['Oral (PO)','IV','IM','Subcut (SC)','Sublingual (SL)','Per rectum (PR)','Per vagina (PV)','Inhaled','Topical']
const FREQ_OPTIONS  = ['OD (once daily)','BD (twice daily)','TDS (three times daily)','QDS (four times daily)','PRN (as needed)','mane (morning)','nocte (night)']

function Modal({ title, children, onClose }) {
  const ref = React.useRef(null)
  React.useEffect(() => {
    const prev = document.activeElement
    ref.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.() }
  }, [onClose])
  return (
    <div role="dialog" aria-modal="true" aria-label={title}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', display:'grid', placeItems:'center', zIndex:50 }}
      onClick={(e)=>{ if (e.target === e.currentTarget) onClose?.() }}>
      <div style={{ background:'#fff', borderRadius:12, width:'min(640px, 92vw)', boxShadow:'0 20px 40px rgba(0,0,0,.2)' }}>
        <div style={{ padding:'14px 16px', borderBottom:'1px solid #e5e7eb', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <strong>{title}</strong>
          <button onClick={onClose} style={{ border:'none', background:'transparent', fontSize:18, cursor:'pointer' }} aria-label="Close">×</button>
        </div>
        <div ref={ref} tabIndex={-1} style={{ padding:16 }}>{children}</div>
      </div>
    </div>
  )
}
function AddMedicineModal({ onAdd, onClose }) {
  const [drug, setDrug] = React.useState('')
  const [strength, setStrength] = React.useState('')
  const [dose, setDose] = React.useState('')
  const [route, setRoute] = React.useState(ROUTE_OPTIONS[0])
  const [freq, setFreq] = React.useState(FREQ_OPTIONS[0])
  const [notes, setNotes] = React.useState('')
  const submit = (e) => {
    e.preventDefault()
    onAdd({ drug, strength, dose, route, frequency: freq, notes })
    onClose()
  }
  return (
    <Modal title="Add a medicine" onClose={onClose}>
      <form onSubmit={submit} style={{ display:'grid', gap:10 }}>
        <label><div style={{ fontSize:12, color:'#374151' }}>Drug</div>
          <input value={drug} onChange={e=>setDrug(e.target.value)} autoFocus
                 style={{ width:'100%', border:'1px solid #d1d5db', borderRadius:8, padding:'8px 10px' }} required /></label>
        <label><div style={{ fontSize:12, color:'#374151' }}>Strength (e.g., 5 mg, 100 mcg)</div>
          <input value={strength} onChange={e=>setStrength(e.target.value)}
                 style={{ width:'100%', border:'1px solid #d1d5db', borderRadius:8, padding:'8px 10px' }} /></label>
        <label><div style={{ fontSize:12, color:'#374151' }}>Dose (e.g., 1 tablet, 2 puffs)</div>
          <input value={dose} onChange={e=>setDose(e.target.value)}
                 style={{ width:'100%', border:'1px solid #d1d5db', borderRadius:8, padding:'8px 10px' }} /></label>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <label><div style={{ fontSize:12, color:'#374151' }}>Route</div>
            <select value={route} onChange={e=>setRoute(e.target.value)}
                    style={{ width:'100%', border:'1px solid #d1d5db', borderRadius:8, padding:'8px 10px' }}>
              {ROUTE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select></label>
          <label><div style={{ fontSize:12, color:'#374151' }}>Frequency</div>
            <select value={freq} onChange={e=>setFreq(e.target.value)}
                    style={{ width:'100%', border:'1px solid #d1d5db', borderRadius:8, padding:'8px 10px' }}>
              {FREQ_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select></label>
        </div>
        <label><div style={{ fontSize:12, color:'#374151' }}>Notes</div>
          <input value={notes} onChange={e=>setNotes(e.target.value)}
                 style={{ width:'100%', border:'1px solid #d1d5db', borderRadius:8, padding:'8px 10px' }} /></label>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:4 }}>
          <button type="button" onClick={onClose} style={{ border:'1px solid #d1d5db', background:'#fff', borderRadius:8, padding:'8px 12px' }}>Cancel</button>
          <button type="submit" style={{ border:'none', background:'#003087', color:'#fff', borderRadius:8, padding:'8px 12px' }}>Add</button>
        </div>
      </form>
    </Modal>
  )
}

/* ------------------------------ OCR Uploader ------------------------------- */
function OCRUpload({ label, onText, multiple = false }) {
  const [busy, setBusy] = React.useState(false)
  const [progress, setProgress] = React.useState(0)

  async function stripAndDownscale(file) {
    const img = new Image()
    const url = URL.createObjectURL(file)
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url })
    const maxW = 2000, maxH = 2000
    let { width:w, height:h } = img
    const scale = Math.min(1, maxW / w, maxH / h)
    const cw = Math.round(w * scale), ch = Math.round(h * scale)
    const canvas = document.createElement('canvas')
    canvas.width = cw; canvas.height = ch
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, cw, ch)
    URL.revokeObjectURL(url)
    return await new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/jpeg', 0.92))
  }

  async function runOCR(files) {
    setBusy(true); setProgress(0)
    try {
      const worker = await createWorker({
        logger: m => { if (m && typeof m.progress === 'number') setProgress(Math.round(m.progress * 100)) }
      })
      await worker.loadLanguage('eng')
      await worker.initialize('eng')
      let combined = ''
      for (const f of files) {
        const prepped = await stripAndDownscale(f) || f
        const { data } = await worker.recognize(prepped)
        combined += (combined ? '\n\n' : '') + (data?.text || '')
      }
      await worker.terminate()
      onText(combined.trim())
    } catch (e) {
      onText('')
      alert('OCR failed. Please try a clearer photo.')
    } finally {
      setBusy(false); setProgress(0)
    }
  }

  function onPick(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    runOCR(files)
  }

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: 'white' }}>
      <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>{label}</label>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        multiple={multiple}
        onChange={onPick}
        style={{ display: 'block', marginBottom: 8 }}
        title="Take a photo or choose an image from your device"
      />
      {busy && <div style={{ fontSize: 12, color: '#6b7280' }}>OCR… {progress}% (keep this tab in front)</div>}
      <div style={{ fontSize: 12, color: '#6b7280' }}>Tip: good light, page flat, fill the frame.</div>
    </div>
  )
}

/* ------------------------------ Main interface ---------------------------- */
function ChatInterface() {
  const [questionnaire, setQuestionnaire] = React.useState(null)
  const [allQuestions, setAllQuestions] = React.useState([])
  const [messages, setMessages] = React.useState([
    { text: "Hi I'm Pepper and I'd like to help complete your preoperative assessment!", isUser: false },
    { text: "I'll guide you through questions about your health. You can type your answers or use the microphone to speak them. If you want to change a previous answer, just say 'go back'.", isUser: false }
  ])

  const [inputValue, setInputValue] = React.useState('')
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0)
  const [answers, setAnswers] = React.useState({})
  const [inFollowUp, setInFollowUp] = React.useState(false)
  const [followUpQuestions, setFollowUpQuestions] = React.useState([])
  const [currentFollowUpIndex, setCurrentFollowUpIndex] = React.useState(0)

  const [speechEnabled, setSpeechEnabled] = React.useState(true)
  const [voiceError, setVoiceError] = React.useState('')
  const [attemptCount, setAttemptCount] = React.useState(0)
  const [summaryReady, setSummaryReady] = React.useState(false)

  // OCR + Meds editor state
  const [medsOCR, setMedsOCR] = React.useState('')
  const [docsOCR, setDocsOCR] = React.useState('')
  const [rawMedsText, setRawMedsText] = React.useState('')
  const [medsRows, setMedsRows] = React.useState([])
  const [showMedsEditor, setShowMedsEditor] = React.useState(false)
  const [showAddModal, setShowAddModal] = React.useState(false)

  const messagesEndRef = React.useRef(null)

  // Voice
  const vr = useVoiceRecognition({
    onResult: (text, isFinal) => {
      if (!isFinal) return
      setInputValue(text)
      setTimeout(() => handleSubmit(null, text), 150)
    },
    onError: (err) => { setVoiceError(err); setTimeout(() => setVoiceError(''), 3000) }
  })

  const addMessage = (text, isUser, speak = false) => {
    setMessages(prev => [...prev, { text, isUser }])
    if (!isUser && speak && speechEnabled) setTimeout(() => speakText(text), 150)
  }

  // Load questionnaire + first prompt
  React.useEffect(() => {
    loadQuestionnaire()
      .then((data) => {
        setQuestionnaire(data)
        const qs = flattenQuestions(data)
        setAllQuestions(qs)
        if (qs.length > 0) addMessage(qs[0].prompt, false, true)
      })
      .catch(() => addMessage("Sorry, I'm having trouble loading the questionnaire. Please refresh the page.", false))
  }, [])

  // Auto-scroll
  React.useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Meds autosave/restore
  React.useEffect(() => {
    try {
      const savedRows = JSON.parse(localStorage.getItem('pepper-medsRows') || 'null')
      if (Array.isArray(savedRows)) setMedsRows(savedRows)
    } catch {}
    const savedText = localStorage.getItem('pepper-rawMedsText')
    if (typeof savedText === 'string') setRawMedsText(savedText)
  }, [])
  React.useEffect(() => { try { localStorage.setItem('pepper-medsRows', JSON.stringify(medsRows)) } catch {} }, [medsRows])
  React.useEffect(() => { try { localStorage.setItem('pepper-rawMedsText', rawMedsText || '') } catch {} }, [rawMedsText])

  const validateAnswer = (answer, question) => {
    if (!answer || !answer.trim()) return false
    const opts = question.expectedOptions || null
    if (!opts || opts.length === 0) return true
    const lower = answer.toLowerCase()
    return opts.some(o => lower.includes(String(o).toLowerCase()))
  }

  function ensureCoverageBeforeSummary() {
    if (!questionnaire) return null
    const pending = findUnansweredIds(questionnaire, answers)
    return pending.length ? pending : null
  }
  function queueNextOrFinish() {
    if (currentQuestionIndex < allQuestions.length - 1) {
      const nextIndex = currentQuestionIndex + 1
      setCurrentQuestionIndex(nextIndex)
      addMessage(allQuestions[nextIndex].prompt, false, true)
    } else {
      setSummaryReady(true)
      addMessage("That completes the core questions. You can generate your summary now. If anything is missing, I’ll ask you those bits first.", false, true)
    }
  }

  const startFollowUps = (baseQuestion) => {
    if (!baseQuestion?.hasFollowUp || !baseQuestion?.followUpQuestions?.length) return false
    setInFollowUp(true); setCurrentFollowUpIndex(0); setFollowUpQuestions(baseQuestion.followUpQuestions)
    addMessage("Thanks — I have a few quick follow-up questions.", false, true)
    setTimeout(() => addMessage(baseQuestion.followUpQuestions[0], false, true), 600)
    return true
  }

  const handleFollowUpAnswer = (userAnswer) => {
    const fqKey = `followup_${currentFollowUpIndex}_${Date.now()}`
    setAnswers(prev => ({ ...prev, [fqKey]: userAnswer }))
    if (currentFollowUpIndex < followUpQuestions.length - 1) {
      setCurrentFollowUpIndex(i => i + 1)
      setTimeout(() => addMessage(followUpQuestions[currentFollowUpIndex + 1], false, true), 500)
    } else {
      setInFollowUp(false); setFollowUpQuestions([]); setCurrentFollowUpIndex(0)
      addMessage("Thanks — that’s all for this topic. Let’s continue.", false, true)
      setTimeout(queueNextOrFinish, 500)
    }
  }

  const handleSubmit = (e, voiceInput = null) => {
    if (e) e.preventDefault()
    const userInput = voiceInput ?? inputValue
    if (!userInput.trim()) return
    addMessage(userInput, true)
    setInputValue('')

    const lower = userInput.trim().toLowerCase()
    if (['go back', 'previous', 'last question', 'back'].some(p => lower.includes(p))) {
      if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex(i => i - 1)
        addMessage("No problem — let’s go back.", false, true)
        setTimeout(() => addMessage(allQuestions[currentQuestionIndex - 1].prompt, false, true), 400)
      } else {
        addMessage("We’re already at the first question.", false, true)
      }
      return
    }

    const q = allQuestions[currentQuestionIndex]
    setAnswers(prev => ({ ...prev, [q.id]: userInput }))

    if (!validateAnswer(userInput, q)) {
      if (attemptCount === 0) {
        setAttemptCount(1)
        addMessage(q.clarification || "Thanks. You can answer in your own words; if you’re not sure, say 'prefer not to say'.", false, true)
        return
      }
    }
    setAttemptCount(0)

    if (startFollowUps(q)) return
    queueNextOrFinish()
  }

  function generateSummaryPDF() {
    if (!questionnaire) return
    const missing = ensureCoverageBeforeSummary()
    if (missing?.length) {
      const firstMissing = questionnaire.sections.flatMap(s => s.questions).find(qn => missing.includes(qn.id))
      addMessage(`Before we finish, I need to ask: ${firstMissing.prompt}`, false, true)
      const idx = allQuestions.findIndex(x => x.id === firstMissing.id)
      if (idx >= 0) setCurrentQuestionIndex(idx)
      return
    }

    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const W = doc.internal.pageSize.getWidth()
    const H = doc.internal.pageSize.getHeight()
    const margin = 48
    let y = margin

    doc.setFillColor('#003087'); doc.rect(0,0,W,84,'F')
    doc.setFontSize(20); doc.setTextColor('#fff'); doc.text('Pre-operative Assessment — Pepper', margin, 52)
    doc.setFontSize(11); doc.setTextColor('#222'); y = 110
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y); y += 18

    const addFooter = () => {
      const page = (doc.internal.getNumberOfPages && doc.internal.getNumberOfPages()) || 1
      doc.setFontSize(9); doc.setTextColor(120)
      doc.text(String(page), W - margin, H - 20, { align: 'right' })
    }
    const addText = (text) => {
      const lines = doc.splitTextToSize(text, W - margin*2)
      for (const line of lines) {
        if (y > H - 72) { addFooter(); doc.addPage(); y = margin }
        doc.text(line, margin, y); y += 16
      }
    }

    // 14 sections (from questionnaire.json) — inject meds table into section 13
    questionnaire.sections.forEach((sec, i) => {
      if (y > H - 96) { addFooter(); doc.addPage(); y = margin }
      doc.setFont(undefined, 'bold'); doc.setTextColor('#003087')
      doc.text(`${i+1}. ${sec.title}`, margin, y); y += 10
      doc.setFont(undefined, 'normal'); doc.setTextColor('#222'); y += 6

      if (/^medications? and allergies$/i.test(sec.title)) {
        if (medsRows.length > 0) {
          addText('Medication list:')
          const header = 'Drug | Strength | Dose | Route | Frequency | Notes'
          addText(header)
          addText('-'.repeat(header.length))
          medsRows.forEach(r => {
            addText([
              r.drug || '—',
              r.strength || '—',
              r.dose || '—',
              r.route || '—',
              r.frequency || '—',
              r.notes || ''
            ].join(' | '))
          })
        } else if ((rawMedsText || medsOCR)?.trim()) {
          addText('OCR (medications):\n' + (rawMedsText || medsOCR).trim())
        } else {
          addText('—')
        }
      } else {
        const lines = []
        sec.questions.forEach(qn => {
          const v = answers[qn.id]
          if (v !== undefined && v !== '') lines.push(`• ${qn.prompt}  ${v}`)
        })
        addText(lines.length ? lines.join('\n') : '—')
      }
      y += 10
    })

    if (docsOCR?.trim()) {
      if (y > H - 96) { addFooter(); doc.addPage(); y = margin }
      doc.setFont(undefined, 'bold'); doc.setTextColor('#003087')
      doc.text('Appendix: Documents (OCR extract)', margin, y); y += 10
      doc.setFont(undefined, 'normal'); doc.setTextColor('#222'); y += 6
      addText(docsOCR.trim())
    }

    addFooter()
    doc.save('pepper-summary.pdf')
    addMessage('Your summary PDF has been downloaded. Review meds & details; say “go back” to edit then regenerate.', false, true)
  }

  // Render
  if (!questionnaire || allQuestions.length === 0) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
          <div style={{ fontSize: 18, color: '#6b7280' }}>Loading questionnaire...</div>
        </div>
      </div>
    )
  }
  const currentQuestion = allQuestions[currentQuestionIndex]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', flexDirection: 'column' }}>
      {!vr.isSupported && (
        <div style={{ backgroundColor: '#fef3cd', border: '1px solid #facc15', padding: '12px 16px', textAlign: 'center', fontSize: 14, color: '#92400e' }}>
          🎤 Voice recognition is not supported in your browser. You can still type your responses.
        </div>
      )}
      {voiceError && (
        <div style={{ backgroundColor: '#fee2e2', border: '1px solid #f87171', padding: '12px 16px', textAlign: 'center', fontSize: 14, color: '#dc2626' }}>
          🎤 Voice error: {voiceError}. Please try again or type your response.
        </div>
      )}

      {/* Header */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '12px 16px' }}>
        <div style={{ maxWidth: 768, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, backgroundColor: '#003087', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🤖</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 18, color: '#003087', fontWeight: 600 }}>Pepper Assessment</h1>
              <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
                Question {currentQuestionIndex + 1} of {allQuestions.length} • {vr.isSupported ? (vr.isListening ? 'Listening… 🎤' : 'Click mic to speak 🎤') : 'Voice off'}
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => { if (!speechEnabled && 'speechSynthesis' in window) window.speechSynthesis.cancel(); setSpeechEnabled(!speechEnabled) }}
              style={{ padding: '6px 12px', border: 'none', borderRadius: 6, backgroundColor: speechEnabled ? '#009639' : '#6b7280', color: 'white', fontSize: 12, cursor: 'pointer' }}
              title={speechEnabled ? 'Speech enabled - click to disable' : 'Speech disabled - click to enable'}>
              {speechEnabled ? '🔊 ON' : '🔇 OFF'}
            </button>
            <div>
              <div style={{ fontSize: 12, color: '#6b7280', backgroundColor: '#f3f4f6', padding: '4px 8px', borderRadius: 12, marginBottom: 4 }}>
                {Math.round(((currentQuestionIndex + 1) / allQuestions.length) * 100)}% Complete
              </div>
              <div style={{ fontSize: 10, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>{currentQuestion?.sectionIcon}</span>
                <span>{currentQuestion?.sectionTitle}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transcript */}
      <div style={{ flex: 1, maxWidth: 768, margin: '0 auto', width: '100%', padding: 20, paddingBottom: 140 }}>
        {messages.map((m, i) => (<ChatBubble key={i} message={m.text} isUser={m.isUser} />))}
        <div ref={messagesEndRef} />
      </div>

      {/* Uploads panel (OCR) */}
      <div style={{ maxWidth: 768, margin: '0 auto', width: '100%', padding: '0 20px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          <OCRUpload
            label="Scan medications / prescription (photo)"
            onText={(txt) => {
              setMedsOCR(txt)
              setRawMedsText(txt)
              if (!showMedsEditor) setShowMedsEditor(true)
              addMessage('Medication photo scanned. Review and correct below before generating the summary.', false, true)
            }}
          />
          <OCRUpload
            label="Scan clinic letters / medical documents (photo)"
            multiple
            onText={(txt) => {
              setDocsOCR(txt)
              addMessage('Document photo(s) scanned. I’ll include an appendix in your summary.', false, true)
            }}
          />
          {(medsOCR || docsOCR) && (
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              Detected meds text: {medsOCR ? medsOCR.slice(0,120) + (medsOCR.length>120?'…':'') : '—'}<br/>
              Detected document text: {docsOCR ? docsOCR.slice(0,120) + (docsOCR.length>120?'…':'') : '—'}
            </div>
          )}
        </div>
      </div>

      {/* Medication review & edit */}
      {(rawMedsText || medsRows.length > 0) && (
        <div style={{ maxWidth: 768, margin: '0 auto', width: '100%', padding: '0 20px 20px' }}>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#fff' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <strong>Medication review</strong>
              <button type="button" onClick={()=>setShowMedsEditor(!showMedsEditor)}
                style={{ border:'1px solid #d1d5db', background:'#fff', borderRadius:6, padding:'6px 10px' }}>
                {showMedsEditor ? 'Hide' : 'Show'} editor
              </button>
            </div>

            {showMedsEditor && (
              <>
                <label style={{ fontSize:12, color:'#374151' }}>Raw OCR text (edit freely, one medicine per line)</label>
                <textarea
                  value={rawMedsText}
                  onChange={e=>setRawMedsText(e.target.value)}
                  rows={5}
                  style={{ width:'100%', border:'1px solid #d1d5db', borderRadius:8, padding:10, marginTop:6, marginBottom:8 }}
                  placeholder="e.g. Ramipril 5 mg PO OD"
                />
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <button
                    type="button"
                    onClick={() => setMedsRows(parseMedsText(rawMedsText))}
                    style={{ border:'none', background:'#003087', color:'#fff', borderRadius:8, padding:'8px 12px' }}>
                    Parse into table
                  </button>
                  <button
                    type="button"
                    onClick={()=>setShowAddModal(true)}
                    style={{ border:'none', background:'#00A9CE', color:'#fff', borderRadius:8, padding:'8px 12px' }}>
                    + Add medicine
                  </button>
                </div>
              </>
            )}

            {medsRows.length > 0 && (<><div style={{ height:8 }} /><MedsTable rows={medsRows} setRows={setMedsRows} /></>)}
            {showAddModal && <AddMedicineModal onAdd={(row)=>setMedsRows(prev=>[...prev, row])} onClose={()=>setShowAddModal(false)} />}
          </div>
        </div>
      )}

      {/* Composer */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: 'white', borderTop: '1px solid #e5e7eb', padding: 16 }}>
        <div style={{ maxWidth: 768, margin: '0 auto' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            {vr.isSupported && (
              <button type="button" onClick={() => { vr.isListening ? vr.stop() : vr.start() }}
                style={{
                  width: 48, height: 48, borderRadius: '50%', border: 'none',
                  backgroundColor: vr.isListening ? '#DC2626' : '#003087', color: 'white', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)', transform: vr.isListening ? 'scale(1.1)' : 'scale(1)', transition: 'all .2s'
                }}
                title={vr.isListening ? 'Listening... Click to stop' : 'Click to speak'}>
                {vr.isListening ? '🔴' : '🎤'}
              </button>
            )}
            <div style={{ flex: 1 }}>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={vr.isListening ? "Listening... Speak now!" : "Type your answer or click the microphone to speak..."}
                disabled={vr.isListening}
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: 24, fontSize: 16, outline: 'none', backgroundColor: vr.isListening ? '#f3f4f6' : 'white' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: 12, color: '#6b7280' }}>
                <span>Say “go back” to change previous answers</span>
                <span>{currentQuestion?.sectionTitle}</span>
              </div>
            </div>
            <button type="submit"
              disabled={!inputValue.trim() || vr.isListening}
              style={{ borderRadius: 24, padding: '12px 24px', opacity: (inputValue.trim() && !vr.isListening) ? 1 : 0.5, cursor: (inputValue.trim() && !vr.isListening) ? 'pointer' : 'not-allowed', background: '#00A9CE', color: 'white', border: 'none' }}>
              Send
            </button>
          </form>

          <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={generateSummaryPDF} disabled={!summaryReady}
              style={{ borderRadius: 10, padding: '10px 14px', border: '1px solid #d1d5db', background: summaryReady ? '#003087' : '#e5e7eb', color: summaryReady ? 'white' : '#6b7280' }}>
              Generate Summary (PDF)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------ Consent wrapper ---------------------------- */
function App() {
  const [hasConsented, setHasConsented] = React.useState(localStorage.getItem('pepper-consent') === 'true')
  if (!hasConsented) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="card" style={{ maxWidth: 600 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ width: 64, height: 64, backgroundColor: '#003087', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>🛡️</div>
            <h1 className="nhs-blue">Pepper Pre-operative Assessment</h1>
            <p style={{ color: '#6b7280' }}>Voice-enabled health assessment system</p>
          </div>
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ color: '#003087', marginBottom: 12 }}>Data Privacy & Consent</h3>
            <ul style={{ lineHeight: 1.6, paddingLeft: 20 }}>
              <li>We collect health information for your pre-operative assessment</li>
              <li>Your device uses built-in voice APIs; voice processing is handled by your browser</li>
              <li>Only authorised staff can access your assessment</li>
            </ul>
          </div>
          <button onClick={() => { localStorage.setItem('pepper-consent', 'true'); setHasConsented(true) }}
            className="btn btn-primary" style={{ fontSize: 16, padding: 16, width: '100%' }}>
            I Consent - Continue Assessment
          </button>
        </div>
      </div>
    )
  }
  return <ChatInterface />
}

export default App
