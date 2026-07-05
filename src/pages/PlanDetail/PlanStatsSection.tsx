import { useEffect, useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { plansApi, type PlanStatsResponse, type WorkoutTypeBreakdown } from '../../api/plans'
import './PlanStatsSection.css'

const WORKOUT_LABEL: Record<string, string> = {
  SWIM: 'Natação', BIKE: 'Ciclismo', RUN: 'Corrida', STRENGTH: 'Força',
  HYROX: 'HYROX', CROSSFIT: 'CrossFit', BRICK: 'Brick', REST: 'Descanso',
}
const WORKOUT_COLOR: Record<string, string> = {
  SWIM: '#0ea5e9', BIKE: '#f97316', RUN: '#22c55e', STRENGTH: '#a855f7',
  HYROX: '#ef4444', CROSSFIT: '#eab308', BRICK: '#64748b', REST: '#cbd5e1',
}

interface Props {
  planId: number
}

export function PlanStatsSection({ planId }: Props) {
  const [stats, setStats] = useState<PlanStatsResponse | null>(null)
  const [scope, setScope] = useState<'overall' | number>('overall')
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    plansApi.getPlanStats(planId).then(setStats).catch(() => {})
  }, [planId])

  const breakdown: WorkoutTypeBreakdown[] = useMemo(() => {
    if (!stats) return []
    if (scope === 'overall') return stats.overall
    return stats.byMacrocycle.find((m) => m.macrocycleId === scope)?.breakdown ?? []
  }, [stats, scope])

  if (!stats || stats.overall.length === 0) return null

  const totalMinutes = breakdown.reduce((sum, b) => sum + b.totalPlannedMinutes, 0)
  const totalActual = breakdown.reduce((sum, b) => sum + b.totalActualMinutes, 0)
  const totalSessions = breakdown.reduce((sum, b) => sum + b.sessionCount, 0)

  return (
    <div className="pss">
      <button className="pss__toggle" onClick={() => setExpanded((v) => !v)}>
        <svg className={`pss__chevron ${expanded ? 'pss__chevron--open' : ''}`} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        Estatísticas de treino
      </button>

      {expanded && (
        <div className="pss__body">
          <div className="pss__scope">
            <button
              className={`pss__scope-btn ${scope === 'overall' ? 'pss__scope-btn--active' : ''}`}
              onClick={() => setScope('overall')}
            >
              Total do plano
            </button>
            {stats.byMacrocycle.map((m) => (
              <button
                key={m.macrocycleId}
                className={`pss__scope-btn ${scope === m.macrocycleId ? 'pss__scope-btn--active' : ''}`}
                onClick={() => setScope(m.macrocycleId)}
              >
                {m.macrocycleName}
              </button>
            ))}
          </div>

          {breakdown.length === 0 ? (
            <p className="pss__empty">Sem sessões neste âmbito.</p>
          ) : (
            <div className="pss__content">
              <div className="pss__chart">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={breakdown} dataKey="totalPlannedMinutes" nameKey="workoutType" innerRadius={50} outerRadius={80} paddingAngle={2}>
                      {breakdown.map((b) => (
                        <Cell key={b.workoutType} fill={WORKOUT_COLOR[b.workoutType] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any, name: any) => [`${value} min`, WORKOUT_LABEL[name] || name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="pss__table-wrap">
                <table className="pss__table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Sessões</th>
                      <th>Min. planeados</th>
                      <th>Min. reais</th>
                      <th>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdown.map((b) => (
                      <tr key={b.workoutType}>
                        <td className="pss__type-cell">
                          <span className="pss__dot" style={{ background: WORKOUT_COLOR[b.workoutType] || '#94a3b8' }} />
                          {WORKOUT_LABEL[b.workoutType] || b.workoutType}
                        </td>
                        <td>{b.sessionCount}</td>
                        <td>{b.totalPlannedMinutes}</td>
                        <td>{b.totalActualMinutes || '—'}</td>
                        <td>{b.percentage}%</td>
                      </tr>
                    ))}
                    <tr className="pss__table-total">
                      <td>Total</td>
                      <td>{totalSessions}</td>
                      <td>{totalMinutes}</td>
                      <td>{totalActual || '—'}</td>
                      <td>100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
