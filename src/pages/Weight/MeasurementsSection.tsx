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

type MeasurementKey = MeasurementGuideEntry['key']
type FieldValues = Record<MeasurementKey, string>

const EMPTY_FIELDS: FieldValues = {
  neckCm: '', chestCm: '', waistCm: '', hipCm: '', armCm: '', thighCm: '',
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
