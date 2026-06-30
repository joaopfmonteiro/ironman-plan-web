import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { plansApi } from '../../api/plans'
import { racesApi } from '../../api/races'
import type { PlanSummaryResponse, RaceResponse } from '../../types'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { CreatePlanModal } from './CreatePlanModal'
import './PlansPage.css'

function formatDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function PlansPage() {
  const [plans, setPlans] = useState<PlanSummaryResponse[]>([])
  const [races, setRaces] = useState<RaceResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([plansApi.list(), racesApi.list()])
      .then(([p, r]) => { setPlans(p); setRaces(r) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: number) => {
    if (!confirm('Tens a certeza que queres eliminar este plano e todo o seu conteúdo?')) return
    await plansApi.delete(id)
    load()
  }

  return (
    <div className="plans-page">
      <div className="plans-header">
        <div>
          <h1 className="plans-header-title">Planos de Treino</h1>
          <p className="plans-header-subtitle">Gere os teus planos de periodização</p>
        </div>
        <div className="plans-header-actions">
          <Link to="/templates">
            <Button variant="secondary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Usar programa
            </Button>
          </Link>
          <Button onClick={() => setModalOpen(true)}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo Plano
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="plans-loading">
          <div className="plans-spinner" />
        </div>
      ) : plans.length === 0 ? (
        <div className="plans-empty">
          <p className="plans-empty__icon">📋</p>
          <h2 className="plans-empty__title">Nenhum plano criado</h2>
          <p className="plans-empty__desc">Cria um plano do zero ou usa um dos nossos programas pré-definidos.</p>
          <div className="plans-empty__actions">
            <Link to="/templates"><Button variant="secondary">Ver programas</Button></Link>
            <Button onClick={() => setModalOpen(true)}>Criar plano</Button>
          </div>
        </div>
      ) : (
        <div className="plans-grid">
          {plans.map((plan) => (
            <div key={plan.id} className="plan-card">
              <div className="plan-card__header">
                <div className="plan-card__info">
                  <h3 className="plan-card__name">{plan.name}</h3>
                  {plan.description && <p className="plan-card__desc">{plan.description}</p>}
                </div>
                {plan.isActive && <Badge color="green">Ativo</Badge>}
              </div>

              {plan.targetRaceName && (
                <p className="plan-card__race">🏁 {plan.targetRaceName}</p>
              )}

              <div className="plan-card__meta">
                <div>
                  <p className="plan-card__meta-label">Início</p>
                  <p className="plan-card__meta-value">{formatDate(plan.startDate)}</p>
                </div>
                <div>
                  <p className="plan-card__meta-label">Fim</p>
                  <p className="plan-card__meta-value">{formatDate(plan.endDate)}</p>
                </div>
                <div>
                  <p className="plan-card__meta-label">Macrociclos</p>
                  <p className="plan-card__meta-value">{plan.totalMacrocycles}</p>
                </div>
                <div>
                  <p className="plan-card__meta-label">Sessões</p>
                  <p className="plan-card__meta-value">{plan.totalSessions}</p>
                </div>
              </div>

              <div className="plan-card__actions">
                <Link to={`/plans/${plan.id}`} style={{ flex: 1 }}>
                  <Button variant="secondary" className="w-full">Ver detalhes</Button>
                </Link>
                <Button variant="danger" size="sm" onClick={() => handleDelete(plan.id)}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreatePlanModal
        open={modalOpen}
        races={races}
        onClose={() => setModalOpen(false)}
        onCreated={load}
      />
    </div>
  )
}
