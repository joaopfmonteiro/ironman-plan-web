import { useEffect, useState } from 'react'
import { bodyMeasurementsApi } from '../../api/bodyMeasurements'
import type { AthleteResponse, BodyMeasurementResponse, CreateBodyMeasurementRequest } from '../../types'
import { toLocalISODate } from '../../utils/date'
import {
  MEASUREMENT_GUIDE,
  calcWaistHipRatio,
  getWhrCategory,
  calcBodyFatNavy,
  getBodyFatCategory,
  type MeasurementGuideEntry,
} from '../../utils/bodyMetrics'
import { LineChart, PERIODS, getPeriodStart, type Period, type ChartPoint } from './LineChart'

type MeasurementKey = MeasurementGuideEntry['key']
type FieldValues = Record<MeasurementKey, string>
type MetricKey = MeasurementKey | 'whr' | 'bodyFat'

const EMPTY_FIELDS: FieldValues = {
  neckCm: '', chestCm: '', waistCm: '', hipCm: '', armCm: '', thighCm: '',
}

const METRIC_OPTIONS: { key: MetricKey; label: string; color: string; fillColor: string; format: (v: number) => string }[] = [
  { key: 'waistCm', label: 'Cintura',            color: '#ef4444', fillColor: 'rgba(239,68,68,0.07)',  format: (v) => `${v.toFixed(1)} cm` },
  { key: 'hipCm',   label: 'Anca',               color: '#8b5cf6', fillColor: 'rgba(139,92,246,0.07)', format: (v) => `${v.toFixed(1)} cm` },
  { key: 'neckCm',  label: 'Pescoço',             color: '#f97316', fillColor: 'rgba(249,115,22,0.07)', format: (v) => `${v.toFixed(1)} cm` },
  { key: 'chestCm', label: 'Peito',               color: '#0ea5e9', fillColor: 'rgba(14,165,233,0.07)', format: (v) => `${v.toFixed(1)} cm` },
  { key: 'armCm',   label: 'Braço',               color: '#10b981', fillColor: 'rgba(16,185,129,0.07)', format: (v) => `${v.toFixed(1)} cm` },
  { key: 'thighCm', label: 'Coxa',                color: '#eab308', fillColor: 'rgba(234,179,8,0.07)',  format: (v) => `${v.toFixed(1)} cm` },
  { key: 'whr',     label: 'Rácio cintura-anca',  color: '#ec4899', fillColor: 'rgba(236,72,153,0.07)', format: (v) => v.toFixed(2) },
  { key: 'bodyFat', label: '% Massa gorda',       color: '#6366f1', fillColor: 'rgba(99,102,241,0.07)', format: (v) => `${v.toFixed(1)}%` },
]

function getMetricPoints(metric: MetricKey, entries: BodyMeasurementResponse[], athlete: AthleteResponse | null): ChartPoint[] {
  if (metric === 'whr') {
    return entries
      .filter((e) => e.waistCm != null && e.hipCm != null)
      .map((e) => ({ id: e.id, date: e.date, value: calcWaistHipRatio(e.waistCm!, e.hipCm!) }))
  }
  if (metric === 'bodyFat') {
    return entries.reduce<ChartPoint[]>((acc, e) => {
      const bf = calcBodyFatNavy({
        gender: athlete?.gender, heightCm: athlete?.heightCm,
        neckCm: e.neckCm, waistCm: e.waistCm, hipCm: e.hipCm,
      })
      if (bf != null) acc.push({ id: e.id, date: e.date, value: bf })
      return acc
    }, [])
  }
  return entries
    .filter((e) => e[metric] != null)
    .map((e) => ({ id: e.id, date: e.date, value: e[metric]! }))
}

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function fieldsToRequest(date: string, fields: FieldValues): CreateBodyMeasurementRequest {
  const req: CreateBodyMeasurementRequest = { date }
  for (const g of MEASUREMENT_GUIDE) {
    const raw = fields[g.key]
    if (raw !== '' && raw != null) {
      const val = parseFloat(raw)
      if (!Number.isNaN(val)) req[g.key] = val
    }
  }
  return req
}

function entryToFields(entry: BodyMeasurementResponse): FieldValues {
  const fields = { ...EMPTY_FIELDS }
  for (const g of MEASUREMENT_GUIDE) {
    const v = entry[g.key]
    fields[g.key] = v != null ? String(v) : ''
  }
  return fields
}

