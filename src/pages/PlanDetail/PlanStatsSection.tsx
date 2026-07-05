import { useEffect, useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { plansApi, type PlanStatsResponse, type WorkoutTypeBreakdown, type StrengthStats } from '../../api/plans'
import { MUSCLE_LABELS } from '../../components/ExercisePicker'
import './PlanStatsSection.css'

const WORKOUT_LABEL: Record<string, string> = {
  SWIM: 'Natação', BIKE: 'Ciclismo', RUN: 'Corrida', STRENGTH: 'Força',
  HYROX: 'HYROX', CROSSFIT: 'CrossFit', BRICK: 'Brick', REST: 'Descanso',
}
const WORKOUT_COLOR: Record<string, string> = {
  SWIM: '#0ea5e9', BIKE: '#f97316', RUN: '#22c55e', STRENGTH: '#a855f7',
  HYROX: '#ef4444', CROSSFIT: '#eab308', BRICK: '#64748b', REST: '#cbd5e1',
}

const MUSCLE_COLOR: Record<string, string> = {
  CHEST: '#f97316', BACK: '#0ea5e9', SHOULDERS: '#a855f7', BICEPS: '#22c55e',
  TRICEPS: '#eab308', FOREARMS: '#14b8a6', QUADRICEPS: '#ef4444', HAMSTRINGS: '#f43f5e',
  GLUTES: '#ec4899', CALVES: '#8b5cf6', ABS: '#64748b', FULL_BODY: '#06b6d4', CARDIO: '#d946ef',
}

type MuscleMetric = 'sessionCount' | 'totalSets'

interface Props {
  planId: number
}

export function PlanStatsSection({ planId }: Props) {
  const [stats, setStats] = useState<PlanStatsResponse | null>(null)
  const [scope, setScope] = useState<'overall' | number>('overall')
  const [expanded, setExpanded] = useState(false)
  const [muscleMetric, setMuscleMetric] = useState<MuscleMetric>('sessionCount')

  useEffect(() => {
    plansApi.getPlanStats(planId).then(setStats).catch(() => {})
  }, [planId])

  const breakdown: WorkoutTypeBreakdown[] = useMemo(() => {
    if (!stats) return []
    if (scope === 'overall') return stats.overall
    return stats.byMacrocycle.find((m) => m.macrocycleId === scope)?.breakdown ?? []
  }, [stats, scope])

  const strength: StrengthStats | null = useMemo(() => {
    if (!stats) return null
    if (scope === 'overall') return stats.strengthOverall
    return stats.byMacrocycle.find((m) => m.macrocycleId === scope)?.strength ?? null
  }, [stats, scope])

  if (!stats || stats.overall.length === 0) return null

  const totalMinutes = breakdown.reduce((sum, b) => sum + b.totalPlannedMinutes, 0)
  const totalActual = breakdown.reduce((sum, b) => sum + b.totalActualMinutes, 0)
  const totalSessions = breakdown.reduce((sum, b) => sum + b.sessionCount, 0)

  const hasStrengthData = !!strength && strength.topExercises.length > 0
  const topExercisesChart = strength
    ? [...strength.topExercises].reverse().map((e) => ({ ...e, label: e.exerciseName }))
    : []
  const topMuscle = strength?.muscleGroups[0]
  const topExercise = strength?.topExercises[0]

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

          {hasStrengthData && strength && (
            <div className="pss__strength">
              <p className="pss__strength-title">Força — o que mais treinei</p>

              <div className="pss__quick-stats">
                <div className="pss__quick-stat">
                  <span className="pss__quick-stat-value">{strength.totalStrengthSessions}</span>
                  <span className="pss__quick-stat-label">treinos de força registados</span>
                </div>
                <div className="pss__quick-stat">
                  <span className="pss__quick-stat-value">{strength.totalSets}</span>
                  <span className="pss__quick-stat-label">séries no total</span>
                </div>
                {topExercise && (
                  <div className="pss__quick-stat">
                    <span className="pss__quick-stat-value">{topExercise.exerciseName}</span>
                    <span className="pss__quick-stat-label">exercício mais feito ({topExercise.sessionCount}×)</span>
                  </div>
                )}
                {topMuscle && (
                  <div className="pss__quick-stat">
                    <span className="pss__quick-stat-value">{MUSCLE_LABELS[topMuscle.muscleGroup as keyof typeof MUSCLE_LABELS] || topMuscle.muscleGroup}</span>
                    <span className="pss__quick-stat-label">grupo muscular mais treinado</span>
                  </div>
                )}
              </div>

              <div className="pss__strength-grid">
                <div className="pss__strength-card">
                  <p className="pss__strength-card-title">Exercícios mais feitos</p>
                  <ResponsiveContainer width="100%" height={Math.max(160, topExercisesChart.length * 32)}>
                    <BarChart data={topExercisesChart} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 11, fill: '#334155' }} />
                      <Tooltip
                        formatter={(value: any, _name: any, item: any) => [`${value}×  ·  ${item?.payload?.totalSets ?? 0} séries`, 'Vezes feito']}
                      />
                      <Bar dataKey="sessionCount" radius={[0, 4, 4, 0]}>
                        {topExercisesChart.map((e) => (
                          <Cell key={e.exerciseId} fill={e.muscleGroup ? MUSCLE_COLOR[e.muscleGroup] || '#94a3b8' : '#94a3b8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="pss__strength-card">
                  <div className="pss__strength-card-header">
                    <p className="pss__strength-card-title">Grupos musculares</p>
                    <div className="pss__metric-toggle">
                      <button
                        className={`pss__metric-btn ${muscleMetric === 'sessionCount' ? 'pss__metric-btn--active' : ''}`}
                        onClick={() => setMuscleMetric('sessionCount')}
                      >
                        Nº treinos
                      </button>
                      <button
                        className={`pss__metric-btn ${muscleMetric === 'totalSets' ? 'pss__metric-btn--active' : ''}`}
                        onClick={() => setMuscleMetric('totalSets')}
                      >
                        Nº séries
                      </button>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={strength.muscleGroups} dataKey={muscleMetric} nameKey="muscleGroup" innerRadius={50} outerRadius={80} paddingAngle={2}>
                        {strength.muscleGroups.map((m) => (
                          <Cell key={m.muscleGroup} fill={MUSCLE_COLOR[m.muscleGroup] || '#94a3b8'} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any, name: any) => [
                          muscleMetric === 'sessionCount' ? `${value} treinos` : `${value} séries`,
                          MUSCLE_LABELS[name as keyof typeof MUSCLE_LABELS] || name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pss__muscle-legend">
                    {strength.muscleGroups.map((m) => (
                      <span key={m.muscleGroup} className="pss__muscle-legend-item">
                        <span className="pss__dot" style={{ background: MUSCLE_COLOR[m.muscleGroup] || '#94a3b8' }} />
                        {MUSCLE_LABELS[m.muscleGroup as keyof typeof MUSCLE_LABELS] || m.muscleGroup}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
