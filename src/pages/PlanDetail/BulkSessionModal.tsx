import { useEffect, useRef, useState } from 'react'
import { plansApi } from '../../api/plans'
import { workoutTemplatesApi } from '../../api/workoutTemplates'
import type { MicrocycleResponse, SessionExercise, SessionResponse, WorkoutTemplate } from '../../types'
import './BulkSessionModal.css'

const WORKOUT_TYPES = [
  { value: 'SWIM',     label: '🏊 Natação' },
  { value: 'BIKE',     label: '🚴 Ciclismo' },
  { value: 'RUN',      label: '🏃 Corrida' },
  { value: 'BRICK',    label: '🧱 Brick' },
  { value: 'STRENGTH', label: '💪 Força' },
  { value: 'HYROX',   label: '🔥 HYROX' },
  { value: 'CROSSFIT', label: '⚡ CrossFit' },
]

const STRENGTH_TYPES = [
  { value: 'GENERAL',     label: 'Geral' },
  { value: 'HYPERTROPHY', label: 'Hipertrofia' },
  { value: 'POWER',       label: 'Força máxima' },
  { value: 'FUNCTIONAL',  label: 'Funcional' },
  { value: 'CIRCUIT',     label: 'Circuito' },
]

const INTENSITY_ZONES = [
  { value: 'Z1', label: 'Z1' },
  { value: 'Z2', label: 'Z2' },
  { value: 'Z3', label: 'Z3' },
  { value: 'Z4', label: 'Z4' },
  { value: 'Z5', label: 'Z5' },
]

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

const ENDURANCE_TYPES = new Set(['SWIM', 'BIKE', 'RUN', 'BRICK'])
const STRENGTH_WORKOUT_TYPES = new Set(['STRENGTH', 'HYROX', 'CROSSFIT'])

const emptyExercise = (): SessionExercise => ({ name: '', sets: undefined, reps: undefined, weightKg: undefined })

/** Returns YYYY-MM-DD string for a Date */
const toISO = (d: Date) => d.toISOString().slice(0, 10)

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

interface Props {
  open: boolean
  micro: MicrocycleResponse | null
  existingSessions: SessionResponse[]
  onClose: () => void
  onCreated: (microId: number, sessions: SessionResponse[]) => void
}

