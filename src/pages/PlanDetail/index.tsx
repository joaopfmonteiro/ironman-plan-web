import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { plansApi } from '../../api/plans'
import type {
  PlanResponse,
  MacrocycleResponse,
  MicrocycleResponse,
  SessionResponse,
} from '../../types'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { MacrocycleModal } from './MacrocycleModal'
import { MicrocycleModal } from './MicrocycleModal'
import { SessionModal } from './SessionModal'
import { BulkSessionModal } from './BulkSessionModal'
import './PlanDetailPage.css'

// ---- Helpers ----

function formatDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })
}




const macroTypeColor: Record<string, 'blue' | 'orange' | 'red' | 'green' | 'purple'> = {
  BASE: 'blue',
  BUILD: 'orange',
  PEAK: 'red',
  RACE: 'purple',
  RECOVERY: 'green',
}

const workoutTypeColor: Record<string, 'blue' | 'orange' | 'green' | 'purple' | 'slate' | 'teal'> = {
  SWIM: 'blue',
  BIKE: 'orange',
  RUN: 'green',
  STRENGTH: 'purple',
  HYROX: 'orange',
  CROSSFIT: 'teal',
  BRICK: 'teal',
  REST: 'slate',
}

const workoutIcon: Record<string, string> = {
  SWIM: '🏊',
  BIKE: '🚴',
  RUN: '🏃',
  STRENGTH: '💪',
  HYROX: '🔥',
  CROSSFIT: '⚡',
  BRICK: '🧱',
  REST: '😴',
}

// ---- Component ----

