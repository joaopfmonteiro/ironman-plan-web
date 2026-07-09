import { useEffect, useState } from 'react'
import { weightApi } from '../../api/weight'
import type { WeightEntryResponse, AthleteResponse } from '../../types'
import { toLocalISODate } from '../../utils/date'
import { calcBmi, getBmiCat } from '../../utils/bodyMetrics'
import { LineChart, PERIODS, getPeriodStart, type Period, type ChartPoint } from './LineChart'
import { BmiGaugeBar } from './BmiGaugeBar'

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

interface WeightSectionProps {
  athlete: AthleteResponse | null
}

export function WeightSection({ athlete }: WeightSectionProps) {
  const [allEntries, setAllEntries] = useState<WeightEntryResponse[]>([])
  const [loading, setLoading]       = useState(true)
  const [period, setPeriod]         = useState<Period>('1M')
  const [chartMode, setChartMode]   = useState<'weight' | 'bmi'>('weight')

  // Add form
  const [addDate, setAddDate]   = useState(() => toLocalISODate())
  const [addKg, setAddKg]       = useState('')
  const [saving, setSaving]     = useState(false)

  // Edit modal
  const [editEntry, setEditEntry]   = useState<WeightEntryResponse | null>(null)
  const [editDate, setEditDate]     = useState('')
  const [editKg, setEditKg]         = useState('')
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => {
    weightApi.list().then((entries) => {
      setAllEntries(entries)
      if (athlete?.weightKg) setAddKg(String(athlete.weightKg))
    }).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const startStr    = toLocalISODate(periodStart)
  const entries     = allEntries.filter((e) => e.date >= startStr)

  const weightPoints: ChartPoint[] = entries.map((e) => ({ id: e.id, date: e.date, value: e.weightKg }))
  const bmiPoints: ChartPoint[] = athlete?.heightCm
    ? entries.map((e) => ({ id: e.id, date: e.date, value: calcBmi(e.weightKg, athlete.heightCm!) }))
    : []

  // BMI
  const currentWeight = allEntries[allEntries.length - 1]?.weightKg ?? null
  const bmi = currentWeight && athlete?.heightCm ? calcBmi(currentWeight, athlete.heightCm) : null
  const bmiCat = bmi ? getBmiCat(bmi) : null

  if (loading) return <div className="wp-loading">A carregar...</div>

  return (
    <>
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

      {/* BMI gauge */}
      {bmi != null && (
        <div className="wp-chart-card">
          <div className="wp-chart-header">
            <span className="wp-chart-label">Classificação do IMC</span>
          </div>
          <BmiGaugeBar bmi={bmi} />
        </div>
      )}

      {/* Chart */}
      <div className="wp-chart-card">
        <div className="wp-chart-header">
          <span className="wp-chart-label">Evolução</span>
          <div className="wp-chart-controls">
            {athlete?.heightCm && (
              <div className="weight-period-tabs">
                <button
                  className={`weight-period-tab ${chartMode === 'weight' ? 'weight-period-tab--active' : ''}`}
                  onClick={() => setChartMode('weight')}>
                  Peso
                </button>
                <button
                  className={`weight-period-tab ${chartMode === 'bmi' ? 'weight-period-tab--active' : ''}`}
                  onClick={() => setChartMode('bmi')}>
                  IMC
                </button>
              </div>
            )}
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
        </div>
        {chartMode === 'weight' ? (
          <LineChart
            points={weightPoints}
            period={period}
            periodStart={periodStart}
            periodEnd={periodEnd}
            tooltip={(p) => `${p.value} kg — ${p.date}`}
          />
        ) : (
          <LineChart
            points={bmiPoints}
            period={period}
            periodStart={periodStart}
            periodEnd={periodEnd}
            color="#7c3aed"
            fillColor="rgba(124,58,237,0.07)"
            tooltip={(p) => `IMC ${p.value.toFixed(1)} — ${p.date}`}
          />
        )}
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
    </>
  )
}
