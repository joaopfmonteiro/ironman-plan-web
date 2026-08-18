import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { plansApi } from '../../api/plans'
import { workoutTemplatesApi } from '../../api/workoutTemplates'
import type { MicrocycleResponse, SessionExercise, SessionResponse, WorkoutTemplate } from '../../types'
import { toLocalISODate } from '../../utils/date'
import { ExercisePicker } from '../../components/ExercisePicker'
import { RmHint } from '../../components/RmHint'
import type { StrengthSuggestion } from '../../utils/strengthScheme'
import '../SessionForm/SessionFormPage.css'
import './SessionCreatePage.css'

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

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

const ENDURANCE_TYPES = new Set(['SWIM', 'BIKE', 'RUN', 'BRICK'])
const STRENGTH_WORKOUT_TYPES = new Set(['STRENGTH', 'HYROX', 'CROSSFIT'])

const emptyExercise = (): SessionExercise => ({ exerciseId: undefined, name: '', sets: undefined, reps: undefined, weightKg: undefined })
const emptyForm = () => ({
  workoutType: 'RUN', title: '', description: '',
  warmUp: '', mainSet: '', coolDown: '', notes: '',
  plannedDurationMinutes: '', plannedDistanceKm: '', intensityZone: '', strengthType: '',
})

// Rows without a catalog exerciseId are silently dropped on save (backend requires a real exercise).
// If the row has data but no catalog match, warn instead of losing it silently.
const findUnmatchedExerciseIdx = (exercises: SessionExercise[]) =>
  exercises.findIndex(ex => ex.exerciseId === undefined && (ex.sets !== undefined || ex.reps !== undefined || ex.weightKg !== undefined))

/** Day-of-week index Monday=0 … Sunday=6 */
const dow = (d: Date) => (d.getDay() + 6) % 7

/** All days in [startISO, endISO] inclusive */
function daysInRange(startISO: string, endISO: string): Date[] {
  const result: Date[] = []
  const cur = new Date(startISO + 'T00:00:00')
  const end = new Date(endISO + 'T00:00:00')
  while (cur <= end) {
    result.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return result
}

/** Group days into week rows (Mon=0..Sun=6), padding with nulls */
function toWeeks(days: Date[]): (Date | null)[][] {
  if (!days.length) return []
  const weeks: (Date | null)[][] = []
  let week: (Date | null)[] = Array(dow(days[0])).fill(null)
  for (const d of days) {
    week.push(d)
    if (week.length === 7) { weeks.push(week); week = [] }
  }
  if (week.length) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }
  return weeks
}

interface Scope {
  isMacro: boolean
  macroName?: string
  rangeStart: string
  rangeEnd: string
  microsInScope: MicrocycleResponse[]
}

