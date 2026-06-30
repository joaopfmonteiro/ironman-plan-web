import { useEffect, useState } from 'react'
import { weightApi } from '../../api/weight'
import { athleteApi } from '../../api/athlete'
import type { WeightEntryResponse, AthleteResponse } from '../../types'
import './WeightPage.css'

const W = 700
const H = 200
const PT = 14
const PB = 28
const PL = 48
const PR = 12
const IW = W - PL - PR
const IH = H - PT - PB

type Period = '1S' | '1M' | '3M' | '6M' | '1A'

const PERIODS: { key: Period; label: string; days: number }[] = [
  { key: '1S', label: 'Semana',  days: 7   },
  { key: '1M', label: 'Mês',     days: 30  },
  { key: '3M', label: '3 Meses', days: 90  },
  { key: '6M', label: '6 Meses', days: 180 },
  { key: '1A', label: 'Ano',     days: 365 },
]

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const DAYS   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

const BMI_CATS = [
  { max: 18.5, label: 'Abaixo do peso', cls: 'bmi--low' },
  { max: 25,   label: 'Peso normal',    cls: 'bmi--normal' },
  { max: 30,   label: 'Excesso de peso',cls: 'bmi--over' },
  { max: 35,   label: 'Obesidade I',    cls: 'bmi--obese1' },
  { max: 40,   label: 'Obesidade II',   cls: 'bmi--obese2' },
  { max: Infinity, label: 'Obesidade III', cls: 'bmi--obese3' },
]

function getBmiCat(bmi: number) {
  return BMI_CATS.find((c) => bmi < c.max) ?? BMI_CATS[BMI_CATS.length - 1]
}

function calcBmi(weightKg: number, heightCm: number) {
  const h = heightCm / 100
  return weightKg / (h * h)
}

function getPeriodStart(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d
}

function dateToX(dateStr: string, startMs: number, endMs: number): number {
  const ms = new Date(dateStr).getTime()
  return PL + Math.max(0, Math.min(1, (ms - startMs) / (endMs - startMs))) * IW
}

function toY(kg: number, min: number, range: number): number {
  if (range === 0) return PT + IH / 2
  return PT + (1 - (kg - min) / range) * IH
}

function generateXTicks(start: Date, end: Date, period: Period): Date[] {
  const ticks: Date[] = []
  const cur = new Date(start)
  if (period === '1S') {
    while (cur <= end) { ticks.push(new Date(cur)); cur.setDate(cur.getDate() + 1) }
  } else if (period === '1M') {
    while (cur <= end) { ticks.push(new Date(cur)); cur.setDate(cur.getDate() + 7) }
  } else {
    cur.setDate(1)
    const step = period === '1A' ? 2 : 1
    while (cur <= end) { ticks.push(new Date(cur)); cur.setMonth(cur.getMonth() + step) }
  }
  return ticks
}

function fmtTick(d: Date, period: Period): string {
  if (period === '1S') return DAYS[d.getDay()]
  if (period === '1M') return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
  return MONTHS[d.getMonth()]
}

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

