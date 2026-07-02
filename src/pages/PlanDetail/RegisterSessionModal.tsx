import { useEffect, useState } from 'react'
import type { SessionResponse } from '../../types'
import { exerciseLogsApi, type ExerciseLogEntryDto } from '../../api/exerciseLogs'
import { plansApi } from '../../api/plans'
import './RegisterSessionModal.css'

const STRENGTH_TYPES = new Set(['STRENGTH', 'HYROX', 'CROSSFIT'])

interface LogSet {
  _key: number
  setNumber: number
  plannedReps?: number
  plannedWeightKg?: number
  actualReps?: number
  actualWeightKg?: number
  completed: boolean
}

interface LogExercise {
  exerciseName: string
  orderIndex: number
  notes: string
  rpe?: number
  sets: LogSet[]
}

let _k = 0
const key = () => _k++

const emptySet = (n: number, plannedReps?: number, plannedWeightKg?: number): LogSet => ({
  _key: key(), setNumber: n,
  plannedReps, plannedWeightKg,
  actualReps: plannedReps, actualWeightKg: plannedWeightKg,
  completed: true,
})

interface Props {
  session: SessionResponse | null
  onClose: () => void
  onSaved: (sessionId: number) => void
}

export function RegisterSessionModal({ session, onClose, onSaved }: Props) {
  const [exercises, setExercises] = useState<LogExercise[]>([])
  const [duration, setDuration] = useState('')
  const [distance, setDistance] = useState('')
  const [heartRate, setHeartRate] = useState('')
  const [rpe, setRpe] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [knownExercises, setKnownExercises] = useState<string[]>([])

  const isStrength = session ? STRENGTH_TYPES.has(session.workoutType) : false

  useEffect(() => {
    if (!session) return

    // Pre-fill endurance fields from existing result
    if (session.result) {
      setDuration(session.result.actualDurationMinutes?.toString() ?? '')
      setDistance(session.result.actualDistanceKm?.toString() ?? '')
      setHeartRate(session.result.averageHeartRate?.toString() ?? '')
      setRpe(session.result.perceivedEffort?.toString() ?? '')
      setNotes(session.result.notes ?? '')
    } else {
      setDuration(''); setDistance(''); setHeartRate(''); setRpe(''); setNotes('')
    }

    // Load existing logs or pre-fill from plan
    exerciseLogsApi.get(session.id).then(logs => {
      if (logs.length > 0) {
        // Restore previous log, match with planned if possible
        const planned = session.exercises ?? []
        setExercises(logs.map((log, i) => {
          const plan = planned.find(p => p.name.toLowerCase() === log.exerciseName.toLowerCase())
          return {
            exerciseName: log.exerciseName,
            orderIndex: i,
            notes: log.notes ?? '',
            rpe: undefined,
            sets: log.sets.length > 0
              ? log.sets.map(s => ({
                  _key: key(),
                  setNumber: s.setNumber,
                  plannedReps: plan?.reps ?? undefined,
                  plannedWeightKg: plan?.weightKg ?? undefined,
                  actualReps: s.reps,
                  actualWeightKg: s.weightKg,
                  completed: s.completed,
                }))
              : [emptySet(1, plan?.reps, plan?.weightKg)],
          }
        }))
      } else if (session.exercises && session.exercises.length > 0) {
        setExercises(session.exercises.map((ex, i) => ({
          exerciseName: ex.name,
          orderIndex: i,
          notes: '',
          rpe: undefined,
          sets: Array.from({ length: ex.sets ?? 1 }, (_, j) =>
            emptySet(j + 1, ex.reps ?? undefined, ex.weightKg ?? undefined)
          ),
        })))
      } else {
        setExercises([{ exerciseName: '', orderIndex: 0, notes: '', rpe: undefined, sets: [emptySet(1)] }])
      }
    }).catch(() => {
      if (session.exercises && session.exercises.length > 0) {
        setExercises(session.exercises.map((ex, i) => ({
          exerciseName: ex.name,
          orderIndex: i,
          notes: '',
          rpe: undefined,
          sets: Array.from({ length: ex.sets ?? 1 }, (_, j) =>
            emptySet(j + 1, ex.reps ?? undefined, ex.weightKg ?? undefined)
          ),
        })))
      } else {
        setExercises([{ exerciseName: '', orderIndex: 0, notes: '', rpe: undefined, sets: [emptySet(1)] }])
      }
    })

    exerciseLogsApi.knownExercises().then(setKnownExercises).catch(() => {})
  }, [session])

  if (!session) return null

  // ---- Handlers ----

  const updateSet = (exIdx: number, setKey: number, field: 'actualReps' | 'actualWeightKg' | 'completed', value: string | boolean) =>
    setExercises(ex => ex.map((e, i) => i !== exIdx ? e : {
      ...e,
      sets: e.sets.map(s => s._key !== setKey ? s : {
        ...s,
        [field]: typeof value === 'boolean' ? value : (value === '' ? undefined : Number(value)),
      }),
    }))

  const addSet = (exIdx: number) =>
    setExercises(ex => ex.map((e, i) => {
      if (i !== exIdx) return e
      const last = e.sets[e.sets.length - 1]
      return {
        ...e,
        sets: [...e.sets, emptySet(e.sets.length + 1, last?.plannedReps, last?.plannedWeightKg)],
      }
    }))

  const removeSet = (exIdx: number, setKey: number) =>
    setExercises(ex => ex.map((e, i) => i !== exIdx ? e : {
      ...e, sets: e.sets.filter(s => s._key !== setKey),
    }))

  const updateExercise = (i: number, field: keyof LogExercise, value: string | number) =>
    setExercises(ex => ex.map((e, idx) => idx === i ? { ...e, [field]: value } : e))

  const addExercise = () =>
    setExercises(ex => [...ex, { exerciseName: '', orderIndex: ex.length, notes: '', rpe: undefined, sets: [emptySet(1)] }])

  const removeExercise = (i: number) =>
    setExercises(ex => ex.filter((_, idx) => idx !== i))

  // ---- Save ----

  const handleSave = async () => {
    setSaving(true)
    try {
      const hasEndurance = duration || distance || heartRate || rpe || notes
      if (hasEndurance) {
        const payload = {
          actualDurationMinutes: duration ? Number(duration) : undefined,
          actualDistanceKm: distance ? Number(distance) : undefined,
          averageHeartRate: heartRate ? Number(heartRate) : undefined,
          perceivedEffort: rpe ? Number(rpe) : undefined,
          notes: notes || undefined,
        }
        if (session.result) {
          await plansApi.updateResult(session.id, payload)
        } else {
          await plansApi.completeSession(session.id, payload)
        }
      }

      if (isStrength) {
        const validExercises: ExerciseLogEntryDto[] = exercises
          .filter(e => e.exerciseName.trim())
          .map((e, i) => ({
            exerciseName: e.exerciseName.trim(),
            orderIndex: i,
            notes: e.notes || undefined,
            sets: e.sets.map(s => ({
              setNumber: s.setNumber,
              reps: s.actualReps,
              weightKg: s.actualWeightKg,
              rpe: e.rpe,
              completed: s.completed,
            })),
          }))

        if (validExercises.length > 0) {
          await exerciseLogsApi.save(session.id, { exercises: validExercises })
        }
      }

      onSaved(session.id)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  // ---- Render ----

  return (
    <div className="rsm-overlay" onClick={onClose}>
      <div className="rsm-modal" onClick={e => e.stopPropagation()}>

        <div className="rsm-header">
          <div>
            <h2 className="rsm-title">Registar treino</h2>
            <p className="rsm-subtitle">{session.title} · {new Date(session.date).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <button className="rsm-close" onClick={onClose}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="rsm-body">

          {/* Strength: exercise logs */}
          {isStrength && (
            <div className="rsm-exercises">
              {exercises.map((ex, exIdx) => (
                <div key={exIdx} className="rsm-exercise">
                  <div className="rsm-exercise__header">
                    <div className="rsm-exercise__name-wrap">
                      <input
                        className="rsm-exercise__name"
                        value={ex.exerciseName}
                        onChange={e => updateExercise(exIdx, 'exerciseName', e.target.value)}
                        placeholder="Nome do exercício"
                        list={`ex-list-${exIdx}`}
                      />
                      <datalist id={`ex-list-${exIdx}`}>
                        {knownExercises.map(n => <option key={n} value={n} />)}
                      </datalist>
                    </div>
                    {exercises.length > 1 && (
                      <button className="rsm-exercise__remove" onClick={() => removeExercise(exIdx)} title="Remover exercício">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Sets table */}
                  <div className="rsm-sets-table">
                    <div className="rsm-sets-table__head">
                      <span>#</span>
                      <span className="rsm-col-plan">Plano</span>
                      <span>Reps feitas</span>
                      <span>Peso (kg)</span>
                      <span></span>
                    </div>

                    {ex.sets.map(s => (
                      <div key={s._key} className={`rsm-set-row ${!s.completed ? 'rsm-set-row--failed' : ''}`}>
                        <span className="rsm-set-num">{s.setNumber}</span>

                        <span className="rsm-col-plan rsm-planned-val">
                          {s.plannedReps && s.plannedWeightKg
                            ? `${s.plannedReps} × ${s.plannedWeightKg} kg`
                            : s.plannedReps
                              ? `${s.plannedReps} reps`
                              : '—'}
                        </span>

                        <input
                          type="number"
                          value={s.actualReps ?? ''}
                          onChange={e => updateSet(exIdx, s._key, 'actualReps', e.target.value)}
                          placeholder="—"
                        />
                        <input
                          type="number"
                          step="0.5"
                          value={s.actualWeightKg ?? ''}
                          onChange={e => updateSet(exIdx, s._key, 'actualWeightKg', e.target.value)}
                          placeholder="—"
                        />

                        <div className="rsm-set-btns">
                          <button
                            className={`rsm-done-btn ${s.completed ? 'rsm-done-btn--ok' : 'rsm-done-btn--fail'}`}
                            onClick={() => updateSet(exIdx, s._key, 'completed', !s.completed)}
                            title={s.completed ? 'Marcar como falhada' : 'Marcar como completa'}
                          >
                            {s.completed ? '✓' : '✗'}
                          </button>
                          {ex.sets.length > 1 && (
                            <button className="rsm-remove-set-btn" onClick={() => removeSet(exIdx, s._key)}>
                              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rsm-exercise__footer">
                    <button className="rsm-add-set-btn" onClick={() => addSet(exIdx)}>
                      + série
                    </button>
                    <div className="rsm-rpe-wrap">
                      <label>RPE</label>
                      <input
                        type="number"
                        min="1" max="10" step="0.5"
                        value={ex.rpe ?? ''}
                        onChange={e => updateExercise(exIdx, 'rpe', e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="—"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button className="rsm-add-exercise-btn" onClick={addExercise}>
                + Adicionar exercício
              </button>
            </div>
          )}

          {/* General: duration, distance, HR, notes */}
          <div className="rsm-general">
            <p className="rsm-section-label">Geral</p>
            <div className="rsm-general-grid">
              <div className="rsm-field">
                <label>Duração (min)</label>
                <input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder={session.plannedDurationMinutes?.toString() ?? '—'} />
              </div>
              {!isStrength && (
                <div className="rsm-field">
                  <label>Distância (km)</label>
                  <input type="number" step="0.1" value={distance} onChange={e => setDistance(e.target.value)} placeholder={session.plannedDistanceKm?.toString() ?? '—'} />
                </div>
              )}
              <div className="rsm-field">
                <label>FC média (bpm)</label>
                <input type="number" value={heartRate} onChange={e => setHeartRate(e.target.value)} placeholder="—" />
              </div>
              {!isStrength && (
                <div className="rsm-field">
                  <label>RPE (1–10)</label>
                  <input type="number" min="1" max="10" value={rpe} onChange={e => setRpe(e.target.value)} placeholder="—" />
                </div>
              )}
            </div>
            <div className="rsm-field">
              <label>Notas</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Como correu o treino?" />
            </div>
          </div>

        </div>

        <div className="rsm-footer">
          <button className="rsm-btn rsm-btn--secondary" onClick={onClose}>Cancelar</button>
          <button className="rsm-btn rsm-btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? 'A guardar...' : 'Guardar treino'}
          </button>
        </div>

      </div>
    </div>
  )
}