export function BulkSessionModal({ open, micro, existingSessions, onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    workoutType: 'RUN', title: '', description: '',
    plannedDurationMinutes: '', plannedDistanceKm: '', intensityZone: '', strengthType: '',
  })
  const [exercises, setExercises] = useState<SessionExercise[]>([emptyExercise()])
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  // Templates
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [showTpl, setShowTpl] = useState(false)
  const tplRef = useRef<HTMLDivElement>(null)

  const existingDates = new Set(existingSessions.map(s => s.date))

  useEffect(() => {
    if (open) {
      workoutTemplatesApi.list().then(setTemplates).catch(() => {})
      setForm({ workoutType: 'RUN', title: '', description: '', plannedDurationMinutes: '', plannedDistanceKm: '', intensityZone: '', strengthType: '' })
      setExercises([emptyExercise()])
      setSelectedDays(new Set())
      setShowTpl(false)
    }
  }, [open])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    if (!showTpl) return
    const handler = (e: MouseEvent) => {
      if (tplRef.current && !tplRef.current.contains(e.target as Node)) setShowTpl(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showTpl])

  if (!open || !micro) return null

  const isEndurance = ENDURANCE_TYPES.has(form.workoutType)
  const isStrength = STRENGTH_WORKOUT_TYPES.has(form.workoutType)
  const days = daysInRange(micro.startDate, micro.endDate)
  const weeks = toWeeks(days)

  const setF = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))

  const toggleDay = (iso: string) => {
    setSelectedDays(prev => {
      const next = new Set(prev)
      next.has(iso) ? next.delete(iso) : next.add(iso)
      return next
    })
  }

  const applyTemplate = (t: WorkoutTemplate) => {
    setForm(f => ({
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
    setShowTpl(false)
  }

  const updateEx = (i: number, field: keyof SessionExercise, value: string) => {
    setExercises(prev => prev.map((ex, idx) =>
      idx === i ? { ...ex, [field]: field === 'name' || field === 'notes' ? value : (value === '' ? undefined : Number(value)) } : ex
    ))
  }

  const handleClose = () => { setSaving(false); onClose() }

  const handleCreate = async () => {
    if (!selectedDays.size || !form.title || !micro) return
    setSaving(true)
    try {
      const sessions = await plansApi.bulkCreateSessions(micro.id, {
        dates: Array.from(selectedDays).sort(),
        workoutType: form.workoutType,
        title: form.title,
        description: form.description || undefined,
        plannedDurationMinutes: form.plannedDurationMinutes ? Number(form.plannedDurationMinutes) : undefined,
        plannedDistanceKm: form.plannedDistanceKm ? Number(form.plannedDistanceKm) : undefined,
        intensityZone: form.intensityZone || undefined,
        strengthType: form.strengthType || undefined,
        exercises: isStrength ? exercises.filter(ex => ex.name.trim()) : [],
      })
      onClose()
      onCreated(micro.id, sessions)
    } finally {
      setSaving(false)
    }
  }

  const dayLabel = (d: Date) => d.getDate()
  const monthLabel = (d: Date) =>
    d.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })

  return (
    <div className="bsm-overlay" onClick={handleClose}>
      <div className="bsm-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="bsm-header">
          <h2 className="bsm-title">Criar sessões em massa</h2>
          <div className="bsm-header-right">
            <div className="bsm-tpl-wrap" ref={tplRef}>
              <button type="button" className="bsm-tpl-btn" onClick={() => setShowTpl(v => !v)}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h8" />
                </svg>
                Templates
              </button>
              {showTpl && (
                <div className="bsm-tpl-dropdown">
                  {templates.length === 0 ? (
                    <p className="bsm-tpl-empty">Sem templates</p>
                  ) : templates.map(t => (
                    <div key={t.id} className="bsm-tpl-item" onClick={() => applyTemplate(t)}>
                      <span className="bsm-tpl-name">{t.name}</span>
                      <span className="bsm-tpl-type">{t.workoutType}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button className="bsm-close" onClick={handleClose}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="bsm-body">

          {/* Left: config */}
          <div className="bsm-config">
            <div className="bsm-row">
              <div className="bsm-field">
                <label className="bsm-label">Tipo de treino</label>
                <select className="bsm-input bsm-select" value={form.workoutType} onChange={setF('workoutType')}>
                  {WORKOUT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              {isStrength && (
                <div className="bsm-field">
                  <label className="bsm-label">Subtipo</label>
                  <select className="bsm-input bsm-select" value={form.strengthType} onChange={setF('strengthType')}>
                    <option value="">—</option>
                    {STRENGTH_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="bsm-field">
              <label className="bsm-label">Título *</label>
              <input className="bsm-input" value={form.title} onChange={setF('title')} placeholder="Ex: Corrida longa Z2" />
            </div>

            {isEndurance && (
              <div className="bsm-row bsm-row--3">
                <div className="bsm-field">
                  <label className="bsm-label">Duração (min)</label>
                  <input type="number" className="bsm-input" value={form.plannedDurationMinutes} onChange={setF('plannedDurationMinutes')} min="0" placeholder="60" />
                </div>
                <div className="bsm-field">
                  <label className="bsm-label">Distância (km)</label>
                  <input type="number" className="bsm-input" value={form.plannedDistanceKm} onChange={setF('plannedDistanceKm')} step="0.1" min="0" placeholder="10" />
                </div>
                <div className="bsm-field">
                  <label className="bsm-label">Zona</label>
                  <select className="bsm-input bsm-select" value={form.intensityZone} onChange={setF('intensityZone')}>
                    <option value="">—</option>
                    {INTENSITY_ZONES.map(z => <option key={z.value} value={z.value}>{z.label}</option>)}
                  </select>
                </div>
              </div>
            )}

            {isStrength && (
              <>
                <div className="bsm-field">
                  <label className="bsm-label">Duração estimada (min)</label>
                  <input type="number" className="bsm-input" value={form.plannedDurationMinutes} onChange={setF('plannedDurationMinutes')} min="0" placeholder="60" />
                </div>
                <div className="bsm-exercises">
                  <div className="bsm-ex-header">
                    <span className="bsm-label">Exercícios</span>
                    <button type="button" className="bsm-add-ex" onClick={() => setExercises(p => [...p, emptyExercise()])}>+ Adicionar</button>
                  </div>
                  <div className="bsm-ex-cols">
                    <span>Exercício</span><span>S</span><span>R</span><span>kg</span><span />
                  </div>
                  {exercises.map((ex, i) => (
                    <div key={i} className="bsm-ex-row">
                      <input className="bsm-input" placeholder="Exercício" value={ex.name} onChange={e => updateEx(i, 'name', e.target.value)} />
                      <input className="bsm-input bsm-ex-num" type="number" placeholder="4" min="1" value={ex.sets ?? ''} onChange={e => updateEx(i, 'sets', e.target.value)} />
                      <input className="bsm-input bsm-ex-num" type="number" placeholder="10" min="1" value={ex.reps ?? ''} onChange={e => updateEx(i, 'reps', e.target.value)} />
                      <input className="bsm-input bsm-ex-num" type="number" placeholder="80" min="0" step="0.5" value={ex.weightKg ?? ''} onChange={e => updateEx(i, 'weightKg', e.target.value)} />
                      <button type="button" className="bsm-ex-remove" onClick={() => setExercises(p => p.filter((_, idx) => idx !== i))} disabled={exercises.length === 1}>×</button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right: calendar */}
          <div className="bsm-calendar">
            <div className="bsm-cal-title">
              {micro.startDate && monthLabel(new Date(micro.startDate + 'T00:00:00'))}
              <span className="bsm-cal-range"> · Sem {micro.weekNumber}</span>
            </div>

            <div className="bsm-cal-grid">
              {DAY_LABELS.map(l => (
                <div key={l} className="bsm-cal-day-label">{l}</div>
              ))}
              {weeks.map((week, wi) =>
                week.map((day, di) => {
                  if (!day) return <div key={`e-${wi}-${di}`} className="bsm-cal-cell bsm-cal-cell--empty" />
                  const iso = toISO(day)
                  const selected = selectedDays.has(iso)
                  const hasSession = existingDates.has(iso)
                  return (
                    <button
                      key={iso}
                      type="button"
                      className={`bsm-cal-cell ${selected ? 'bsm-cal-cell--selected' : ''} ${hasSession ? 'bsm-cal-cell--has-session' : ''}`}
                      onClick={() => toggleDay(iso)}
                      title={hasSession ? 'Já tem sessão' : undefined}
                    >
                      <span className="bsm-cal-num">{dayLabel(day)}</span>
                      {hasSession && <span className="bsm-cal-dot" />}
                    </button>
                  )
                })
              )}
            </div>

            <div className="bsm-cal-legend">
              <span className="bsm-legend-item">
                <span className="bsm-legend-dot bsm-legend-dot--session" />
                Sessão existente
              </span>
              <span className="bsm-legend-item">
                <span className="bsm-legend-dot bsm-legend-dot--selected" />
                Selecionado
              </span>
            </div>

            {selectedDays.size > 0 && (
              <div className="bsm-selected-preview">
                {Array.from(selectedDays).sort().map(iso => (
                  <span key={iso} className="bsm-selected-tag">
                    {new Date(iso + 'T00:00:00').toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' })}
                    <button type="button" onClick={() => toggleDay(iso)}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bsm-footer">
          <button type="button" className="bsm-btn bsm-btn--secondary" onClick={handleClose}>Cancelar</button>
          <button
            type="button"
            className="bsm-btn bsm-btn--primary"
            disabled={saving || !selectedDays.size || !form.title}
            onClick={handleCreate}
          >
            {saving ? 'A criar...' : `Criar ${selectedDays.size || ''} sessão${selectedDays.size !== 1 ? 'ões' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