export function WeightPage() {
  const [allEntries, setAllEntries] = useState<WeightEntryResponse[]>([])
  const [athlete, setAthlete]       = useState<AthleteResponse | null>(null)
  const [loading, setLoading]       = useState(true)
  const [period, setPeriod]         = useState<Period>('1M')

  // Add form
  const [addDate, setAddDate]   = useState(() => new Date().toISOString().slice(0, 10))
  const [addKg, setAddKg]       = useState('')
  const [saving, setSaving]     = useState(false)

  // Edit modal
  const [editEntry, setEditEntry]   = useState<WeightEntryResponse | null>(null)
  const [editDate, setEditDate]     = useState('')
  const [editKg, setEditKg]         = useState('')
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      weightApi.list(),
      athleteApi.getMe(),
    ]).then(([entries, ath]) => {
      setAllEntries(entries)
      setAthlete(ath)
      if (ath.weightKg) setAddKg(String(ath.weightKg))
    }).finally(() => setLoading(false))
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = parseFloat(addKg)
    if (!val || val < 20 || val > 300) return
    setSaving(true)
    try {
      const entry = await weightApi.create({ date: addDate, weightKg: val })
      setAllEntries((prev) =>
        [...prev.filter((e) => e.date !== addDate), entry].sort((a, b) => a.date.localeCompare(b.date))
      )
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    await weightApi.delete(id)
    setAllEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const openEdit = (entry: WeightEntryResponse) => {
    setEditEntry(entry)
    setEditDate(entry.date)
    setEditKg(String(entry.weightKg))
  }

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editEntry) return
    const val = parseFloat(editKg)
    if (!val || val < 20 || val > 300) return
    setEditSaving(true)
    try {
      const updated = await weightApi.update(editEntry.id, { date: editDate, weightKg: val })
      setAllEntries((prev) =>
        prev.map((e) => e.id === updated.id ? updated : e).sort((a, b) => a.date.localeCompare(b.date))
      )
      setEditEntry(null)
    } finally { setEditSaving(false) }
  }

  // Chart data
  const periodDays  = PERIODS.find((p) => p.key === period)!.days
  const periodStart = getPeriodStart(periodDays)
  const periodEnd   = new Date()
  const startMs     = periodStart.getTime()
  const endMs       = periodEnd.getTime()
  const startStr    = periodStart.toISOString().slice(0, 10)
  const entries     = allEntries.filter((e) => e.date >= startStr)

  const kgs   = entries.map((e) => e.weightKg)
  const pad   = kgs.length ? Math.max(0.5, (Math.max(...kgs) - Math.min(...kgs)) * 0.2) : 2
  const minKg = kgs.length ? Math.min(...kgs) - pad : 60
  const maxKg = kgs.length ? Math.max(...kgs) + pad : 80
  const range = maxKg - minKg
  const yTicks = Array.from({ length: 5 }, (_, i) => minKg + (range / 4) * i)

  const points   = entries.map((e) => ({ x: dateToX(e.date, startMs, endMs), y: toY(e.weightKg, minKg, range), entry: e }))
  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ')
  const xTicks   = generateXTicks(periodStart, periodEnd, period)

  // BMI
  const currentWeight = allEntries[allEntries.length - 1]?.weightKg ?? null
  const bmi = currentWeight && athlete?.heightCm ? calcBmi(currentWeight, athlete.heightCm) : null
  const bmiCat = bmi ? getBmiCat(bmi) : null

  if (loading) return <div className="wp-loading">A carregar...</div>

  return (
    <div className="wp">
      <h1 className="wp__title">Peso & IMC</h1>

      {/* Stats row */}
      <div className="wp-stats">
        <div className="wp-stat">
          <span className="wp-stat__label">Peso atual</span>
          <span className="wp-stat__value">{currentWeight ? `${currentWeight} kg` : '—'}</span>
        </div>
        <div className="wp-stat">
          <span className="wp-stat__label">IMC</span>
          <span className="wp-stat__value">{bmi ? bmi.toFixed(1) : '—'}</span>
        </div>
        {bmiCat && (
          <div className="wp-stat">
            <span className="wp-stat__label">Classificação</span>
            <span className={`wp-stat__badge ${bmiCat.cls}`}>{bmiCat.label}</span>
          </div>
        )}
        {athlete?.heightCm && (
          <div className="wp-stat">
            <span className="wp-stat__label">Altura</span>
            <span className="wp-stat__value">{athlete.heightCm} cm</span>
          </div>
        )}
        {!athlete?.heightCm && (
          <div className="wp-stat wp-stat--hint">
            <span className="wp-stat__label">IMC indisponível</span>
            <span className="wp-stat__sub">Adiciona a altura no perfil</span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="wp-chart-card">
        <div className="wp-chart-header">
          <span className="wp-chart-label">Evolução</span>
          <div className="weight-period-tabs">
            {PERIODS.map((p) => (
              <button key={p.key}
                className={`weight-period-tab ${period === p.key ? 'weight-period-tab--active' : ''}`}
                onClick={() => setPeriod(p.key)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <svg className="wp-chart-svg" viewBox={`0 0 ${W} ${H}`}>
          {yTicks.map((tick, i) => {
            const y = toY(tick, minKg, range)
            return (
              <g key={i}>
                <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                <text x={PL - 5} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{tick.toFixed(1)}</text>
              </g>
            )
          })}
          {xTicks.map((tick, i) => {
            const x = dateToX(tick.toISOString().slice(0, 10), startMs, endMs)
            return (
              <g key={i} className="weight-x-tick">
                <line x1={x} y1={PT} x2={x} y2={PT + IH} stroke="#f8fafc" strokeWidth="1" />
                <text x={x} y={H - 6} textAnchor="middle" fontSize="10" fill="#94a3b8">{fmtTick(tick, period)}</text>
              </g>
            )
          })}
          {entries.length === 0 && (
            <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="12" fill="#cbd5e1">
              Sem registos neste período
            </text>
          )}
          {entries.length > 1 && (
            <polygon
              points={`${points[0].x},${PT + IH} ${polyline} ${points[points.length - 1].x},${PT + IH}`}
              fill="rgba(249,115,22,0.07)" />
          )}
          {entries.length > 1 && (
            <polyline points={polyline} fill="none" stroke="#f97316"
              strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          )}
          {points.map((p) => (
            <circle key={p.entry.id} cx={p.x} cy={p.y} r="4"
              fill="#fff" stroke="#f97316" strokeWidth="2.5">
              <title>{p.entry.weightKg} kg — {p.entry.date}</title>
            </circle>
          ))}
        </svg>
      </div>

      {/* Add form + table side by side */}
      <div className="wp-bottom">
        {/* Add form */}
        <div className="wp-add-card">
          <h2 className="wp-add-card__title">Registar peso</h2>
          <form onSubmit={handleAdd} className="wp-add-form">
            <div className="wp-field">
              <label className="wp-field__label">Data</label>
              <input type="date" className="wp-field__input" value={addDate}
                onChange={(e) => setAddDate(e.target.value)} required />
            </div>
            <div className="wp-field">
              <label className="wp-field__label">Peso (kg)</label>
              <input type="number" className="wp-field__input" value={addKg}
                onChange={(e) => setAddKg(e.target.value)}
                placeholder="kg" step="0.1" min="20" max="300" required />
            </div>
            <button type="submit" className="wp-btn" disabled={saving}>
              {saving ? 'A guardar...' : 'Registar'}
            </button>
          </form>
        </div>

        {/* Table */}
        <div className="wp-table-card">
          <h2 className="wp-table-card__title">Todos os registos</h2>
          {allEntries.length === 0 ? (
            <p className="wp-empty">Sem registos ainda.</p>
          ) : (
            <table className="wp-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Peso</th>
                  {athlete?.heightCm && <th>IMC</th>}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[...allEntries].reverse().map((e) => {
                  const entryBmi = athlete?.heightCm ? calcBmi(e.weightKg, athlete.heightCm) : null
                  const cat = entryBmi ? getBmiCat(entryBmi) : null
                  return (
                    <tr key={e.id}>
                      <td>{fmtDate(e.date)}</td>
                      <td className="wp-table__weight">{e.weightKg} kg</td>
                      {athlete?.heightCm && (
                        <td>
                          <span className={`wp-bmi-pill ${cat?.cls ?? ''}`}>
                            {entryBmi?.toFixed(1)}
                          </span>
                        </td>
                      )}
                      <td className="wp-table__actions">
                        <button className="wp-action wp-action--edit" onClick={() => openEdit(e)} title="Editar">
                          ✏️
                        </button>
                        <button className="wp-action wp-action--delete" onClick={() => handleDelete(e.id)} title="Eliminar">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {editEntry && (
        <div className="wp-modal-overlay" onClick={() => setEditEntry(null)}>
          <div className="wp-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="wp-modal__title">Editar registo</h3>
            <form onSubmit={handleEditSave} className="wp-add-form">
              <div className="wp-field">
                <label className="wp-field__label">Data</label>
                <input type="date" className="wp-field__input" value={editDate}
                  onChange={(e) => setEditDate(e.target.value)} required />
              </div>
              <div className="wp-field">
                <label className="wp-field__label">Peso (kg)</label>
                <input type="number" className="wp-field__input" value={editKg}
                  onChange={(e) => setEditKg(e.target.value)}
                  step="0.1" min="20" max="300" required />
              </div>
              <div className="wp-modal__actions">
                <button type="button" className="wp-btn wp-btn--secondary" onClick={() => setEditEntry(null)}>Cancelar</button>
                <button type="submit" className="wp-btn" disabled={editSaving}>
                  {editSaving ? 'A guardar...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
