import { useEffect, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { exerciseLogsApi, type ExerciseLogResponse } from '../../api/exerciseLogs'
import './Progress.css'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
}

function calcVolume(log: ExerciseLogResponse) {
  return log.sets
    .filter(s => s.completed && s.reps && s.weightKg)
    .reduce((sum, s) => sum + (s.reps! * s.weightKg!), 0)
}

export function ProgressPage() {
  const [knownExercises, setKnownExercises] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [history, setHistory] = useState<ExerciseLogResponse[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    exerciseLogsApi.knownExercises().then(setKnownExercises).catch(() => {})
  }, [])

  const filtered = knownExercises.filter(e =>
    e.toLowerCase().includes(search.toLowerCase())
  )

  const selectExercise = async (name: string) => {
    setSelected(name)
    setSearch(name)
    setLoading(true)
    try {
      const data = await exerciseLogsApi.history(name)
      setHistory(data.slice().reverse()) // oldest first for charts
    } finally {
      setLoading(false)
    }
  }

  // Chart data
  const rmData = history
    .filter(h => h.estimatedOneRepMax)
    .map(h => ({
      date: formatDate(h.loggedAt),
      rm: h.estimatedOneRepMax,
    }))

  const volumeData = history.map(h => ({
    date: formatDate(h.loggedAt),
    volume: Math.round(calcVolume(h)),
  }))

  // Stats
  const allRMs = history.map(h => h.estimatedOneRepMax).filter(Boolean) as number[]
  const currentRM = allRMs[allRMs.length - 1]
  const bestRM = Math.max(...allRMs)
  const firstRM = allRMs[0]
  const rmGain = currentRM && firstRM ? +(currentRM - firstRM).toFixed(1) : null

  const showDropdown = search.length > 0 && !selected && filtered.length > 0

  return (
    <div className="progress-page">
      <div className="progress-header">
        <h1 className="progress-title">Evolução</h1>
        <p className="progress-sub">Progressão de carga e 1RM estimado por exercício</p>
      </div>

      {/* Exercise picker */}
      <div className="progress-picker">
        <div className="progress-search-wrap">
          <svg className="progress-search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="progress-search"
            value={search}
            onChange={e => { setSearch(e.target.value); setSelected(null) }}
            placeholder="Pesquisa exercício (ex: Squat, Deadlift...)"
          />
          {search && (
            <button className="progress-search-clear" onClick={() => { setSearch(''); setSelected(null); setHistory([]) }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {showDropdown && (
          <div className="progress-dropdown">
            {filtered.map(name => (
              <button key={name} className="progress-dropdown-item" onClick={() => selectExercise(name)}>
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Empty state */}
      {!selected && (
        <div className="progress-empty">
          {knownExercises.length === 0 ? (
            <>
              <p className="progress-empty__icon">💪</p>
              <h2>Sem dados ainda</h2>
              <p>Regista os teus treinos de força para ver a evolução aqui.</p>
            </>
          ) : (
            <>
              <p className="progress-empty__icon">🔍</p>
              <h2>Escolhe um exercício</h2>
              <p>Tens {knownExercises.length} exercício{knownExercises.length !== 1 ? 's' : ''} registado{knownExercises.length !== 1 ? 's' : ''}.</p>
              <div className="progress-exercise-chips">
                {knownExercises.slice(0, 8).map(name => (
                  <button key={name} className="progress-chip" onClick={() => selectExercise(name)}>
                    {name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="progress-loading">
          <div className="progress-spinner" />
        </div>
      )}

      {/* Content */}
      {selected && !loading && history.length > 0 && (
        <div className="progress-content">

          {/* Stats cards */}
          <div className="progress-stats">
            <div className="progress-stat">
              <span className="progress-stat__label">1RM atual estimado</span>
              <span className="progress-stat__value">{currentRM ? `${currentRM} kg` : '—'}</span>
            </div>
            <div className="progress-stat">
              <span className="progress-stat__label">Melhor 1RM</span>
              <span className="progress-stat__value progress-stat__value--highlight">{bestRM ? `${bestRM} kg` : '—'}</span>
            </div>
            <div className="progress-stat">
              <span className="progress-stat__label">Evolução total</span>
              <span className={`progress-stat__value ${rmGain && rmGain > 0 ? 'progress-stat__value--positive' : rmGain && rmGain < 0 ? 'progress-stat__value--negative' : ''}`}>
                {rmGain !== null ? `${rmGain > 0 ? '+' : ''}${rmGain} kg` : '—'}
              </span>
            </div>
            <div className="progress-stat">
              <span className="progress-stat__label">Sessões registadas</span>
              <span className="progress-stat__value">{history.length}</span>
            </div>
          </div>

          {/* 1RM chart */}
          {rmData.length > 1 && (
            <div className="progress-chart-card">
              <h2 className="progress-chart-title">1RM Estimado</h2>
              <p className="progress-chart-sub">Evolução do 1RM calculado a cada sessão</p>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={rmData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    domain={['auto', 'auto']}
                    unit=" kg"
                    width={55}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
                    formatter={(v: number) => [`${v} kg`, '1RM est.']}
                  />
                  {bestRM && (
                    <ReferenceLine y={bestRM} stroke="#f97316" strokeDasharray="4 4" label={{ value: 'Máximo', fill: '#f97316', fontSize: 11 }} />
                  )}
                  <Line
                    type="monotone"
                    dataKey="rm"
                    stroke="#f97316"
                    strokeWidth={2.5}
                    dot={{ fill: '#f97316', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Volume chart */}
          {volumeData.length > 1 && (
            <div className="progress-chart-card">
              <h2 className="progress-chart-title">Volume por sessão</h2>
              <p className="progress-chart-sub">Soma de reps × kg em cada sessão</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={volumeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} width={55} />
                  <Tooltip
                    contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
                    formatter={(v: number) => [`${v} kg·rep`, 'Volume']}
                  />
                  <Bar dataKey="volume" fill="#fed7aa" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Sessions table */}
          <div className="progress-chart-card">
            <h2 className="progress-chart-title">Histórico de sessões</h2>
            <div className="progress-table-wrap">
              <table className="progress-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Séries</th>
                    <th>Melhor série</th>
                    <th>Volume</th>
                    <th>1RM est.</th>
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().map(log => {
                    const bestSet = log.sets
                      .filter(s => s.completed && s.weightKg)
                      .sort((a, b) => (b.weightKg ?? 0) - (a.weightKg ?? 0))[0]
                    return (
                      <tr key={log.id}>
                        <td>{formatDate(log.loggedAt)}</td>
                        <td>{log.sets.filter(s => s.completed).length} séries</td>
                        <td>
                          {bestSet
                            ? `${bestSet.reps} × ${bestSet.weightKg} kg`
                            : '—'}
                        </td>
                        <td>{Math.round(calcVolume(log))} kg·rep</td>
                        <td className="progress-table__rm">
                          {log.estimatedOneRepMax ? `${log.estimatedOneRepMax} kg` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selected && !loading && history.length === 0 && (
        <div className="progress-empty">
          <p className="progress-empty__icon">📭</p>
          <h2>Sem sessões para "{selected}"</h2>
          <p>Regista um treino com este exercício para ver a evolução.</p>
        </div>
      )}
    </div>
  )
}
