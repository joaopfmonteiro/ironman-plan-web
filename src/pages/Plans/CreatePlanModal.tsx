import { useEffect, useState } from 'react'
import { plansApi } from '../../api/plans'
import type { RaceResponse } from '../../types'
import './CreatePlanModal.css'

interface Props {
  open: boolean
  races: RaceResponse[]
  onClose: () => void
  onCreated: () => void
}

export function CreatePlanModal({ open, races, onClose, onCreated }: Props) {
  const [form, setForm] = useState({ name: '', description: '', startDate: new Date().toISOString().slice(0, 10), endDate: '', targetRaceId: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const setF = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleClose = () => {
    setForm({ name: '', description: '', startDate: new Date().toISOString().slice(0, 10), endDate: '', targetRaceId: '' })
    onClose()
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await plansApi.create({
        name: form.name,
        description: form.description || undefined,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        targetRaceId: form.targetRaceId ? Number(form.targetRaceId) : undefined,
      })
      handleClose()
      onCreated()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="cpm-overlay" onClick={handleClose}>
      <div className="cpm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cpm-header">
          <h2 className="cpm-title">Novo Plano de Treino</h2>
          <button className="cpm-close" onClick={handleClose} aria-label="Fechar">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="cpm-form">
          <div className="cpm-field">
            <label className="cpm-label">Nome *</label>
            <input
              className="cpm-input"
              value={form.name}
              onChange={setF('name')}
              placeholder="Preparação Ironman 2027"
              required
            />
          </div>

          <div className="cpm-field">
            <label className="cpm-label">Descrição (opcional)</label>
            <textarea
              className="cpm-input cpm-textarea"
              value={form.description}
              onChange={setF('description')}
              placeholder="Descrição breve do plano..."
              rows={2}
            />
          </div>

          <div className="cpm-row">
            <div className="cpm-field">
              <label className="cpm-label">Data de início *</label>
              <input type="date" className="cpm-input" value={form.startDate} onChange={setF('startDate')} required />
            </div>
            <div className="cpm-field">
              <label className="cpm-label">Data de fim (opcional)</label>
              <input type="date" className="cpm-input" value={form.endDate} onChange={setF('endDate')} />
            </div>
          </div>

          {races.length > 0 && (
            <div className="cpm-field">
              <label className="cpm-label">Prova alvo (opcional)</label>
              <select className="cpm-input cpm-select" value={form.targetRaceId} onChange={setF('targetRaceId')}>
                <option value="">Selecionar prova...</option>
                {races.map((r) => (
                  <option key={r.id} value={String(r.id)}>
                    {r.name} — {new Date(r.date).toLocaleDateString('pt-PT')}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="cpm-actions">
            <button type="button" className="cpm-btn cpm-btn--secondary" onClick={handleClose}>
              Cancelar
            </button>
            <button type="submit" className="cpm-btn cpm-btn--primary" disabled={saving}>
              {saving ? 'A criar...' : 'Criar plano'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