export function SessionCreatePage() {
  const { id: planIdParam } = useParams<{ id: string }>()
  const planId = Number(planIdParam)
  const [searchParams] = useSearchParams()
  const microIdParam = searchParams.get('microId')
  const macroIdParam = searchParams.get('macroId')
  const navigate = useNavigate()
  const goBack = () => navigate(`/plans/${planId}`)

  const [scope, setScope] = useState<Scope | null>(null)
  const [existingSessions, setExistingSessions] = useState<SessionResponse[]>([])
  const [loadingScope, setLoadingScope] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [form, setForm] = useState(emptyForm())
  const [exercises, setExercises] = useState<SessionExercise[]>([emptyExercise()])
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set())
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
    setLoadingScope(true)
    plansApi.get(planId).then(async (plan) => {
      if (macroIdParam) {
        const macroId = Number(macroIdParam)
        const macro = plan.macrocycles.find((m) => m.id === macroId)
        if (!macro) { setNotFound(true); return }
        setScope({
          isMacro: true,
          macroName: macro.name,
          rangeStart: macro.startDate,
          rangeEnd: macro.endDate,
          microsInScope: macro.microcycles,
        })
        const lists = await Promise.all(macro.microcycles.map((m) => plansApi.getSessions(m.id)))
        setExistingSessions(lists.flat())
      } else if (microIdParam) {
        const microId = Number(microIdParam)
        const micro = plan.macrocycles.flatMap((m) => m.microcycles).find((m) => m.id === microId)
        if (!micro) { setNotFound(true); return }
        setScope({
          isMacro: false,
          rangeStart: micro.startDate,
          rangeEnd: micro.endDate,
          microsInScope: [micro],
        })
        setExistingSessions(await plansApi.getSessions(micro.id))
      } else {
        setNotFound(true)
      }
    }).finally(() => setLoadingScope(false))
  }, [planId, microIdParam, macroIdParam])

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

  const existingDates = new Set(existingSessions.map((s) => s.date))
  const days = scope ? daysInRange(scope.rangeStart, scope.rangeEnd) : []
  const weeks = toWeeks(days)
  const microForDate = (iso: string) => scope?.microsInScope.find((m) => iso >= m.startDate && iso <= m.endDate)

  const toggleDay = (iso: string) => {
    if (!microForDate(iso)) return
    setSelectedDays((prev) => {
      const next = new Set(prev)
      next.has(iso) ? next.delete(iso) : next.add(iso)
      return next
    })
  }

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

  const dayLabel = (d: Date) => d.getDate()
  const rangeLabel = () => {
    if (!scope) return ''
    const fmt = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' })
    const startLabel = fmt(scope.rangeStart)
    const endLabel = fmt(scope.rangeEnd)
    return startLabel === endLabel ? startLabel : `${startLabel} → ${endLabel}`
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scope || !selectedDays.size || !form.title) return
    if (isStrength) {
      const idx = findUnmatchedExerciseIdx(exercises)
      if (idx !== -1) {
        alert(`Seleciona um exercício da lista para a linha ${idx + 1} — caso contrário não fica guardado na sessão.`)
        return
      }
    }
    setSaving(true)
    try {
      const payload = {
        dates: Array.from(selectedDays).sort(),
        workoutType: form.workoutType,
        title: form.title,
        description: isSwim ? undefined : (form.description || undefined),
        warmUp: isSwim ? (form.warmUp || undefined) : undefined,
        mainSet: isSwim ? (form.mainSet || undefined) : undefined,
        coolDown: isSwim ? (form.coolDown || undefined) : undefined,
        notes: isSwim ? (form.notes || undefined) : undefined,
        plannedDurationMinutes: form.plannedDurationMinutes ? Number(form.plannedDurationMinutes) : undefined,
        plannedDistanceKm: form.plannedDistanceKm ? Number(form.plannedDistanceKm) : undefined,
        intensityZone: form.intensityZone || undefined,
        strengthType: form.strengthType || undefined,
        exercises: isStrength
          ? exercises.filter((ex): ex is SessionExercise & { exerciseId: number } => ex.exerciseId !== undefined)
          : [],
      }
      if (scope.isMacro) {
        const macroId = Number(macroIdParam)
        const res = await plansApi.bulkCreateSessionsForMacro(macroId, payload)
        if (res.skippedDates.length > 0) {
          alert(`${res.skippedDates.length} data(s) ignorada(s) por não estarem dentro de nenhuma semana criada.`)
        }
      } else {
        const microId = Number(microIdParam)
        await plansApi.bulkCreateSessions(microId, payload)
      }
      goBack()
    } finally {
      setSaving(false)
    }
  }

  if (loadingScope) {
    return (
      <div className="sfp-loading">
        <div className="sfp-spinner" />
      </div>
    )
  }

  if (notFound || !scope) {
    return (
      <div className="sfp-page">
        <p>Semana ou macrociclo não encontrado.</p>
        <button className="sfp-btn sfp-btn--secondary" onClick={goBack}>Voltar</button>
      </div>
    )
  }

  return (
    <div className="sfp-page scp-page">
      <div className="sfp-header">
        <button onClick={goBack} className="sfp-back-btn" aria-label="Voltar">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h1 className="sfp-title">{scope.isMacro ? `Repetir sessão — ${scope.macroName}` : 'Nova Sessão'}</h1>

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

      <form onSubmit={handleCreate} className="sfp-form">
        <div className="sfp-field">
          <label className="sfp-label">Tipo de treino</label>
          <select className="sfp-input sfp-select" value={form.workoutType} onChange={setF('workoutType')}>
            {WORKOUT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
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

        {/* Calendar day picker */}
        <div className="scp-calendar">
          <p className="sfp-label">Dias *</p>
          <div className="scp-cal-title">
            {rangeLabel()}
            {!scope.isMacro && <span className="scp-cal-range"> · Sem {scope.microsInScope[0]?.weekNumber}</span>}
          </div>

          {scope.microsInScope.length === 0 ? (
            <p className="scp-cal-empty">Ainda não há semanas criadas neste macrociclo. Gera semanas primeiro.</p>
          ) : (
            <>
              <div className="scp-cal-grid">
                {DAY_LABELS.map((l) => (
                  <div key={l} className="scp-cal-day-label">{l}</div>
                ))}
                {weeks.map((week, wi) =>
                  week.map((day, di) => {
                    if (!day) return <div key={`e-${wi}-${di}`} className="scp-cal-cell scp-cal-cell--empty" />
                    const iso = toLocalISODate(day)
                    const inScope = !!microForDate(iso)
                    const selected = selectedDays.has(iso)
                    const hasSession = existingDates.has(iso)
                    return (
                      <button
                        key={iso}
                        type="button"
                        className={`scp-cal-cell ${selected ? 'scp-cal-cell--selected' : ''} ${hasSession ? 'scp-cal-cell--has-session' : ''} ${!inScope ? 'scp-cal-cell--disabled' : ''}`}
                        onClick={() => toggleDay(iso)}
                        disabled={!inScope}
                        title={!inScope ? 'Cria a semana primeiro' : hasSession ? 'Já tem sessão' : undefined}
                      >
                        <span className="scp-cal-num">{dayLabel(day)}</span>
                        {hasSession && <span className="scp-cal-dot" />}
                      </button>
                    )
                  })
                )}
              </div>

              <div className="scp-cal-legend">
                <span className="scp-legend-item">
                  <span className="scp-legend-dot scp-legend-dot--session" />
                  Sessão existente
                </span>
                <span className="scp-legend-item">
                  <span className="scp-legend-dot scp-legend-dot--selected" />
                  Selecionado
                </span>
                {scope.isMacro && (
                  <span className="scp-legend-item">
                    <span className="scp-legend-dot scp-legend-dot--disabled" />
                    Sem semana criada
                  </span>
                )}
              </div>
            </>
          )}

          {selectedDays.size > 0 && (
            <div className="scp-selected-preview">
              {Array.from(selectedDays).sort().map((iso) => (
                <span key={iso} className="scp-selected-tag">
                  {new Date(iso + 'T00:00:00').toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' })}
                  <button type="button" onClick={() => toggleDay(iso)}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="sfp-actions">
          <button type="button" className="sfp-btn sfp-btn--secondary" onClick={goBack}>Cancelar</button>
          <button type="submit" className="sfp-btn sfp-btn--primary" disabled={saving || !selectedDays.size || !form.title}>
            {saving ? 'A criar...' : `Criar ${selectedDays.size || ''} sessão${selectedDays.size !== 1 ? 'ões' : ''}`}
          </button>
        </div>
      </form>
    </div>
  )
}
