import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { exercisesApi } from '../api/exercises'
import type { Equipment, ExerciseResponse, MuscleGroup } from '../types'
import './ExercisePicker.css'

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  CHEST: 'Peito',
  BACK: 'Costas',
  SHOULDERS: 'Ombros',
  BICEPS: 'Bíceps',
  TRICEPS: 'Tríceps',
  FOREARMS: 'Antebraços',
  QUADRICEPS: 'Quadríceps',
  HAMSTRINGS: 'Isquiotibiais',
  GLUTES: 'Glúteos',
  CALVES: 'Gémeos',
  ABS: 'Abdominais',
  FULL_BODY: 'Corpo inteiro',
  CARDIO: 'Cardio',
}

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  BARBELL: 'Barra',
  DUMBBELL: 'Halteres',
  MACHINE: 'Máquina',
  CABLE: 'Cabo',
  BODYWEIGHT: 'Peso corporal',
  KETTLEBELL: 'Kettlebell',
  BAND: 'Elástico',
  SMITH_MACHINE: 'Smith',
  OTHER: 'Outro',
}

// Shared catalog cache so every picker instance on the page fetches it only once
// and stays in sync when a new exercise is created from any of them.
let cachedCatalog: ExerciseResponse[] | null = null
let inFlight: Promise<ExerciseResponse[]> | null = null
const listeners = new Set<(catalog: ExerciseResponse[]) => void>()

function loadCatalog(): Promise<ExerciseResponse[]> {
  if (cachedCatalog) return Promise.resolve(cachedCatalog)
  if (!inFlight) {
    inFlight = exercisesApi.list().then((data) => {
      cachedCatalog = data
      inFlight = null
      return data
    })
  }
  return inFlight
}

function addToCatalog(exercise: ExerciseResponse) {
  cachedCatalog = [...(cachedCatalog ?? []), exercise].sort((a, b) => a.name.localeCompare(b.name))
  listeners.forEach((fn) => fn(cachedCatalog!))
}

interface Props {
  name: string
  onSelect: (exercise: { exerciseId: number; name: string }) => void
  placeholder?: string
  className?: string
}

export function ExercisePicker({ name, onSelect, placeholder, className }: Props) {
  const [catalog, setCatalog] = useState<ExerciseResponse[]>(cachedCatalog ?? [])
  const [query, setQuery] = useState(name)
  const [open, setOpen] = useState(false)
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | ''>('')
  const [equipmentFilter, setEquipmentFilter] = useState<Equipment | ''>('')
  const [creating, setCreating] = useState(false)
  const [newMuscle, setNewMuscle] = useState<MuscleGroup | ''>('')
  const [newEquipment, setNewEquipment] = useState<Equipment | ''>('')
  const [saving, setSaving] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadCatalog().then(setCatalog)
    const listener = (c: ExerciseResponse[]) => setCatalog(c)
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }, [])

  useEffect(() => {
    if (!open) setQuery(name)
  }, [name, open])

  // The dropdown is portaled to <body> (not a DOM descendant of the input) so it
  // isn't clipped by a scrollable modal's overflow — position it manually instead.
  useEffect(() => {
    if (!open) return
    const updatePosition = () => {
      const rect = inputRef.current?.getBoundingClientRect()
      if (rect) setCoords({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    return () => window.removeEventListener('resize', updatePosition)
  }, [open])

  // Close on scroll (of the modal or the page) rather than trying to track position live.
  useEffect(() => {
    if (!open) return
    const closeOnScroll = (e: Event) => {
      if (dropdownRef.current?.contains(e.target as Node)) return
      setOpen(false)
      setCreating(false)
      setQuery(name)
    }
    document.addEventListener('scroll', closeOnScroll, true)
    return () => document.removeEventListener('scroll', closeOnScroll, true)
  }, [open, name])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (wrapRef.current?.contains(target)) return
      if (dropdownRef.current?.contains(target)) return
      setOpen(false)
      setCreating(false)
      setQuery(name)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, name])

  const filtered = catalog.filter((e) =>
    (!muscleFilter || e.muscleGroup === muscleFilter) &&
    (!equipmentFilter || e.equipment === equipmentFilter) &&
    (query.trim() === '' || e.name.toLowerCase().includes(query.trim().toLowerCase()))
  )

  const exactMatch = catalog.some((e) => e.name.toLowerCase() === query.trim().toLowerCase())

  const select = (exercise: ExerciseResponse) => {
    onSelect({ exerciseId: exercise.id, name: exercise.name })
    setQuery(exercise.name)
    setOpen(false)
    setCreating(false)
  }

  const handleCreate = async () => {
    if (!query.trim()) return
    setSaving(true)
    try {
      const exercise = await exercisesApi.create({
        name: query.trim(),
        muscleGroup: newMuscle || undefined,
        equipment: newEquipment || undefined,
      })
      addToCatalog(exercise)
      select(exercise)
      setNewMuscle('')
      setNewEquipment('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`ex-picker ${className ?? ''}`} ref={wrapRef}>
      <input
        ref={inputRef}
        className="ex-picker__input"
        value={query}
        placeholder={placeholder ?? 'Pesquisar exercício...'}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setCreating(false) }}
      />
      {open && createPortal(
        <div
          className="ex-picker__dropdown"
          ref={dropdownRef}
          style={{ position: 'fixed', top: coords.top, left: coords.left, width: Math.max(280, coords.width) }}
        >
          <div className="ex-picker__filters">
            <select value={muscleFilter} onChange={(e) => setMuscleFilter(e.target.value as MuscleGroup | '')}>
              <option value="">Músculo</option>
              {Object.entries(MUSCLE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
            <select value={equipmentFilter} onChange={(e) => setEquipmentFilter(e.target.value as Equipment | '')}>
              <option value="">Material</option>
              {Object.entries(EQUIPMENT_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>

          <div className="ex-picker__list">
            {filtered.length === 0 && (
              <p className="ex-picker__empty">Sem exercícios com estes filtros</p>
            )}
            {filtered.map((e) => (
              <button type="button" key={e.id} className="ex-picker__item" onClick={() => select(e)}>
                <span className="ex-picker__item-name">{e.name}</span>
                <span className="ex-picker__item-tags">
                  {e.muscleGroup && <span className="ex-picker__tag">{MUSCLE_LABELS[e.muscleGroup]}</span>}
                  {e.equipment && <span className="ex-picker__tag">{EQUIPMENT_LABELS[e.equipment]}</span>}
                </span>
              </button>
            ))}
          </div>

          {query.trim() && !exactMatch && (
            creating ? (
              <div className="ex-picker__create-form">
                <p className="ex-picker__create-title">Criar "{query.trim()}"</p>
                <div className="ex-picker__create-row">
                  <select value={newMuscle} onChange={(e) => setNewMuscle(e.target.value as MuscleGroup | '')}>
                    <option value="">Músculo (opcional)</option>
                    {Object.entries(MUSCLE_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>{label}</option>
                    ))}
                  </select>
                  <select value={newEquipment} onChange={(e) => setNewEquipment(e.target.value as Equipment | '')}>
                    <option value="">Material (opcional)</option>
                    {Object.entries(EQUIPMENT_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="ex-picker__create-actions">
                  <button type="button" className="ex-picker__btn ex-picker__btn--primary" onClick={handleCreate} disabled={saving}>
                    {saving ? 'A criar...' : 'Criar exercício'}
                  </button>
                  <button type="button" className="ex-picker__btn" onClick={() => setCreating(false)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <button type="button" className="ex-picker__create-btn" onClick={() => setCreating(true)}>
                + Criar "{query.trim()}"
              </button>
            )
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
