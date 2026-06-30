import { useEffect, useRef, useState } from 'react'
import { plansApi } from '../../api/plans'
import { workoutTemplatesApi } from '../../api/workoutTemplates'
import type { SessionExercise, SessionResponse, WorkoutTemplate } from '../../types'
import './SessionModal.css'

const WORKOUT_TYPES = [
  { value: 'SWIM',     label: '🏊 Natação' },
  { value: 'BIKE',     label: '🚴 Ciclismo' },
  { value: 'RUN',      label: '🏃 Corrida' },
  { value: 'BRICK',    label: '🧱 Brick' },
  { value: 'STRENGTH', label: '💪 Força' },
  { value: 'HYROX',   label: '🔥 HYROX' },
  { value: 'CROSSFIT', label: '⚡ CrossFit' },
  { value: 'REST',     label: '😴 Descanso' },
]

const STRENGTH_TYPES = [
  { value: 'GENERAL',     label: 'Geral' },
  { value: 'HYPERTROPHY', label: 'Hipertrofia' },
  { value: 'POWER',       label: 'Força máxima' },
  { value: 'FUNCTIONAL',  label: 'Funcional' },
  { value: 'CIRCUIT',     label: 'Circuito' },
]

const INTENSITY_ZONES = [
  { value: 'Z1', label: 'Z1 — Recuperação ativa' },
  { value: 'Z2', label: 'Z2 — Aeróbico base' },
  { value: 'Z3', label: 'Z3 — Tempo/Limiar' },
  { value: 'Z4', label: 'Z4 — VO₂max' },
  { value: 'Z5', label: 'Z5 — Anaeróbico' },
]

const ENDURANCE_TYPES = new Set(['SWIM', 'BIKE', 'RUN', 'BRICK'])
const STRENGTH_WORKOUT_TYPES = new Set(['STRENGTH', 'HYROX', 'CROSSFIT'])

const today = () => new Date().toISOString().slice(0, 10)
const emptyExercise = (): SessionExercise => ({ name: '', sets: undefined, reps: undefined, weightKg: undefined })

interface Props {
  open: boolean
  microId: number | null
  editSession: SessionResponse | null
  onClose: () => void
  onSaved: (microId: number, sessions: SessionResponse[]) => void
}

