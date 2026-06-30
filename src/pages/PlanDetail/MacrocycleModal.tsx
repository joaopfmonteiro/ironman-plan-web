import { useEffect, useState } from 'react'
import { plansApi } from '../../api/plans'
import type { MacrocycleResponse } from '../../types'
import './MacrocycleModal.css'

const MACRO_TYPES = [
  { value: 'BASE',     label: 'Base' },
  { value: 'BUILD',    label: 'Construção' },
  { value: 'PEAK',     label: 'Pico' },
  { value: 'RACE',     label: 'Prova' },
  { value: 'RECOVERY', label: 'Recuperação' },
]

const today = () => new Date().toISOString().slice(0, 10)

interface Props {
  open: boolean
  planId: number
  editMacro: MacrocycleResponse | null
  onClose: () => void
  onSaved: () => void
}

export function MacrocycleModal({ open, planId, editMacro, onClose, onSaved }: Props) {
  const [form, setForm] = useState({ name: '', type: 'BASE', startDate: today(), endDate: '', goals: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      if (editMacro) {
        setForm({ name: editMacro.name, type: editMacro.type, startDate: editMacro.startDate, endDate: editMacro.endDate, goals: editMacro.goals || '' })
      } else {
        setForm({ name: '', type: 'BASE', startDate: today(), endDate: '', goals: '' })
      }
    }
  }, [open, editMacro])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const setF = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleClose = () => { setSaving(false); onClose() }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editMacro) {
        await plansApi.updateMacrocycle(editMacro.id, form)
      } else {
        await plansApi.createMacrocycle(planId, form)
      }
      onClose()
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mcm-overlay" onClick={handleClose}>
      <div className="mcm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mcm-header">
          <h2 className="mcm-title">{editMacro ? 'Editar Macrociclo' : 'Novo Macrociclo'}</h2>
          <button className="mcm-close" onClick={handleClose} aria-label="Fechar">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="mcm-form">
          <div className="mcm-field">
            <label className="mcm-label">Nome *</label>
            <input className="mcm-input" value={form.name} onChange={setF('name')} placeholder="Base 1" required />
          </div>

          <div className="mcm-field">
            <label className="mcm-label">Tipo</label>
            <select className="mcm-input mcm-select" value={form.type} onChange={setF('type')}>
              {MACRO_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="mcm-row">
            <div className="mcm-field">
              <label className="mcm-label">Início *</label>
              <input type="date" className="mcm-input" value={form.startDate} onChange={setF('startDate')} required />
            </div>
            <div className="mcm-field">
              <label className="mcm-label">Fim *</label>
              <input type="date" className="mcm-input" value={form.endDate} onChange={setF('endDate')} required />
            </div>
          </div>

          <div className="mcm-field">
            <label className="mcm-label">Objetivos (opcional)</label>
            <textarea
              className="mcm-input mcm-textarea"
              value={form.goals}
              onChange={setF('goals')}
              rows={2}
              placeholder="Ex: Desenvolver base aeróbica..."
            />
          </div>

          <div className="mcm-actions">
            <button type="button" className="mcm-btn mcm-btn--secondary" onClick={handleClose}>
              Cancelar
            </button>
            <button type="submit" className="mcm-btn mcm-btn--primary" disabled={saving}>
              {saving ? 'A guardar...' : editMacro ? 'Guardar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
