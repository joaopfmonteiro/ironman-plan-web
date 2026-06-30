import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { templatesApi } from '../../api/templates'
import { plansApi } from '../../api/plans'
import { racesApi } from '../../api/races'
import type { TemplateSummaryResponse, RaceResponse } from '../../types'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'

const distanceLabel: Record<string, string> = {
  SPRINT: 'Sprint',
  OLYMPIC: 'Olímpico',
  IRON70: 'Ironman 70.3',
  IRON140: 'Ironman 140.6',
}

const distanceColor: Record<string, 'slate' | 'blue' | 'orange' | 'red'> = {
  SPRINT: 'slate',
  OLYMPIC: 'blue',
  IRON70: 'orange',
  IRON140: 'red',
}

const levelLabel: Record<string, string> = {
  BEGINNER: 'Iniciante',
  INTERMEDIATE: 'Intermédio',
  ADVANCED: 'Avançado',
  ELITE: 'Elite',
}

const levelColor: Record<string, 'green' | 'yellow' | 'orange' | 'red'> = {
  BEGINNER: 'green',
  INTERMEDIATE: 'yellow',
  ADVANCED: 'orange',
  ELITE: 'red',
}

export function TemplatesPage() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<TemplateSummaryResponse[]>([])
  const [races, setRaces] = useState<RaceResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateSummaryResponse | null>(null)
  const [form, setForm] = useState({ startDate: '', targetRaceId: '', planName: '' })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    Promise.all([templatesApi.list(), racesApi.list()])
      .then(([t, r]) => {
        setTemplates(t)
        setRaces(r)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTemplate) return
    setCreating(true)
    try {
      const plan = await plansApi.createFromTemplate(selectedTemplate.id, {
        startDate: form.startDate,
        targetRaceId: form.targetRaceId ? Number(form.targetRaceId) : undefined,
        planName: form.planName || undefined,
      })
      navigate(`/plans/${plan.id}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Programas Pré-definidos</h1>
        <p className="text-slate-500 mt-1">Escolhe um programa e cria um plano de treino completo automaticamente.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {templates.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md hover:border-blue-200 transition-all flex flex-col"
            >
              <div className="flex items-start gap-2 mb-3 flex-wrap">
                <Badge color={distanceColor[t.targetDistance] || 'slate'}>
                  {distanceLabel[t.targetDistance] || t.targetDistance}
                </Badge>
                <Badge color={levelColor[t.fitnessLevel] || 'slate'}>
                  {levelLabel[t.fitnessLevel] || t.fitnessLevel}
                </Badge>
              </div>

              <h3 className="font-semibold text-slate-800 text-base mb-1">{t.name}</h3>
              {t.description && <p className="text-sm text-slate-500 mb-4 flex-1">{t.description}</p>}

              <div className="flex items-center gap-4 text-sm text-slate-500 mb-5">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {t.durationWeeks} semanas
                </span>
              </div>

              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setSelectedTemplate(t)
                  setForm({ startDate: '', targetRaceId: '', planName: '' })
                }}
              >
                Usar este programa
              </Button>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!selectedTemplate}
        onClose={() => setSelectedTemplate(null)}
        title="Criar plano a partir do programa"
      >
        {selectedTemplate && (
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800 font-medium">
              {selectedTemplate.name}
            </div>
            <Input
              label="Nome do plano (opcional)"
              value={form.planName}
              onChange={(e) => setForm((f) => ({ ...f, planName: e.target.value }))}
              placeholder={selectedTemplate.name}
            />
            <Input
              label="Data de início"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              required
            />
            {races.length > 0 && (
              <Select
                label="Prova alvo (opcional)"
                value={form.targetRaceId}
                onChange={(e) => setForm((f) => ({ ...f, targetRaceId: e.target.value }))}
                options={races.map((r) => ({ value: String(r.id), label: `${r.name} — ${new Date(r.date).toLocaleDateString('pt-PT')}` }))}
                placeholder="Selecionar prova..."
              />
            )}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setSelectedTemplate(null)}>
                Cancelar
              </Button>
              <Button type="submit" loading={creating} className="flex-1">
                Criar plano
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}