export function SessionModal({ open, microId, editSession, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    date: today(), workoutType: 'RUN', title: '', description: '',
    plannedDurationMinutes: '', plannedDistanceKm: '', intensityZone: '', strengthType: '',
  })
  const [exercises, setExercises] = useState<SessionExercise[]>([emptyExercise()])
  const [saving, setSaving] = useState(false)

  // Template state
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const templateDropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      workoutTemplatesApi.list().then(setTemplates).catch(() => {})
      if (editSession) {
        setForm({
          date: editSession.date,
          workoutType: editSession.workoutType,
          title: editSession.title,
          description: editSession.description || '',
          plannedDurationMinutes: editSession.plannedDurationMinutes?.toString() || '',
          plannedDistanceKm: editSession.plannedDistanceKm?.toString() || '',
          intensityZone: editSession.intensityZone || '',
          strengthType: editSession.strengthType || '',
        })
        setExercises(editSession.exercises?.length ? editSession.exercises : [emptyExercise()])
      } else {
        setForm({ date: today(), workoutType: 'RUN', title: '', description: '', plannedDurationMinutes: '', plannedDistanceKm: '', intensityZone: '', strengthType: '' })
        setExercises([emptyExercise()])
      }
      setShowTemplates(false)
      setShowSaveTemplate(false)
      setTemplateName('')
    }
  }, [open, editSession])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Close template dropdown on outside click
  useEffect(() => {
    if (!showTemplates) return
    const handler = (e: MouseEvent) => {
      if (templateDropRef.current && !templateDropRef.current.contains(e.target as Node)) {
        setShowTemplates(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showTemplates])

  if (!open) return null

  const isEndurance = ENDURANCE_TYPES.has(form.workoutType)
  const isStrength = STRENGTH_WORKOUT_TYPES.has(form.workoutType)

  const setF = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))

  const applyTemplate = (t: WorkoutTemplate) => {
    setForm((f) => ({
      ...f,
      workoutType: t.workoutType,
      title: t.defaultTitle || f.title,
      description: t.description || f.description,
      plannedDurationMinutes: t.plannedDurationMinutes?.toString() || f.plannedDurationMinutes,
      plannedDistanceKm: t.plannedDistanceKm?.toString() || f.plannedDistanceKm,
      intensityZone: t.intensityZone || f.intensityZone,
      strengthType: t.strengthType || f.strengthType,
    }))
    if (t.exercises?.length) {
      setExercises(t.exercises.map(e => ({ name: e.name, sets: e.sets, reps: e.reps, weightKg: e.weightKg })))
    }
    setShowTemplates(false)
  }

  const deleteTemplate = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    await workoutTemplatesApi.delete(id)
    setTemplates((prev) => prev.filter(t => t.id !== id))
  }

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return
    setSavingTemplate(true)
    try {
      const t = await workoutTemplatesApi.save({
        name: templateName.trim(),
        workoutType: form.workoutType as any,
        strengthType: form.strengthType as any || undefined,
        defaultTitle: form.title || undefined,
        description: form.description || undefined,
        plannedDurationMinutes: form.plannedDurationMinutes ? Number(form.plannedDurationMinutes) : undefined,
        plannedDistanceKm: form.plannedDistanceKm ? Number(form.plannedDistanceKm) : undefined,
        intensityZone: form.intensityZone as any || undefined,
        exercises: isStrength ? exercises.filter(ex => ex.name.trim()).map((ex, i) => ({ ...ex, orderIndex: i })) : [],
      })
      setTemplates((prev) => [...prev, t].sort((a, b) => a.name.localeCompare(b.name)))
      setShowSaveTemplate(false)
      setTemplateName('')
    } finally {
      setSavingTemplate(false)
    }
  }

  // Exercise builder helpers
  const updateEx = (i: number, field: keyof SessionExercise, value: string) => {
    setExercises((prev) => prev.map((ex, idx) =>
      idx === i ? { ...ex, [field]: field === 'name' || field === 'notes' ? value : (value === '' ? undefined : Number(value)) } : ex
    ))
  }
  const addEx = () => setExercises((prev) => [...prev, emptyExercise()])
  const removeEx = (i: number) => setExercises((prev) => prev.filter((_, idx) => idx !== i))

  const handleClose = () => { setSaving(false); onClose() }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const effectiveMicroId = editSession?.microcycleId ?? microId
    try {
      const payload = {
        date: form.date,
        workoutType: form.workoutType,
        title: form.title,
        description: form.description || undefined,
        plannedDurationMinutes: form.plannedDurationMinutes ? Number(form.plannedDurationMinutes) : undefined,
        plannedDistanceKm: form.plannedDistanceKm ? Number(form.plannedDistanceKm) : undefined,
        intensityZone: form.intensityZone || undefined,
        strengthType: form.strengthType || undefined,
        exercises: isStrength ? exercises.filter((ex) => ex.name.trim()) : [],
      }
      if (editSession) {
        await plansApi.updateSession(editSession.id, payload)
      } else if (effectiveMicroId) {
        await plansApi.createSession(effectiveMicroId, payload)
      }
      if (effectiveMicroId) {
        const sessions = await plansApi.getSessions(effectiveMicroId)
        onClose()
        onSaved(effectiveMicroId, sessions)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sm-overlay" onClick={handleClose}>
      <div className="sm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sm-header">
          <h2 className="sm-title">{editSession ? 'Editar Sessão' : 'Nova Sessão'}</h2>
          <div className="sm-header-actions">
            {/* Template loader */}
            <div className="sm-tpl-wrap" ref={templateDropRef}>
              <button
                type="button"
                className="sm-tpl-btn"
                onClick={() => setShowTemplates((v) => !v)}
                title="Carregar template"
              >
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h8" />
                </svg>
                Templates
              </button>
              {showTemplates && (
                <div className="sm-tpl-dropdown">
                  {templates.length === 0 ? (
                    <p className="sm-tpl-empty">Sem templates guardados</p>
                  ) : (
                    templates.map((t) => (
                      <div key={t.id} className="sm-tpl-item" onClick={() => applyTemplate(t)}>
                        <div className="sm-tpl-item-info">
                          <span className="sm-tpl-item-name">{t.name}</span>
                          <span className="sm-tpl-item-type">{t.workoutType}{t.exercises?.length ? ` · ${t.exercises.length} ex.` : ''}</span>
                        </div>
                        <button
                          type="button"
                          className="sm-tpl-delete"
                          onClick={(e) => deleteTemplate(t.id, e)}
                          title="Eliminar template"
                        >×</button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <button className="sm-close" onClick={handleClose} aria-label="Fechar">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="sm-form">
          {/* Row 1: data + tipo */}
          <div className="sm-row">
            <div className="sm-field">
              <label className="sm-label">Data *</label>
              <input type="date" className="sm-input" value={form.date} onChange={setF('date')} required />
            </div>
            <div className="sm-field">
              <label className="sm-label">Tipo de treino</label>
              <select className="sm-input sm-select" value={form.workoutType} onChange={setF('workoutType')}>
                {WORKOUT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="sm-field">
            <label className="sm-label">Título *</label>
            <input
              className="sm-input"
              value={form.title}
              onChange={setF('title')}
              placeholder={isStrength ? 'Ex: Push day — peito e tríceps' : 'Ex: Corrida longa Z2'}
              required
            />
          </div>

          <div className="sm-field">
            <label className="sm-label">Descrição (opcional)</label>
            <textarea
              className="sm-input sm-textarea"
              value={form.description}
              onChange={setF('description')}
              rows={2}
              placeholder={isStrength ? 'Notas gerais, aquecimento, etc.' : 'Detalhes do treino...'}
            />
          </div>

          {isEndurance && (
            <div className="sm-row sm-row--3">
              <div className="sm-field">
                <label className="sm-label">Duração (min)</label>
                <input type="number" className="sm-input" value={form.plannedDurationMinutes} onChange={setF('plannedDurationMinutes')} min="0" placeholder="60" />
              </div>
              <div className="sm-field">
                <label className="sm-label">Distância (km)</label>
                <input type="number" className="sm-input" value={form.plannedDistanceKm} onChange={setF('plannedDistanceKm')} step="0.1" min="0" placeholder="10" />
              </div>
              <div className="sm-field">
                <label className="sm-label">Zona</label>
                <select className="sm-input sm-select" value={form.intensityZone} onChange={setF('intensityZone')}>
                  <option value="">—</option>
                  {INTENSITY_ZONES.map((z) => (<option key={z.value} value={z.value}>{z.label}</option>))}
                </select>
              </div>
            </div>
          )}

          {isStrength && (
            <>
              <div className="sm-row">
                <div className="sm-field">
                  <label className="sm-label">Duração estimada (min)</label>
                  <input type="number" className="sm-input" value={form.plannedDurationMinutes} onChange={setF('plannedDurationMinutes')} min="0" placeholder="60" />
                </div>
                {form.workoutType === 'STRENGTH' && (
                  <div className="sm-field">
                    <label className="sm-label">Subtipo</label>
                    <select className="sm-input sm-select" value={form.strengthType} onChange={setF('strengthType')}>
                      <option value="">—</option>
                      {STRENGTH_TYPES.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
                    </select>
                  </div>
                )}
              </div>

              <div className="sm-exercises">
                <div className="sm-exercises-header">
                  <span className="sm-label">Exercícios</span>
                  <button type="button" className="sm-add-ex" onClick={addEx}>+ Adicionar</button>
                </div>
                <div className="sm-ex-list">
                  <div className="sm-ex-cols-header">
                    <span>Exercício</span>
                    <span>Séries</span>
                    <span>Reps</span>
                    <span>Carga (kg)</span>
                    <span />
                  </div>
                  {exercises.map((ex, i) => (
                    <div key={i} className="sm-ex-row">
                      <input
                        className="sm-input sm-ex-name"
                        placeholder="Ex: Supino plano"
                        value={ex.name}
                        onChange={(e) => updateEx(i, 'name', e.target.value)}
                      />
                      <input className="sm-input sm-ex-num" type="number" placeholder="4" min="1" value={ex.sets ?? ''} onChange={(e) => updateEx(i, 'sets', e.target.value)} />
                      <input className="sm-input sm-ex-num" type="number" placeholder="10" min="1" value={ex.reps ?? ''} onChange={(e) => updateEx(i, 'reps', e.target.value)} />
                      <input className="sm-input sm-ex-num" type="number" placeholder="80" min="0" step="0.5" value={ex.weightKg ?? ''} onChange={(e) => updateEx(i, 'weightKg', e.target.value)} />
                      <button type="button" className="sm-ex-remove" onClick={() => removeEx(i)} disabled={exercises.length === 1} aria-label="Remover">×</button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Save as template */}
          {!showSaveTemplate ? (
            <button type="button" className="sm-save-tpl-link" onClick={() => { setTemplateName(form.title); setShowSaveTemplate(true) }}>
              Guardar como template
            </button>
          ) : (
            <div className="sm-save-tpl-row">
              <input
                className="sm-input"
                placeholder="Nome do template"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                autoFocus
              />
              <button type="button" className="sm-btn sm-btn--primary sm-btn--sm" onClick={handleSaveTemplate} disabled={savingTemplate || !templateName.trim()}>
                {savingTemplate ? '...' : 'Guardar'}
              </button>
              <button type="button" className="sm-btn sm-btn--secondary sm-btn--sm" onClick={() => setShowSaveTemplate(false)}>
                Cancelar
              </button>
            </div>
          )}

          <div className="sm-actions">
            <button type="button" className="sm-btn sm-btn--secondary" onClick={handleClose}>Cancelar</button>
            <button type="submit" className="sm-btn sm-btn--primary" disabled={saving}>
              {saving ? 'A guardar...' : editSession ? 'Guardar' : 'Criar sessão'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