export function PlanDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const planId = Number(id)

  const [plan, setPlan] = useState<PlanResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const [expandedMacro, setExpandedMacro] = useState<number | null>(null)
  const [expandedMicro, setExpandedMicro] = useState<number | null>(null)

  const [sessionsMap, setSessionsMap] = useState<Record<number, SessionResponse[]>>({})
  const [loadingSessions, setLoadingSessions] = useState<Set<number>>(new Set())

  const [macroModal, setMacroModal] = useState(false)
  const [editMacro, setEditMacro] = useState<MacrocycleResponse | null>(null)

  const [microModal, setMicroModal] = useState(false)
  const [editMicro, setEditMicro] = useState<MicrocycleResponse | null>(null)
  const [activeMacroId, setActiveMacroId] = useState<number | null>(null)
  const [activeMacroDates, setActiveMacroDates] = useState<{ start: string; end: string } | null>(null)
  const [activeMacroMicros, setActiveMacroMicros] = useState<MicrocycleResponse[]>([])

  const [sessionModal, setSessionModal] = useState(false)
  const [editSession, setEditSession] = useState<SessionResponse | null>(null)
  const [activeMicroId, setActiveMicroId] = useState<number | null>(null)

  const [bulkModal, setBulkModal] = useState(false)
  const [bulkMicro, setBulkMicro] = useState<MicrocycleResponse | null>(null)

  const [completeModal, setCompleteModal] = useState(false)
  const [completingSession, setCompletingSession] = useState<SessionResponse | null>(null)
  const [completeForm, setCompleteForm] = useState({
    actualDurationMinutes: '', actualDistanceKm: '', averageHeartRate: '', perceivedEffort: '', notes: '',
  })

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    plansApi.get(planId).then(setPlan).finally(() => setLoading(false))
  }, [planId])

  const loadSessions = async (microId: number) => {
    if (sessionsMap[microId]) return
    setLoadingSessions((s) => new Set(s).add(microId))
    try {
      const sessions = await plansApi.getSessions(microId)
      setSessionsMap((m) => ({ ...m, [microId]: sessions }))
    } finally {
      setLoadingSessions((s) => { const ns = new Set(s); ns.delete(microId); return ns })
    }
  }

  const toggleMicro = async (microId: number) => {
    if (expandedMicro === microId) {
      setExpandedMicro(null)
    } else {
      setExpandedMicro(microId)
      await loadSessions(microId)
    }
  }

  const refreshPlan = () => plansApi.get(planId).then(setPlan)

  // ---- Macro CRUD ----
  const openCreateMacro = () => { setEditMacro(null); setMacroModal(true) }
  const openEditMacro = (m: MacrocycleResponse) => { setEditMacro(m); setMacroModal(true) }

  const deleteMacro = async (id: number) => {
    if (!confirm('Eliminar macrociclo e todo o seu conteúdo?')) return
    await plansApi.deleteMacrocycle(id)
    refreshPlan()
  }

  // ---- Micro CRUD ----
  const openCreateMicro = (macro: MacrocycleResponse) => {
    setEditMicro(null)
    setActiveMacroId(macro.id)
    setActiveMacroDates({ start: macro.startDate, end: macro.endDate })
    setActiveMacroMicros(macro.microcycles)
    setMicroModal(true)
  }
  const openEditMicro = (micro: MicrocycleResponse, macro: MacrocycleResponse) => {
    setEditMicro(micro)
    setActiveMacroId(null)
    setActiveMacroDates({ start: macro.startDate, end: macro.endDate })
    setActiveMacroMicros(macro.microcycles.filter((m) => m.id !== micro.id))
    setMicroModal(true)
  }

  const deleteMicro = async (id: number) => {
    if (!confirm('Eliminar microciclo e todas as sessões?')) return
    await plansApi.deleteMicrocycle(id)
    setSessionsMap((m) => { const nm = { ...m }; delete nm[id]; return nm })
    refreshPlan()
  }

  // ---- Session CRUD ----
  const openCreateSession = (microId: number) => { setEditSession(null); setActiveMicroId(microId); setSessionModal(true) }
  const openEditSession = (s: SessionResponse) => { setEditSession(s); setActiveMicroId(s.microcycleId); setSessionModal(true) }

  const handleSessionSaved = (microId: number, sessions: SessionResponse[]) => {
    setSessionsMap((m) => ({ ...m, [microId]: sessions }))
  }

  const openBulkCreate = (micro: MicrocycleResponse) => { setBulkMicro(micro); setBulkModal(true) }

  const deleteSession = async (s: SessionResponse) => {
    if (!confirm('Eliminar sessão?')) return
    await plansApi.deleteSession(s.id)
    const sessions = await plansApi.getSessions(s.microcycleId)
    setSessionsMap((m) => ({ ...m, [s.microcycleId]: sessions }))
  }

  // ---- Complete session ----
  const openComplete = (s: SessionResponse) => {
    setCompletingSession(s)
    if (s.result) {
      setCompleteForm({
        actualDurationMinutes: s.result.actualDurationMinutes?.toString() || '',
        actualDistanceKm: s.result.actualDistanceKm?.toString() || '',
        averageHeartRate: s.result.averageHeartRate?.toString() || '',
        perceivedEffort: s.result.perceivedEffort?.toString() || '',
        notes: s.result.notes || '',
      })
    } else {
      setCompleteForm({ actualDurationMinutes: '', actualDistanceKm: '', averageHeartRate: '', perceivedEffort: '', notes: '' })
    }
    setCompleteModal(true)
  }
  const saveComplete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!completingSession) return
    setSaving(true)
    const payload = {
      actualDurationMinutes: completeForm.actualDurationMinutes ? Number(completeForm.actualDurationMinutes) : undefined,
      actualDistanceKm: completeForm.actualDistanceKm ? Number(completeForm.actualDistanceKm) : undefined,
      averageHeartRate: completeForm.averageHeartRate ? Number(completeForm.averageHeartRate) : undefined,
      perceivedEffort: completeForm.perceivedEffort ? Number(completeForm.perceivedEffort) : undefined,
      notes: completeForm.notes || undefined,
    }
    try {
      if (completingSession.result) {
        await plansApi.updateResult(completingSession.id, payload)
      } else {
        await plansApi.completeSession(completingSession.id, payload)
      }
      setCompleteModal(false)
      const sessions = await plansApi.getSessions(completingSession.microcycleId)
      setSessionsMap((m) => ({ ...m, [completingSession.microcycleId]: sessions }))
    } finally { setSaving(false) }
  }
  const uncompleteSession = async (s: SessionResponse) => {
    if (!confirm('Remover resultado desta sessão?')) return
    await plansApi.deleteResult(s.id)
    const sessions = await plansApi.getSessions(s.microcycleId)
    setSessionsMap((m) => ({ ...m, [s.microcycleId]: sessions }))
  }

  const setCF = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setCompleteForm((p) => ({ ...p, [f]: e.target.value }))

  // ---- Render ----

  if (loading) {
    return (
      <div className="plan-detail-loading">
        <div className="plan-detail-spinner" />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="plan-detail-not-found">
        <p>Plano não encontrado.</p>
        <Link to="/plans">← Voltar</Link>
      </div>
    )
  }

  return (
    <div className="plan-detail-page">
      {/* Header */}
      <div className="plan-detail-header">
        <button onClick={() => navigate('/plans')} className="plan-detail-back-btn">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div className="plan-detail-header-content">
          <div className="plan-detail-title-row">
            <h1 className="plan-detail-title">{plan.name}</h1>
            {plan.isActive && <Badge color="green">Ativo</Badge>}
          </div>
          {plan.description && <p className="plan-detail-desc">{plan.description}</p>}
          <div className="plan-detail-meta">
            <span>{formatDate(plan.startDate)} → {formatDate(plan.endDate)}</span>
            {plan.targetRaceName && <span>🏁 {plan.targetRaceName}</span>}
          </div>
        </div>
        <Button onClick={openCreateMacro} size="sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Macrociclo
        </Button>
      </div>

      {/* Macrocycles */}
      {plan.macrocycles.length === 0 ? (
        <div className="plan-detail-empty">
          <p className="plan-detail-empty__icon">🏗️</p>
          <h2 className="plan-detail-empty__title">Sem macrociclos</h2>
          <p className="plan-detail-empty__desc">Começa por adicionar blocos de treino ao teu plano.</p>
          <Button onClick={openCreateMacro}>Adicionar macrociclo</Button>
        </div>
      ) : (
        <div className="plan-detail-macros">
          {plan.macrocycles.map((macro) => (
            <MacrocycleBlock
              key={macro.id}
              macro={macro}
              expanded={expandedMacro === macro.id}
              onToggle={() => setExpandedMacro(expandedMacro === macro.id ? null : macro.id)}
              expandedMicro={expandedMicro}
              onToggleMicro={toggleMicro}
              sessionsMap={sessionsMap}
              loadingSessions={loadingSessions}
              onEditMacro={() => openEditMacro(macro)}
              onDeleteMacro={() => deleteMacro(macro.id)}
              onCreateMicro={() => openCreateMicro(macro)}
              onEditMicro={(m) => openEditMicro(m, macro)}
              onDeleteMicro={(m) => deleteMicro(m.id)}
              onCreateSession={openCreateSession}
              onBulkCreateSession={openBulkCreate}
              onEditSession={openEditSession}
              onDeleteSession={deleteSession}
              onCompleteSession={openComplete}
              onUncompleteSession={uncompleteSession}
            />
          ))}
        </div>
      )}

      <MacrocycleModal
        open={macroModal}
        planId={planId}
        editMacro={editMacro}
        onClose={() => setMacroModal(false)}
        onSaved={refreshPlan}
      />

      <MicrocycleModal
        open={microModal}
        macroId={activeMacroId}
        editMicro={editMicro}
        macroStartDate={activeMacroDates?.start}
        macroEndDate={activeMacroDates?.end}
        siblingMicros={activeMacroMicros}
        onClose={() => setMicroModal(false)}
        onSaved={refreshPlan}
      />

      <SessionModal
        open={sessionModal}
        microId={activeMicroId}
        editSession={editSession}
        onClose={() => setSessionModal(false)}
        onSaved={handleSessionSaved}
      />

      <BulkSessionModal
        open={bulkModal}
        micro={bulkMicro}
        existingSessions={bulkMicro ? (sessionsMap[bulkMicro.id] ?? []) : []}
        onClose={() => setBulkModal(false)}
        onCreated={handleSessionSaved}
      />

      {/* Complete Modal */}
      <Modal open={completeModal} onClose={() => setCompleteModal(false)} title={completingSession?.result ? 'Editar Resultado' : 'Registar Resultado'}>
        <form onSubmit={saveComplete} className="modal-form">
          {completingSession && (
            <div className="complete-session-preview">
              {workoutIcon[completingSession.workoutType]} {completingSession.title}
            </div>
          )}
          <div className="modal-grid-2">
            <Input label="Duração real (min)" type="number" value={completeForm.actualDurationMinutes} onChange={setCF('actualDurationMinutes')} />
            <Input label="Distância real (km)" type="number" value={completeForm.actualDistanceKm} onChange={setCF('actualDistanceKm')} step="0.1" />
          </div>
          <div className="modal-grid-2">
            <Input label="FC média (bpm)" type="number" value={completeForm.averageHeartRate} onChange={setCF('averageHeartRate')} />
            <Input label="Esforço (1-10)" type="number" value={completeForm.perceivedEffort} onChange={setCF('perceivedEffort')} min="1" max="10" />
          </div>
          <div className="modal-field">
            <label className="modal-field__label">Notas</label>
            <textarea value={completeForm.notes} onChange={setCF('notes')} rows={2}
              className="modal-textarea" placeholder="Como correu o treino?" />
          </div>
          <div className="modal-actions">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setCompleteModal(false)}>Cancelar</Button>
            <Button type="submit" loading={saving} className="flex-1">
              {completingSession?.result ? 'Atualizar' : 'Registar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ---- Sub-components ----

interface MacroProps {
  macro: MacrocycleResponse
  expanded: boolean
  onToggle: () => void
  expandedMicro: number | null
  onToggleMicro: (id: number) => void
  sessionsMap: Record<number, SessionResponse[]>
  loadingSessions: Set<number>
  onEditMacro: () => void
  onDeleteMacro: () => void
  onCreateMicro: () => void
  onEditMicro: (m: MicrocycleResponse, macro: MacrocycleResponse) => void
  onDeleteMicro: (m: MicrocycleResponse) => void
  onCreateSession: (microId: number) => void
  onBulkCreateSession: (micro: MicrocycleResponse) => void
  onEditSession: (s: SessionResponse) => void
  onDeleteSession: (s: SessionResponse) => void
  onCompleteSession: (s: SessionResponse) => void
  onUncompleteSession: (s: SessionResponse) => void
}

function MacrocycleBlock({ macro, expanded, onToggle, ...rest }: MacroProps) {
  const MACRO_TYPE_LABEL: Record<string, string> = {
    BASE: 'Base', BUILD: 'Construção', PEAK: 'Pico', RACE: 'Prova', RECOVERY: 'Recuperação',
  }

  return (
    <div className="macro-block">
      <div className="macro-block__header" onClick={onToggle}>
        <div className="macro-block__left">
          <svg
            className={`macro-block__chevron ${expanded ? 'macro-block__chevron--open' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div>
            <div className="macro-block__title-row">
              <h3 className="macro-block__name">{macro.name}</h3>
              <Badge color={macroTypeColor[macro.type] || 'slate'}>
                {MACRO_TYPE_LABEL[macro.type] || macro.type}
              </Badge>
            </div>
            <p className="macro-block__dates">
              {formatDate(macro.startDate)} → {formatDate(macro.endDate)}
              {' · '}{macro.microcycles.length} microciclos
            </p>
          </div>
        </div>
        <div className="macro-block__actions" onClick={(e) => e.stopPropagation()}>
          <button onClick={rest.onEditMacro} className="icon-btn icon-btn--edit">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button onClick={rest.onDeleteMacro} className="icon-btn icon-btn--delete">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="macro-block__body">
          {macro.goals && (
            <p className="macro-block__goals">"{macro.goals}"</p>
          )}

          <div className="micro-header">
            <p className="micro-header__label">Microciclos</p>
            <button onClick={rest.onCreateMicro} className="micro-header__add">
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Adicionar semana
            </button>
          </div>

          {macro.microcycles.length === 0 ? (
            <p className="micro-empty">Sem microciclos. Adiciona uma semana.</p>
          ) : (
            <div className="micro-list">
              {macro.microcycles.map((micro) => (
                <MicrocycleBlock
                  key={micro.id}
                  micro={micro}
                  expanded={rest.expandedMicro === micro.id}
                  onToggle={() => rest.onToggleMicro(micro.id)}
                  sessions={rest.sessionsMap[micro.id]}
                  loadingSessions={rest.loadingSessions.has(micro.id)}
                  onEdit={() => rest.onEditMicro(micro, macro)}
                  onDelete={() => rest.onDeleteMicro(micro)}
                  onCreateSession={() => rest.onCreateSession(micro.id)}
                  onBulkCreateSession={() => rest.onBulkCreateSession(micro)}
                  onEditSession={rest.onEditSession}
                  onDeleteSession={rest.onDeleteSession}
                  onCompleteSession={rest.onCompleteSession}
                  onUncompleteSession={rest.onUncompleteSession}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MicrocycleBlock({
  micro, expanded, onToggle, sessions, loadingSessions,
  onEdit, onDelete, onCreateSession, onBulkCreateSession, onEditSession, onDeleteSession, onCompleteSession, onUncompleteSession,
}: {
  micro: MicrocycleResponse
  expanded: boolean
  onToggle: () => void
  sessions?: SessionResponse[]
  loadingSessions: boolean
  onEdit: () => void
  onDelete: () => void
  onCreateSession: () => void
  onBulkCreateSession: () => void
  onEditSession: (s: SessionResponse) => void
  onDeleteSession: (s: SessionResponse) => void
  onCompleteSession: (s: SessionResponse) => void
  onUncompleteSession: (s: SessionResponse) => void
}) {
  const FOCUS_LABEL: Record<string, string> = {
    VOLUME: 'Volume', INTENSITY: 'Intensidade', RECOVERY: 'Recuperação', TEST: 'Teste',
  }
  const FOCUS_COLOR: Record<string, 'blue' | 'red' | 'green' | 'yellow'> = {
    VOLUME: 'blue', INTENSITY: 'red', RECOVERY: 'green', TEST: 'yellow',
  }
  const completedCount = sessions?.filter((s) => s.completed).length ?? 0
  const totalCount = sessions?.length ?? micro.totalSessions

  return (
    <div className="micro-block">
      <div className="micro-block__header" onClick={onToggle}>
        <div className="micro-block__left">
          <svg
            className={`micro-block__chevron ${expanded ? 'micro-block__chevron--open' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div>
            <div className="micro-block__title-row">
              <span className="micro-block__week">Semana {micro.weekNumber}</span>
              {micro.focus && (
                <Badge color={FOCUS_COLOR[micro.focus] || 'slate'}>
                  {FOCUS_LABEL[micro.focus] || micro.focus}
                </Badge>
              )}
            </div>
            <p className="micro-block__dates">
              {formatDate(micro.startDate)} → {formatDate(micro.endDate)}
              {sessions && ` · ${completedCount}/${totalCount} sessões`}
              {micro.totalPlannedHours && ` · ${micro.totalPlannedHours}h`}
            </p>
          </div>
        </div>
        <div className="micro-block__actions" onClick={(e) => e.stopPropagation()}>
          <button onClick={onEdit} className="micro-icon-btn micro-icon-btn--edit">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button onClick={onDelete} className="micro-icon-btn micro-icon-btn--delete">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="micro-block__body">
          <div className="sessions-header">
            <p className="sessions-header__label">Sessões</p>
            <button onClick={onBulkCreateSession} className="sessions-header__add">
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Adicionar sessão
            </button>
          </div>

          {loadingSessions ? (
            <div className="sessions-loading">
              <div className="sessions-spinner" />
            </div>
          ) : !sessions || sessions.length === 0 ? (
            <p className="sessions-empty">Sem sessões. Adiciona um treino.</p>
          ) : (
            <div className="sessions-list">
              {sessions.sort((a, b) => a.date.localeCompare(b.date)).map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  onEdit={() => onEditSession(session)}
                  onDelete={() => onDeleteSession(session)}
                  onComplete={() => onCompleteSession(session)}
                  onUncomplete={() => onUncompleteSession(session)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SessionRow({ session, onEdit, onDelete, onComplete, onUncomplete }: {
  session: SessionResponse
  onEdit: () => void
  onDelete: () => void
  onComplete: () => void
  onUncomplete: () => void
}) {
  const ZONE_COLOR: Record<string, 'green' | 'blue' | 'yellow' | 'orange' | 'red'> = {
    Z1: 'green', Z2: 'blue', Z3: 'yellow', Z4: 'orange', Z5: 'red',
  }

  return (
    <div className={`session-row ${session.completed ? 'session-row--completed' : 'session-row--pending'}`}>
      <button
        onClick={session.completed ? onUncomplete : onComplete}
        className={`session-complete-btn ${session.completed ? 'session-complete-btn--done' : 'session-complete-btn--pending'}`}
      >
        {session.completed && (
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="session-content">
        <div className="session-title-row">
          <span className="session-title">
            {workoutIcon[session.workoutType]} {session.title}
          </span>
          {session.intensityZone && (
            <Badge color={ZONE_COLOR[session.intensityZone] || 'slate'}>{session.intensityZone}</Badge>
          )}
        </div>
        <div className="session-meta">
          <span>{formatDate(session.date)}</span>
          {session.plannedDurationMinutes && <span>{session.plannedDurationMinutes} min</span>}
          {session.plannedDistanceKm && <span>{session.plannedDistanceKm} km</span>}
          {session.completed && session.result && (
            <span className="session-result">
              ✓ {session.result.actualDurationMinutes && `${session.result.actualDurationMinutes}min`}
              {session.result.perceivedEffort && ` · RPE ${session.result.perceivedEffort}/10`}
            </span>
          )}
        </div>
        {session.exercises && session.exercises.length > 0 && (
          <div className="session-exercises">
            {session.exercises.map((ex, i) => (
              <span key={i} className="session-exercise-tag">
                {ex.name}{ex.sets && ex.reps ? ` ${ex.sets}×${ex.reps}` : ''}{ex.weightKg ? ` @${ex.weightKg}kg` : ''}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="session-actions">
        <button onClick={onEdit} className="session-icon-btn session-icon-btn--edit">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button onClick={onDelete} className="session-icon-btn session-icon-btn--delete">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}
