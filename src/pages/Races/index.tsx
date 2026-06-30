import { useEffect, useState } from 'react'
import { racesApi } from '../../api/races'
import type { RaceResponse } from '../../types'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import './RacesPage.css'

const DISTANCE_OPTIONS = [
  { value: 'SPRINT', label: 'Sprint' },
  { value: 'OLYMPIC', label: 'Olímpico' },
  { value: 'IRON70', label: 'Ironman 70.3' },
  { value: 'IRON140', label: 'Ironman 140.6' },
]

const distanceBadgeColor: Record<string, 'slate' | 'blue' | 'orange' | 'red'> = {
  SPRINT: 'slate',
  OLYMPIC: 'blue',
  IRON70: 'orange',
  IRON140: 'red',
}

const DISTANCE_LABEL: Record<string, string> = {
  SPRINT: 'Sprint', OLYMPIC: 'Olímpico', IRON70: 'Ironman 70.3', IRON140: 'Ironman 140.6',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTime(minutes?: number) {
  if (!minutes) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h${m > 0 ? ` ${m}m` : ''}`
}

interface FormState {
  name: string
  date: string
  location: string
  distance: string
  targetFinishTimeMinutes: string
  notes: string
}

const emptyForm: FormState = { name: '', date: '', location: '', distance: 'IRON140', targetFinishTimeMinutes: '', notes: '' }

export function RacesPage() {
  const [races, setRaces] = useState<RaceResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editRace, setEditRace] = useState<RaceResponse | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    racesApi.list().then(setRaces).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditRace(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (race: RaceResponse) => {
    setEditRace(race)
    setForm({
      name: race.name,
      date: race.date,
      location: race.location || '',
      distance: race.distance,
      targetFinishTimeMinutes: race.targetFinishTimeMinutes?.toString() || '',
      notes: race.notes || '',
    })
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      name: form.name,
      date: form.date,
      location: form.location || undefined,
      distance: form.distance as RaceResponse['distance'],
      targetFinishTimeMinutes: form.targetFinishTimeMinutes ? Number(form.targetFinishTimeMinutes) : undefined,
      notes: form.notes || undefined,
    }
    try {
      if (editRace) {
        await racesApi.update(editRace.id, payload)
      } else {
        await racesApi.create(payload)
      }
      setModalOpen(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Tens a certeza que queres eliminar esta prova?')) return
    await racesApi.delete(id)
    load()
  }

  const setF = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const upcoming = races.filter((r) => new Date(r.date) >= new Date()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const past = races.filter((r) => new Date(r.date) < new Date()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="races-page">
      <div className="races-header">
        <div>
          <h1 className="races-header-title">Provas</h1>
          <p className="races-header-subtitle">Gere as tuas competições</p>
        </div>
        <Button onClick={openCreate}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova Prova
        </Button>
      </div>

      {loading ? (
        <div className="races-loading">
          <div className="races-spinner" />
        </div>
      ) : races.length === 0 ? (
        <div className="races-empty">
          <p className="races-empty__icon">🏁</p>
          <h2 className="races-empty__title">Nenhuma prova registada</h2>
          <p className="races-empty__desc">Adiciona a tua próxima competição para monitorizar o progresso.</p>
          <Button onClick={openCreate}>Adicionar prova</Button>
        </div>
      ) : (
        <div className="races-content">
          {upcoming.length > 0 && (
            <div>
              <h2 className="races-section__title">Próximas</h2>
              <div className="races-section__grid">
                {upcoming.map((race) => (
                  <RaceCard key={race.id} race={race} onEdit={() => openEdit(race)} onDelete={() => handleDelete(race.id)} />
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="races-section__title">Passadas</h2>
              <div className="races-section__grid races-section__grid--past">
                {past.map((race) => (
                  <RaceCard key={race.id} race={race} onEdit={() => openEdit(race)} onDelete={() => handleDelete(race.id)} past />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editRace ? 'Editar Prova' : 'Nova Prova'}>
        <form onSubmit={handleSave} className="modal-form">
          <Input label="Nome da prova" value={form.name} onChange={setF('name')} placeholder="Ironman Portugal 2027" required />
          <div className="modal-grid-2">
            <Input label="Data" type="date" value={form.date} onChange={setF('date')} required />
            <Select label="Distância" value={form.distance} onChange={setF('distance')} options={DISTANCE_OPTIONS} />
          </div>
          <Input label="Local" value={form.location} onChange={setF('location')} placeholder="Cascais, Portugal" />
          <Input label="Tempo alvo (minutos)" type="number" value={form.targetFinishTimeMinutes} onChange={setF('targetFinishTimeMinutes')} placeholder="600" />
          <div className="modal-actions">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={saving} className="flex-1">{editRace ? 'Guardar' : 'Criar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function RaceCard({ race, onEdit, onDelete, past }: { race: RaceResponse; onEdit: () => void; onDelete: () => void; past?: boolean }) {
  const badgeColor = distanceBadgeColor[race.distance] || 'slate'

  return (
    <div className="race-card">
      <div className="race-card__header">
        <div className="race-card__info">
          <h3 className="race-card__name">{race.name}</h3>
          {race.location && <p className="race-card__location">{race.location}</p>}
        </div>
        <Badge color={badgeColor}>{DISTANCE_LABEL[race.distance] || race.distance}</Badge>
      </div>

      <div className="race-card__meta">
        <div>
          <p className="race-card__meta-label">Data</p>
          <p className="race-card__meta-value">{formatDate(race.date)}</p>
        </div>
        <div>
          <p className="race-card__meta-label">Tempo alvo</p>
          <p className="race-card__meta-value">{formatTime(race.targetFinishTimeMinutes)}</p>
        </div>
        {past && race.actualFinishTimeMinutes && (
          <div className="race-card__meta-span">
            <p className="race-card__meta-label">Tempo real</p>
            <p className="race-card__meta-value--actual">{formatTime(race.actualFinishTimeMinutes)}</p>
          </div>
        )}
      </div>

      <div className="race-card__actions">
        <Button variant="secondary" size="sm" className="flex-1" onClick={onEdit}>Editar</Button>
        <Button variant="danger" size="sm" onClick={onDelete}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </Button>
      </div>
    </div>
  )
}
