import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { plansApi } from '../../api/plans'
import { racesApi } from '../../api/races'
import type { PlanSummaryResponse, RaceResponse, SessionResponse } from '../../types'
import { Badge } from '../../components/ui/Badge'
import { WeightChart } from './WeightChart'
import './DashboardPage.css'

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="stat-card">
      <p className="stat-card__label">{label}</p>
      <p className="stat-card__value">{value}</p>
      {sub && <p className="stat-card__sub">{sub}</p>}
    </div>
  )
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / 86400000)
}

const raceDistanceLabel: Record<string, string> = {
  SPRINT: 'Sprint',
  OLYMPIC: 'Olímpico',
  IRON70: 'Ironman 70.3',
  IRON140: 'Ironman 140.6',
}

const workoutIcon: Record<string, string> = {
  RUN: '🏃', SWIM: '🏊', BIKE: '🚴', STRENGTH: '🏋️', HYROX: '⚡', CROSSFIT: '🔥',
  BRICK: '🧱', REST: '😴', OTHER: '📋',
}

function fmtSessionDate(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  if (dateStr === today) return 'Hoje'
  if (dateStr === tomorrow) return 'Amanhã'
  return new Date(dateStr).toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function DashboardPage() {
  const { user } = useAuthStore()
  const [plans, setPlans] = useState<PlanSummaryResponse[]>([])
  const [races, setRaces] = useState<RaceResponse[]>([])
  const [nextSession, setNextSession] = useState<SessionResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([plansApi.list(), racesApi.list(), plansApi.nextSession()])
      .then(([p, r, ns]) => {
        setPlans(p)
        setRaces(r)
        setNextSession(ns)
      })
      .finally(() => setLoading(false))
  }, [])

  const activePlan = plans.find((p) => p.isActive)
  const upcomingRaces = races
    .filter((r) => daysUntil(r.date) > 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const nextRace = upcomingRaces[0]

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="dashboard-page">
      {/* Header */}
      {loading ? (
        <div className="dashboard-loading">
          <div className="dashboard-spinner" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="dashboard-stats">
            <StatCard label="Planos ativos" value={plans.filter((p) => p.isActive).length} />
            <StatCard label="Total de planos" value={plans.length} />
            <StatCard label="Provas registadas" value={races.length} />
            <StatCard
              label="Próxima prova"
              value={nextRace ? `${daysUntil(nextRace.date)} dias` : '—'}
              sub={nextRace?.name}
            />
          </div>

          <div className="dashboard-grid">
            {/* Active Plan */}
            <div className="dashboard-card">
              <div className="dashboard-card__header">
                <h2 className="dashboard-card__title">Plano Ativo</h2>
                <Link to="/plans" className="dashboard-card__link">Ver todos</Link>
              </div>
              {activePlan ? (
                <Link to={`/plans/${activePlan.id}`} className="active-plan-link">
                  <div className="active-plan-box">
                    <div className="active-plan-box__header">
                      <div>
                        <p className="active-plan-box__name">{activePlan.name}</p>
                        {activePlan.description && (
                          <p className="active-plan-box__desc">{activePlan.description}</p>
                        )}
                      </div>
                      <Badge color="blue">Ativo</Badge>
                    </div>
                    <div className="active-plan-stats">
                      <div>
                        <p className="active-plan-meta__label">Início</p>
                        <p className="active-plan-meta__value">{formatDate(activePlan.startDate)}</p>
                      </div>
                      {activePlan.endDate && (
                        <div>
                          <p className="active-plan-meta__label">Fim</p>
                          <p className="active-plan-meta__value">{formatDate(activePlan.endDate)}</p>
                        </div>
                      )}
                      <div>
                        <p className="active-plan-meta__label">Macrociclos</p>
                        <p className="active-plan-meta__value">{activePlan.totalMacrocycles}</p>
                      </div>
                      <div>
                        <p className="active-plan-meta__label">Sessões</p>
                        <p className="active-plan-meta__value">{activePlan.totalSessions}</p>
                      </div>
                    </div>
                    {activePlan.targetRaceName && (
                      <div className="active-plan-divider">
                        <p className="active-plan-meta__label">Prova alvo</p>
                        <p className="active-plan-meta__value">🏁 {activePlan.targetRaceName}</p>
                      </div>
                    )}
                  </div>
                </Link>
              ) : (
                <div className="dashboard-empty">
                  <p className="dashboard-empty__text">Sem plano ativo</p>
                  <Link to="/plans" className="dashboard-empty__link">
                    Criar ou ativar um plano →
                  </Link>
                </div>
              )}
            </div>

            {/* Upcoming Races */}
            <div className="dashboard-card">
              <div className="dashboard-card__header">
                <h2 className="dashboard-card__title">Próximas Provas</h2>
                <Link to="/races" className="dashboard-card__link">Ver todas</Link>
              </div>
              {upcomingRaces.length === 0 ? (
                <div className="dashboard-empty">
                  <p className="dashboard-empty__text">Nenhuma prova agendada</p>
                  <Link to="/races" className="dashboard-empty__link">
                    Adicionar prova →
                  </Link>
                </div>
              ) : (
                <div className="races-list">
                  {upcomingRaces.slice(0, 4).map((race) => {
                    const days = daysUntil(race.date)
                    return (
                      <div key={race.id} className="race-item">
                        <div>
                          <p className="race-item__name">{race.name}</p>
                          <p className="race-item__meta">
                            {formatDate(race.date)} • {raceDistanceLabel[race.distance] || race.distance}
                          </p>
                        </div>
                        <Badge color={days <= 30 ? 'orange' : days <= 90 ? 'yellow' : 'slate'}>
                          {days}d
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="dashboard-bottom-grid">
            {/* Next session */}
            <div className="dashboard-card">
              <div className="dashboard-card__header">
                <h2 className="dashboard-card__title">Próximo Treino</h2>
                <Link to="/plans" className="dashboard-card__link">Ver planos</Link>
              </div>
              {nextSession ? (
                <Link to={`/plans/${nextSession.planId}`} className="next-session-inner">
                  <div className="next-session-type">
                    <span className="next-session-icon">{workoutIcon[nextSession.workoutType]}</span>
                    <div>
                      <p className="next-session-title">{nextSession.title}</p>
                      <div className="next-session-meta">
                        <span className={`next-session-date ${nextSession.date === new Date().toISOString().slice(0,10) ? 'next-session-date--today' : ''}`}>
                          {fmtSessionDate(nextSession.date)}
                        </span>
                        {nextSession.plannedDurationMinutes && <span>{nextSession.plannedDurationMinutes} min</span>}
                        {nextSession.plannedDistanceKm && <span>{nextSession.plannedDistanceKm} km</span>}
                      </div>
                    </div>
                  </div>
                  {nextSession.exercises && nextSession.exercises.length > 0 && (
                    <div className="next-session-exercises">
                      {nextSession.exercises.slice(0, 5).map((ex, i) => (
                        <span key={i} className="next-session-ex-tag">
                          {ex.name}{ex.sets && ex.reps ? ` ${ex.sets}×${ex.reps}` : ''}
                        </span>
                      ))}
                      {nextSession.exercises.length > 5 && (
                        <span className="next-session-ex-tag">+{nextSession.exercises.length - 5}</span>
                      )}
                    </div>
                  )}
                </Link>
              ) : (
                <div className="dashboard-empty">
                  <p className="dashboard-empty__text">Sem treinos agendados</p>
                  <Link to="/plans" className="dashboard-empty__link">Criar sessão →</Link>
                </div>
              )}
            </div>

            <WeightChart />
          </div>

          {/* All plans quick list */}
          {plans.length > 0 && (
            <div className="dashboard-all-plans">
              <div className="dashboard-card__header">
                <h2 className="dashboard-card__title">Todos os Planos</h2>
                <Link to="/plans" className="dashboard-card__link">Gerir</Link>
              </div>
              <div className="plans-list">
                {plans.map((plan) => (
                  <Link key={plan.id} to={`/plans/${plan.id}`} className="plan-item">
                    <div className="plan-item__left">
                      <div className={`plan-item__dot ${plan.isActive ? 'plan-item__dot--active' : 'plan-item__dot--inactive'}`} />
                      <span className="plan-item__name">{plan.name}</span>
                    </div>
                    <div className="plan-item__right">
                      <span>{plan.totalSessions} sessões</span>
                      {plan.isActive && <Badge color="green">Ativo</Badge>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
