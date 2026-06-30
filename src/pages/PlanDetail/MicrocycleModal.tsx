import { useEffect, useState } from 'react'
import { plansApi } from '../../api/plans'
import type { MicrocycleResponse } from '../../types'
import './MicrocycleModal.css'

const MICRO_FOCUS = [
  { value: 'VOLUME',    label: 'Volume' },
  { value: 'INTENSITY', label: 'Intensidade' },
  { value: 'RECOVERY',  label: 'Recuperação' },
  { value: 'TEST',      label: 'Teste' },
]

const today = () => new Date().toISOString().slice(0, 10)

interface Props {
  open: boolean
  macroId: number | null
  editMicro: MicrocycleResponse | null
  macroStartDate?: string
  macroEndDate?: string
  siblingMicros?: MicrocycleResponse[]
  onClose: () => void
  onSaved: () => void
}

function addDay(dateStr: string): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

export function MicrocycleModal({ open, macroId, editMicro, macroStartDate, macroEndDate, siblingMicros = [], onClose, onSaved }: Props) {
  const latestSiblingEnd = siblingMicros.length
    ? siblingMicros.reduce((max, m) => m.endDate > max ? m.endDate : max, '')
    : null
  const minStart = latestSiblingEnd ? addDay(latestSiblingEnd) : (macroStartDate ?? today())

  const [form, setForm] = useState({ weekNumber: '', startDate: minStart, endDate: '', focus: 'VOLUME', totalPlannedHours: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      if (editMicro) {
        setForm({
          weekNumber: String(editMicro.weekNumber),
          startDate: editMicro.startDate,
          endDate: editMicro.endDate,
          focus: editMicro.focus || 'VOLUME',
          totalPlannedHours: editMicro.totalPlannedHours?.toString() || '',
        })
      } else {
        setForm({ weekNumber: '', startDate: minStart, endDate: '', focus: 'VOLUME', totalPlannedHours: '' })
      }
    }
  }, [open, editMicro])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const setF = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleClose = () => { setSaving(false); onClose() }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        weekNumber: Number(form.weekNumber),
        startDate: form.startDate,
        endDate: form.endDate,
        focus: form.focus || undefined,
        totalPlannedHours: form.totalPlannedHours ? Number(form.totalPlannedHours) : undefined,
      }
      if (editMicro) {
        await plansApi.updateMicrocycle(editMicro.id, payload)
      } else if (macroId) {
        await plansApi.createMicrocycle(macroId, payload)
      }
      onClose()
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mim-overlay" onClick={handleClose}>
      <div className="mim-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mim-header">
          <h2 className="mim-title">{editMicro ? 'Editar Microciclo' : 'Novo Microciclo'}</h2>
          <button className="mim-close" onClick={handleClose} aria-label="Fechar">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="mim-form">
          <div className="mim-row">
            <div className="mim-field">
              <label className="mim-label">Semana nº *</label>
              <input
                type="number"
                className="mim-input"
                value={form.weekNumber}
                onChange={setF('weekNumber')}
                min="1"
                placeholder="1"
                required
              />
            </div>
            <div className="mim-field">
              <label className="mim-label">Foco</label>
              <select className="mim-input mim-select" value={form.focus} onChange={setF('focus')}>
                {MICRO_FOCUS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mim-row">
            <div className="mim-field">
              <label className="mim-label">Início *</label>
              <input
                type="date"
                className="mim-input"
                value={form.startDate}
                onChange={setF('startDate')}
                min={macroStartDate}
                max={macroEndDate}
                required
              />
            </div>
            <div className="mim-field">
              <label className="mim-label">Fim *</label>
              <input
                type="date"
                className="mim-input"
                value={form.endDate}
                onChange={setF('endDate')}
                min={form.startDate || macroStartDate}
                max={macroEndDate}
                required
              />
            </div>
          </div>
          {latestSiblingEnd ? (
            <p className="mim-hint">
              Semana anterior termina em <strong>{latestSiblingEnd}</strong> — início mínimo: <strong>{minStart}</strong>
            </p>
          ) : macroStartDate && macroEndDate ? (
            <p className="mim-hint">
              Macrociclo: {macroStartDate} → {macroEndDate}
            </p>
          ) : null}

          <div className="mim-field">
            <label className="mim-label">Horas planeadas (opcional)</label>
            <input
              type="number"
              className="mim-input"
              value={form.totalPlannedHours}
              onChange={setF('totalPlannedHours')}
              step="0.5"
              min="0"
              placeholder="Ex: 10"
            />
          </div>

          <div className="mim-actions">
            <button type="button" className="mim-btn mim-btn--secondary" onClick={handleClose}>
              Cancelar
            </button>
            <button type="submit" className="mim-btn mim-btn--primary" disabled={saving}>
              {saving ? 'A guardar...' : editMicro ? 'Guardar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
