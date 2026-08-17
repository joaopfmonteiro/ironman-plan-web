import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { plansApi } from '../../api/plans'
import { workoutTemplatesApi } from '../../api/workoutTemplates'
import type { SessionExercise, SessionResponse, WorkoutTemplate } from '../../types'
import { toLocalISODate } from '../../utils/date'
import { ExercisePicker } from '../../components/ExercisePicker'
import { RmHint } from '../../components/RmHint'
import type { StrengthSuggestion } from '../../utils/strengthScheme'
import './SessionFormPage.css'

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

const FOCUS_TYPES = [
  { value: 'GENERAL',     label: 'Geral' },
  { value: 'HYPERTROPHY', label: 'Hipertrofia' },
  { value: 'POWER',       label: 'Força máxima' },
  { value: 'FUNCTIONAL',  label: 'Funcional' },
  { value: 'CIRCUIT',     label: 'Circuito' },
  { value: 'PLYOMETRIC',  label: 'Pliometria' },
  { value: 'EXPLOSIVE',   label: 'Explosão' },
  { value: 'VO2MAX',      label: 'VO2 Max' },
  { value: 'Z2',          label: 'Z2 — Base aeróbica' },
  { value: 'THRESHOLD',   label: 'Limiar' },
  { value: 'RECOVERY',    label: 'Recuperação ativa' },
  { value: 'TECHNIQUE',   label: 'Técnica' },
  { value: 'SPRINT',      label: 'Sprint' },
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

const today = () => toLocalISODate()
const emptyExercise = (): SessionExercise => ({ exerciseId: undefined, name: '', sets: undefined, reps: undefined, weightKg: undefined })
const emptyForm = () => ({
  date: today(), workoutType: 'RUN', title: '', description: '',
  warmUp: '', mainSet: '', coolDown: '', notes: '',
  plannedDurationMinutes: '', plannedDistanceKm: '', intensityZone: '', strengthType: '',
})

// Rows without a catalog exerciseId are silently dropped on save (backend requires a real exercise).
// If the row has data but no catalog match, warn instead of losing it silently.
const findUnmatchedExerciseIdx = (exercises: SessionExercise[]) =>
  exercises.findIndex(ex => ex.exerciseId === undefined && (ex.sets !== undefined || ex.reps !== undefined || ex.weightKg !== undefined))

export function SessionFormPage() {
  const { id: planIdParam, sessionId: sessionIdParam } = useParams<{ id: string; sessionId?: string }>()
  const planId = Number(planIdParam)
  const sessionId = sessionIdParam ? Number(sessionIdParam) : null
  const [searchParams] = useSearchParams()
  const microIdFromQuery = searchParams.get('microId')
  const microId = microIdFromQuery ? Number(microIdFromQuery) : null
  const navigate = useNavigate()
  const goBack = () => navigate(`/plans/${planId}`)

  const [editSession, setEditSession] = useState<SessionResponse | null>(null)
  const [loadingSession, setLoadingSession] = useState(!!sessionId)

  const [form, setForm] = useState(emptyForm())
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
    workoutTemplatesApi.list().then(setTemplates).catch(() => {})
  }, [])

  useEffect(() => {
    if (!sessionId) {
      setEditSession(null)
      setForm(emptyForm())
      setExercises([emptyExercise()])
      return
    }
    setLoadingSession(true)
    plansApi.getSession(sessionId)
      .then((s) => {
        setEditSession(s)
        setForm({
          date: s.date,
          workoutType: s.workoutType,
          title: s.title,
          description: s.description || '',
          warmUp: s.warmUp || '',
          mainSet: s.mainSet || '',
          coolDown: s.coolDown || '',
          notes: s.notes || '',
          plannedDurationMinutes: s.plannedDurationMinutes?.toString() || '',
          plannedDistanceKm: s.plannedDistanceKm?.toString() || '',
          intensityZone: s.intensityZone || '',
          strengthType: s.strengthType || '',
        })
        setExercises(s.exercises?.length ? s.exercises : [emptyExercise()])
      })
      .finally(() => setLoadingSession(false))
  }, [sessionId])

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

  const isEndurance = ENDURANCE_TYPES.has(form.workoutType)
  const isStrength = STRENGTH_WORKOUT_TYPES.has(form.workoutType)
  const isSwim = form.workoutType === 'SWIM'

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
      setExercises(t.exercises.map(e => ({ exerciseId: e.exerciseId, name: e.name, sets: e.sets, reps: e.reps, weightKg: e.weightKg })))
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
    if (isStrength) {
      const idx = findUnmatchedExerciseIdx(exercises)
      if (idx !== -1) {
        alert(`Seleciona um exercício da lista para a linha ${idx + 1} — caso contrário não é guardado no template.`)
        return
      }
    }
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
        exercises: isStrength
          ? exercises
              .filter((ex): ex is SessionExercise & { exerciseId: number } => ex.exerciseId !== undefined)
              .map((ex, i) => ({ ...ex, orderIndex: i }))
          : [],
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
      idx === i ? { ...ex, [field]: field === 'notes' ? value : (value === '' ? undefined : Number(value)) } : ex
    ))
  }
  const selectEx = (i: number, exercise: { exerciseId: number; name: string }) => {
    setExercises((prev) => prev.map((ex, idx) => idx === i ? { ...ex, ...exercise } : ex))
  }
  const applySuggestion = (i: number, suggestion: StrengthSuggestion) => {
    setExercises((prev) => prev.map((ex, idx) => idx === i ? { ...ex, ...suggestion } : ex))
  }
  const addEx = () => setExercises((prev) => [...prev, emptyExercise()])
  const removeEx = (i: number) => setExercises((prev) => prev.filter((_, idx) => idx !== i))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isStrength) {
      const idx = findUnmatchedExerciseIdx(exercises)
      if (idx !== -1) {
        alert(`Seleciona um exercício da lista para a linha ${idx + 1} — caso contrário não fica guardado na sessão.`)
        return
      }
    }
    setSaving(true)
    const effectiveMicroId = editSession?.microcycleId ?? microId
    try {
      const payload = {
        date: form.date,
        workoutType: form.workoutType,
        title: form.title,
        // Fields belonging to the "other" layout are actively cleared (not just omitted) so
        // switching a session's type away from SWIM — or into it — can't leave orphaned data
        // from the previous layout sitting invisibly in the DB.
        description: isSwim ? '' : (form.description || undefined),
        warmUp: isSwim ? (form.warmUp || undefined) : '',
        mainSet: isSwim ? (form.mainSet || undefined) : '',
        coolDown: isSwim ? (form.coolDown || undefined) : '',
        notes: isSwim ? (form.notes || undefined) : '',
        plannedDurationMinutes: form.plannedDurationMinutes ? Number(form.plannedDurationMinutes) : undefined,
        plannedDistanceKm: form.plannedDistanceKm ? Number(form.plannedDistanceKm) : undefined,
        intensityZone: form.intensityZone || undefined,
        strengthType: form.strengthType || undefined,
        exercises: isStrength
          ? exercises.filter((ex): ex is SessionExercise & { exerciseId: number } => ex.exerciseId !== undefined)
          : [],
      }
      if (editSession) {
        await plansApi.updateSession(editSession.id, payload)
      } else if (effectiveMicroId) {
        await plansApi.createSession(effectiveMicroId, payload)
      }
      goBack()
    } finally {
      setSaving(false)
    }
  }

  if (loadingSession) {
    return (
      <div className="sfp-loading">
        <div className="sfp-spinner" />
      </div>
    )
  }

  return (
    <div className="sfp-page">
      <div className="sfp-header">
        <button onClick={goBack} className="sfp-back-btn" aria-label="Voltar">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h1 className="sfp-title">{editSession ? 'Editar Sessão' : 'Nova Sessão'}</h1>

        {/* Template loader */}
        <div className="sfp-tpl-wrap" ref={templateDropRef}>
          <button
            type="button"
            className="sfp-tpl-btn"
            onClick={() => setShowTemplates((v) => !v)}
            title="Carregar template"
          >
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h8" />
            </svg>
            Templates
          </button>
          {showTemplates && (
            <div className="sfp-tpl-dropdown">
              {templates.length === 0 ? (
                <p className="sfp-tpl-empty">Sem templates guardados</p>
              ) : (
                templates.map((t) => (
                  <div key={t.id} className="sfp-tpl-item" onClick={() => applyTemplate(t)}>
                    <div className="sfp-tpl-item-info">
                      <span className="sfp-tpl-item-name">{t.name}</span>
                      <span className="sfp-tpl-item-type">{t.workoutType}{t.exercises?.length ? ` · ${t.exercises.length} ex.` : ''}</span>
                    </div>
                    <button
                      type="button"
                      className="sfp-tpl-delete"
                      onClick={(e) => deleteTemplate(t.id, e)}
                      title="Eliminar template"
                    >×</button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="sfp-form">
        {/* Row 1: data + tipo */}
        <div className="sfp-row">
          <div className="sfp-field">
            <label className="sfp-label">Data *</label>
            <input type="date" className="sfp-input" value={form.date} onChange={setF('date')} required />
          </div>
          <div className="sfp-field">
            <label className="sfp-label">Tipo de treino</label>
            <select className="sfp-input sfp-select" value={form.workoutType} onChange={setF('workoutType')}>
              {WORKOUT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="sfp-field">
          <label className="sfp-label">Título *</label>
          <input
            className="sfp-input"
            value={form.title}
            onChange={setF('title')}
            placeholder={isStrength ? 'Ex: Push day — peito e tríceps' : 'Ex: Corrida longa Z2'}
            required
          />
        </div>

        {isSwim ? (
          <div className="sfp-swim-fields">
            <div className="sfp-field">
              <label className="sfp-label">Aquecimento</label>
              <textarea
                className="sfp-input sfp-textarea"
                value={form.warmUp}
                onChange={setF('warmUp')}
                rows={2}
                placeholder="Ex: 300 liv. + 100 costas. Técnica: 4x50 sculling frontal, 4x50 punho fechado..."
              />
            </div>
            <div className="sfp-field">
              <label className="sfp-label">Parte fundamental</label>
              <textarea
                className="sfp-input sfp-textarea"
                value={form.mainSet}
                onChange={setF('mainSet')}
                rows={3}
                placeholder="Ex: Aeróbio: 4x200 Z2 (CSS+8–14s) cotovelo alto, 30s. 4x25 rápido técnica perfeita, 40s."
              />
            </div>
            <div className="sfp-field">
              <label className="sfp-label">Retorno à calma</label>
              <textarea
                className="sfp-input sfp-textarea"
                value={form.coolDown}
                onChange={setF('coolDown')}
                rows={2}
                placeholder="Ex: Calma 200."
              />
            </div>
            <div className="sfp-field">
              <label className="sfp-label">Notas</label>
              <textarea
                className="sfp-input sfp-textarea"
                value={form.notes}
                onChange={setF('notes')}
                rows={2}
                placeholder="Notas adicionais..."
              />
            </div>
          </div>
        ) : (
          <div className="sfp-field">
            <label className="sfp-label">Descrição (opcional)</label>
            <textarea
              className="sfp-input sfp-textarea"
              value={form.description}
              onChange={setF('description')}
              rows={2}
              placeholder={isStrength ? 'Notas gerais, aquecimento, etc.' : 'Detalhes do treino...'}
            />
          </div>
        )}

        {isEndurance && (
          <div className="sfp-row sfp-row--3">
            <div className="sfp-field">
              <label className="sfp-label">Duração (min)</label>
              <input type="number" className="sfp-input" value={form.plannedDurationMinutes} onChange={setF('plannedDurationMinutes')} min="0" placeholder="60" />
            </div>
            <div className="sfp-field">
              <label className="sfp-label">Distância (km)</label>
              <input type="number" className="sfp-input" value={form.plannedDistanceKm} onChange={setF('plannedDistanceKm')} step="0.1" min="0" placeholder="10" />
            </div>
            <div className="sfp-field">
              <label className="sfp-label">Zona</label>
              <select className="sfp-input sfp-select" value={form.intensityZone} onChange={setF('intensityZone')}>
                <option value="">—</option>
                {INTENSITY_ZONES.map((z) => (<option key={z.value} value={z.value}>{z.label}</option>))}
              </select>
            </div>
          </div>
        )}

        {form.workoutType !== 'REST' && (
          <div className="sfp-field">
            <label className="sfp-label">Subtipo</label>
            <select className="sfp-input sfp-select" value={form.strengthType} onChange={setF('strengthType')}>
              <option value="">—</option>
              {FOCUS_TYPES.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
            </select>
          </div>
        )}

        {isStrength && (
          <>
            <div className="sfp-field">
              <label className="sfp-label">Duração estimada (min)</label>
              <input type="number" className="sfp-input" value={form.plannedDurationMinutes} onChange={setF('plannedDurationMinutes')} min="0" placeholder="60" />
            </div>

            <div className="sfp-exercises">
              <div className="sfp-exercises-header">
                <span className="sfp-label">Exercícios</span>
                <button type="button" className="sfp-add-ex" onClick={addEx}>+ Adicionar</button>
              </div>
              <div className="sfp-ex-list">
                <div className="sfp-ex-cols-header">
                  <span>Exercício</span>
                  <span>Séries</span>
                  <span>Reps</span>
                  <span>Carga (kg)</span>
                  <span />
                </div>
                {exercises.map((ex, i) => (
                  <div key={i} className="sfp-ex-item">
                    <div className="sfp-ex-row">
                      <ExercisePicker
                        className="sfp-ex-name"
                        name={ex.name}
                        onSelect={(exercise) => selectEx(i, exercise)}
                      />
                      <input className="sfp-input sfp-ex-num" type="number" placeholder="4" min="1" value={ex.sets ?? ''} onChange={(e) => updateEx(i, 'sets', e.target.value)} />
                      <input className="sfp-input sfp-ex-num" type="number" placeholder="10" min="1" value={ex.reps ?? ''} onChange={(e) => updateEx(i, 'reps', e.target.value)} />
                      <input className="sfp-input sfp-ex-num" type="number" placeholder="80" min="0" step="0.5" value={ex.weightKg ?? ''} onChange={(e) => updateEx(i, 'weightKg', e.target.value)} />
                      <button type="button" className="sfp-ex-remove" onClick={() => removeEx(i)} disabled={exercises.length === 1} aria-label="Remover">×</button>
                    </div>
                    <RmHint exerciseId={ex.exerciseId} strengthType={form.strengthType} onApply={(s) => applySuggestion(i, s)} />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Save as template */}
        {!showSaveTemplate ? (
          <button type="button" className="sfp-save-tpl-link" onClick={() => { setTemplateName(form.title); setShowSaveTemplate(true) }}>
            Guardar como template
          </button>
        ) : (
          <div className="sfp-save-tpl-row">
            <input
              className="sfp-input"
              placeholder="Nome do template"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              autoFocus
            />
            <button type="button" className="sfp-btn sfp-btn--primary sfp-btn--sm" onClick={handleSaveTemplate} disabled={savingTemplate || !templateName.trim()}>
              {savingTemplate ? '...' : 'Guardar'}
            </button>
            <button type="button" className="sfp-btn sfp-btn--secondary sfp-btn--sm" onClick={() => setShowSaveTemplate(false)}>
              Cancelar
            </button>
          </div>
        )}

        <div className="sfp-actions">
          <button type="button" className="sfp-btn sfp-btn--secondary" onClick={goBack}>Cancelar</button>
          <button type="submit" className="sfp-btn sfp-btn--primary" disabled={saving}>
            {saving ? 'A guardar...' : editSession ? 'Guardar' : 'Criar sessão'}
          </button>
        </div>
      </form>
    </div>
  )
}