function MeasurementFields({ values, onChange }: { values: FieldValues; onChange: (key: MeasurementKey, val: string) => void }) {
  return (
    <div className="bm-field-grid">
      {MEASUREMENT_GUIDE.map((g) => (
        <div className="wp-field" key={g.key}>
          <label className="wp-field__label">{g.label} (cm)</label>
          <input type="number" className="wp-field__input" value={values[g.key]}
            onChange={(e) => onChange(g.key, e.target.value)}
            placeholder="cm" step="0.1" min="0" max="200" />
        </div>
      ))}
    </div>
  )
}

interface MeasurementsSectionProps {
  athlete: AthleteResponse | null
}

export function MeasurementsSection({ athlete }: MeasurementsSectionProps) {
  const [allEntries, setAllEntries] = useState<BodyMeasurementResponse[]>([])
  const [loading, setLoading]       = useState(true)
  const [period, setPeriod]         = useState<Period>('6M')
  const [metric, setMetric]         = useState<MetricKey>('waistCm')

  const [addDate, setAddDate]     = useState(() => toLocalISODate())
  const [addFields, setAddFields] = useState<FieldValues>(EMPTY_FIELDS)
  const [saving, setSaving]       = useState(false)

  const [editEntry, setEditEntry]     = useState<BodyMeasurementResponse | null>(null)
  const [editDate, setEditDate]       = useState('')
  const [editFields, setEditFields]   = useState<FieldValues>(EMPTY_FIELDS)
  const [editSaving, setEditSaving]   = useState(false)

  useEffect(() => {
    bodyMeasurementsApi.list().then(setAllEntries).finally(() => setLoading(false))
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const entry = await bodyMeasurementsApi.create(fieldsToRequest(addDate, addFields))
      setAllEntries((prev) =>
        [...prev.filter((e) => e.date !== addDate), entry].sort((a, b) => a.date.localeCompare(b.date))
      )
      setAddFields(EMPTY_FIELDS)
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    await bodyMeasurementsApi.delete(id)
    setAllEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const openEdit = (entry: BodyMeasurementResponse) => {
    setEditEntry(entry)
    setEditDate(entry.date)
    setEditFields(entryToFields(entry))
  }

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editEntry) return
    setEditSaving(true)
    try {
      const updated = await bodyMeasurementsApi.update(editEntry.id, fieldsToRequest(editDate, editFields))
      setAllEntries((prev) =>
        prev.map((e) => e.id === updated.id ? updated : e).sort((a, b) => a.date.localeCompare(b.date))
      )
      setEditEntry(null)
    } finally { setEditSaving(false) }
  }

  if (loading) return <div className="wp-loading">A carregar...</div>

  const periodDays  = PERIODS.find((p) => p.key === period)!.days
  const periodStart = getPeriodStart(periodDays)
  const periodEnd   = new Date()
  const startStr    = toLocalISODate(periodStart)
  const periodEntries = allEntries.filter((e) => e.date >= startStr)

  const activeMetric  = METRIC_OPTIONS.find((m) => m.key === metric)!
  const chartPoints   = getMetricPoints(metric, periodEntries, athlete)

  const latest = allEntries[allEntries.length - 1] ?? null

  const whr = latest?.waistCm && latest?.hipCm ? calcWaistHipRatio(latest.waistCm, latest.hipCm) : null
  const whrCat = whr != null ? getWhrCategory(whr, athlete?.gender) : null

  const bodyFat = latest
    ? calcBodyFatNavy({
        gender: athlete?.gender,
        heightCm: athlete?.heightCm,
        neckCm: latest.neckCm,
        waistCm: latest.waistCm,
        hipCm: latest.hipCm,
      })
    : null
  const bodyFatCat = bodyFat != null ? getBodyFatCategory(bodyFat, athlete?.gender) : null

  return (
    <>
      {/* Guide */}
      <div className="bm-guide">
        <h2 className="wp-add-card__title">Onde medir</h2>
        <div className="bm-guide__grid">
          {MEASUREMENT_GUIDE.map((g) => (
            <div className="bm-guide__item" key={g.key}>
              <span className="bm-guide__label">{g.label}</span>
              <span className="bm-guide__desc">{g.description}</span>
            </div>
          ))}
        </div>
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
        <div className="bm-metric-tabs">
          {METRIC_OPTIONS.map((m) => (
            <button key={m.key}
              className={`bm-metric-tab ${metric === m.key ? 'bm-metric-tab--active' : ''}`}
              style={metric === m.key ? { borderColor: m.color, color: m.color } : undefined}
              onClick={() => setMetric(m.key)}>
              {m.label}
            </button>
          ))}
        </div>
        <LineChart
          points={chartPoints}
          period={period}
          periodStart={periodStart}
          periodEnd={periodEnd}
          color={activeMetric.color}
          fillColor={activeMetric.fillColor}
          yTickFormat={activeMetric.format}
          tooltip={(p) => `${activeMetric.format(p.value)} — ${p.date}`}
          emptyLabel={`Sem registos de "${activeMetric.label}" neste período`}
        />
      </div>

      {/* Results */}
      <div className="bm-results">
        <div className="bm-result-card">
          <span className="wp-stat__label">Rácio cintura-anca</span>
          {whr != null ? (
            <>
              <span className="wp-stat__value">{whr.toFixed(2)}</span>
              {whrCat && <span className={`wp-stat__badge ${whrCat.cls}`}>{whrCat.label}</span>}
            </>
          ) : (
            <span className="wp-stat__sub">Regista cintura e anca para calcular</span>
          )}
        </div>
        <div className="bm-result-card">
          <span className="wp-stat__label">% Massa gorda (estimativa)</span>
          {bodyFat != null ? (
            <>
              <span className="wp-stat__value">{bodyFat.toFixed(1)}%</span>
              {bodyFatCat && <span className={`wp-stat__badge ${bodyFatCat.cls}`}>{bodyFatCat.label}</span>}
            </>
          ) : (
            <span className="wp-stat__sub">
              Regista pescoço, cintura{athlete?.gender === 'FEMALE' ? ' e anca' : ''} e confirma altura/género no perfil
            </span>
          )}
        </div>
      </div>

      {/* Add form + table side by side */}
      <div className="wp-bottom">
        <div className="wp-add-card">
          <h2 className="wp-add-card__title">Registar medição</h2>
          <form onSubmit={handleAdd} className="wp-add-form">
            <div className="wp-field">
              <label className="wp-field__label">Data</label>
              <input type="date" className="wp-field__input" value={addDate}
                onChange={(e) => setAddDate(e.target.value)} required />
            </div>
            <MeasurementFields values={addFields} onChange={(key, val) => setAddFields((prev) => ({ ...prev, [key]: val }))} />
            <button type="submit" className="wp-btn" disabled={saving}>
              {saving ? 'A guardar...' : 'Registar'}
            </button>
          </form>
        </div>

        <div className="wp-table-card">
          <h2 className="wp-table-card__title">Todos os registos</h2>
          {allEntries.length === 0 ? (
            <p className="wp-empty">Sem registos ainda.</p>
          ) : (
            <div className="bm-table-scroll">
              <table className="wp-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    {MEASUREMENT_GUIDE.map((g) => <th key={g.key}>{g.label}</th>)}
                    <th>WHR</th>
                    <th>% MG</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {[...allEntries].reverse().map((e) => {
                    const rowWhr = e.waistCm && e.hipCm ? calcWaistHipRatio(e.waistCm, e.hipCm) : null
                    const rowBf = calcBodyFatNavy({
                      gender: athlete?.gender,
                      heightCm: athlete?.heightCm,
                      neckCm: e.neckCm,
                      waistCm: e.waistCm,
                      hipCm: e.hipCm,
                    })
                    return (
                      <tr key={e.id}>
                        <td>{fmtDate(e.date)}</td>
                        {MEASUREMENT_GUIDE.map((g) => (
                          <td key={g.key}>{e[g.key] != null ? `${e[g.key]} cm` : '—'}</td>
                        ))}
                        <td>{rowWhr != null ? rowWhr.toFixed(2) : '—'}</td>
                        <td>{rowBf != null ? `${rowBf.toFixed(1)}%` : '—'}</td>
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
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {editEntry && (
        <div className="wp-modal-overlay" onClick={() => setEditEntry(null)}>
          <div className="wp-modal bm-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="wp-modal__title">Editar medição</h3>
            <form onSubmit={handleEditSave} className="wp-add-form">
              <div className="wp-field">
                <label className="wp-field__label">Data</label>
                <input type="date" className="wp-field__input" value={editDate}
                  onChange={(e) => setEditDate(e.target.value)} required />
              </div>
              <MeasurementFields values={editFields} onChange={(key, val) => setEditFields((prev) => ({ ...prev, [key]: val }))} />
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
