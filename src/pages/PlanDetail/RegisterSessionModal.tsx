import { useEffect, useState } from 'react'
import type { SessionResponse } from '../../types'
import { exerciseLogsApi, type ExerciseLogEntryDto, type ExerciseSetLogDto } from '../../api/exerciseLogs'
import { plansApi } from '../../api/plans'
import './RegisterSessionModal.css'

const STRENGTH_TYPES = new Set(['STRENGTH', 'HYROX', 'CROSSFIT'])

interface LogSet extends ExerciseSetLogDto {
  _key: number
}

interface LogExercise {
  exerciseName: string
  orderIndex: number
  notes: string
  sets: LogSet[]
}

let _key = 0
const newSet = (setNumber: number): LogSet => ({
  _key: _key++, setNumber, reps: undefined, weightKg: undefined, rpe: undefined, completed: true,
})
const newExercise = (name = '', index = 0): LogExercise => ({
  exerciseName: name, orderIndex: index, notes: '',
  sets: [newSet(1)],
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

    // Pre-fill with existing log or planned exercises
    exerciseLogsApi.get(session.id).then(logs => {
      if (logs.length > 0) {
        setExercises(logs.map((log, i) => ({
          exerciseName: log.exerciseName,
          orderIndex: i,
          notes: log.notes ?? '',
          sets: log.sets.length > 0
            ? log.sets.map(s => ({ _key: _key++, setNumber: s.setNumber, reps: s.reps, weightKg: s.weightKg, rpe: s.rpe, completed: s.completed }))
            : [newSet(1)],
        })))
      } else if (session.exercises && session.exercises.length > 0) {
        setExercises(session.exercises.map((ex, i) => ({
          exerciseName: ex.name,
          orderIndex: i,
          notes: '',
          sets: Array.from({ length: ex.sets ?? 1 }, (_, j) => ({
            ...newSet(j + 1),
            reps: ex.reps ?? undefined,
            weightKg: ex.weightKg ?? undefined,
          })),
        })))
      } else {
        setExercises([newExercise()])
      }
    }).catch(() => {
      if (session.exercises && session.exercises.length > 0) {
        setExercises(session.exercises.map((ex, i) => ({
          exerciseName: ex.name,
          orderIndex: i,
          notes: '',
          sets: Array.from({ length: ex.sets ?? 1 }, (_, j) => ({
            ...newSet(j + 1),
            reps: ex.reps ?? undefined,
            weightKg: ex.weightKg ?? undefined,
          })),
        })))
      } else {
        setExercises([newExercise()])
      }
    })

    // Pre-fill endurance fields from existing result
    if (session.result) {
      setDuration(session.result.actualDurationMinutes?.toString() ?? '')
      setDistance(session.result.actualDistanceKm?.toString() ?? '')
      setHeartRate(session.result.averageHeartRate?.toString() ?? '')
      setRpe(session.result.perceivedEffort?.toString() ?? '')
      setNotes(session.result.notes ?? '')
    }

    exerciseLogsApi.knownExercises().then(setKnownExercises).catch(() => {})
  }, [session])

  if (!session) return null

  // ---- Exercise handlers ----

  const updateExerciseName = (i: number, name: string) =>
    setExercises(ex => ex.map((e, idx) => idx === i ? { ...e, exerciseName: name } : e))

  const updateSet = (exIdx: number, setKey: number, field: keyof LogSet, value: string) =>
    setExercises(ex => ex.map((e, i) => i !== exIdx ? e : {
      ...e,
      sets: e.sets.map(s => s._key !== setKey ? s : {
        ...s,
        [field]: value === '' ? undefined : (field === 'completed' ? value === 'true' : Number(value)),
      }),
    }))

  const addSet = (exIdx: number) =>
    setExercises(ex => ex.map((e, i) => i !== exIdx ? e : {
      ...e, sets: [...e.sets, newSet(e.sets.length + 1)],
    }))

  const removeSet = (exIdx: number, setKey: number) =>
    setExercises(ex => ex.map((e, i) => i !== exIdx ? e : {
      ...e, sets: e.sets.filter(s => s._key !== setKey),
    }))

  const addExercise = () => setExercises(ex => [...ex, newExercise('', ex.length)])
  const removeExercise = (i: number) => setExercises(ex => ex.filter((_, idx) => idx !== i))

  // ---- Save ----

  const handleSave = async () => {
    setSaving(true)
    try {
      // Save endurance result
      const hasEnduranceData = duration || distance || heartRate || rpe || notes
      if (hasEnduranceData) {
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

      // Save exercise logs (strength sessions)
      if (isStrength && exercises.length > 0) {
        const validExercises: ExerciseLogEntryDto[] = exercises
          .filter(e => e.exerciseName.trim())
          .map((e, i) => ({
            exerciseName: e.exerciseName.trim(),
            orderIndex: i,
            notes: e.notes || undefined,
            sets: e.sets.map(s => ({
              setNumber: s.setNumber,
              reps: s.reps,
              weightKg: s.weightKg,
              rpe: s.rpe,
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
            <p className="rsm-subtitle">{session.title}</p>
          </div>
          <button className="rsm-close" onClick={onClose}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="rsm-body">
          {/* Endurance general fields */}
          <div className="rsm-section">
            <p className="rsm-section__label">Geral</p>
            <div className="rsm-grid-4">
              <div className="rsm-field">
                <label>Duração (min)</label>
                <input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="60" />
              </div>
              {!isStrength && (
                <div className="rsm-field">
                  <label>Distância (km)</label>
                  <input type="number" step="0.1" value={distance} onChange={e => setDistance(e.target.value)} placeholder="10" />
                </div>
              )}
              <div className="rsm-field">
                <label>FC média (bpm)</label>
                <input type="number" value={heartRate} onChange={e => setHeartRate(e.target.value)} placeholder="145" />
              </div>
              <div className="rsm-field">
                <label>RPE (1–10)</label>
                <input type="number" min="1" max="10" value={rpe} onChange={e => setRpe(e.target.value)} placeholder="7" />
              </div>
            </div>
            <div className="rsm-field rsm-field--full">
              <label>Notas</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Como correu o treino?" />
            </div>
          </div>

          {/* Strength: exercise logs */}
          {isStrength && (
            <div className="rsm-section">
              <p className="rsm-section__label">Exercícios</p>
              <div className="rsm-exercises">
                {exercises.map((ex, exIdx) => (
                  <div key={exIdx} className="rsm-exercise">
                    <div className="rsm-exercise__header">
                      <div className="rsm-exercise__name-wrap">
                        <input
                          className="rsm-exercise__name"
                          value={ex.exerciseName}
                          onChange={e => updateExerciseName(exIdx, e.target.value)}
                          placeholder="Nome do exercício"
                          list={`exercises-${exIdx}`}
                        />
                        <datalist id={`exercises-${exIdx}`}>
                          {knownExercises.map(n => <option key={n} value={n} />)}
                        </datalist>
                      </div>
                      {exercises.length > 1 && (
                        <button className="rsm-exercise__remove" onClick={() => removeExercise(exIdx)}>
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Sets */}
                    <div className="rsm-sets">
                      <div className="rsm-sets__header">
                        <span>Série</span>
                        <span>Reps</span>
                        <span>Kg</span>
                        <span>RPE</span>
                        <span>1RM est.</span>
                        <span></span>
                      </div>
                      {ex.sets.map((s) => {
                        const orm = s.reps && s.weightKg
                          ? estimateORM(s.reps, s.weightKg)
                          : null
                        return (
                          <div key={s._key} className={`rsm-set-row ${!s.completed ? 'rsm-set-row--failed' : ''}`}>
                            <span className="rsm-set-number">{s.setNumber}</span>
                            <input
                              type="number"
                              value={s.reps ?? ''}
                              onChange={e => updateSet(exIdx, s._key, 'reps', e.target.value)}
                              placeholder="—"
                            />
                            <input
                              type="number"
                              step="0.5"
                              value={s.weightKg ?? ''}
                              onChange={e => updateSet(exIdx, s._key, 'weightKg', e.target.value)}
                              placeholder="—"
                            />
                            <input
                              type="number"
                              min="1"
                              max="10"
                              step="0.5"
                              value={s.rpe ?? ''}
                              onChange={e => updateSet(exIdx, s._key, 'rpe', e.target.value)}
                              placeholder="—"
                            />
                            <span className="rsm-orm">{orm ? `${orm} kg` : '—'}</span>
                            <div className="rsm-set-actions">
                              <button
                                className={`rsm-complete-btn ${s.completed ? 'rsm-complete-btn--done' : 'rsm-complete-btn--fail'}`}
                                onClick={() => updateSet(exIdx, s._key, 'completed', String(!s.completed))}
                                title={s.completed ? 'Marcar como falhada' : 'Marcar como completa'}
                              >
                                {s.completed ? '✓' : '✗'}
                              </button>
                              {ex.sets.length > 1 && (
                                <button className="rsm-remove-set" onClick={() => removeSet(exIdx, s._key)}>
                                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <button className="rsm-add-set" onClick={() => addSet(exIdx)}>
                      + Adicionar série
                    </button>
                  </div>
                ))}

                <button className="rsm-add-exercise" onClick={addExercise}>
                  + Adicionar exercício
                </button>
              </div>
            </div>
          )}
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

function estimateORM(reps: number, weightKg: number): number | null {
  if (reps <= 0 || weightKg <= 0 || reps > 15) return null
  if (reps === 1) return weightKg
  const epley   = weightKg * (1 + reps / 30)
  const brzycki = weightKg * (36 / (37 - reps))
  return Math.round((epley * 0.5 + brzycki * 0.5) * 10) / 10
}
