import type { SessionResponse } from '../../types'
import './SessionViewModal.css'

const workoutTypeLabel: Record<string, string> = {
  SWIM: 'Natação', BIKE: 'Ciclismo', RUN: 'Corrida',
  STRENGTH: 'Força', HYROX: 'Hyrox', CROSSFIT: 'CrossFit',
  BRICK: 'Brick', REST: 'Descanso',
}

const workoutIcon: Record<string, string> = {
  SWIM: '🏊', BIKE: '🚴', RUN: '🏃', STRENGTH: '💪',
  HYROX: '🔥', CROSSFIT: '⚡', BRICK: '🧱', REST: '😴',
}

const strengthTypeLabel: Record<string, string> = {
  GENERAL: 'Geral', HYPERTROPHY: 'Hipertrofia', POWER: 'Potência',
  FUNCTIONAL: 'Funcional', CIRCUIT: 'Circuito',
}

function formatDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

interface Props {
  session: SessionResponse | null
  onClose: () => void
  onEdit: () => void
  onRegister: () => void
}

export function SessionViewModal({ session, onClose, onEdit, onRegister }: Props) {
  if (!session) return null

  return (
    <div className="svm-overlay" onClick={onClose}>
      <div className="svm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="svm-header">
          <div className="svm-header-icon">{workoutIcon[session.workoutType]}</div>
          <div className="svm-header-info">
            <h2 className="svm-title">{session.title}</h2>
            <p className="svm-subtitle">{workoutTypeLabel[session.workoutType]}</p>
          </div>
          <button className="svm-close" onClick={onClose}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="svm-body">
          {/* Date + badges */}
          <div className="svm-meta-row">
            <span className="svm-date">{formatDate(session.date)}</span>
            {session.intensityZone && (
              <span className="svm-badge svm-badge--zone">{session.intensityZone}</span>
            )}
            {session.strengthType && (
              <span className="svm-badge svm-badge--strength">
                {strengthTypeLabel[session.strengthType] || session.strengthType}
              </span>
            )}
            {session.completed && <span className="svm-badge svm-badge--done">✓ Concluída</span>}
          </div>

          {/* Stats */}
          {(session.plannedDurationMinutes || session.plannedDistanceKm) && (
            <div className="svm-stats">
              {session.plannedDurationMinutes && (
                <div className="svm-stat">
                  <span className="svm-stat__label">Duração</span>
                  <span className="svm-stat__value">{session.plannedDurationMinutes} min</span>
                </div>
              )}
              {session.plannedDistanceKm && (
                <div className="svm-stat">
                  <span className="svm-stat__label">Distância</span>
                  <span className="svm-stat__value">{session.plannedDistanceKm} km</span>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {session.description && (
            <div className="svm-section">
              <p className="svm-section__label">Descrição</p>
              <p className="svm-description">{session.description}</p>
            </div>
          )}

          {/* Exercises */}
          {session.exercises && session.exercises.length > 0 && (
            <div className="svm-section">
              <p className="svm-section__label">Exercícios</p>
              <div className="svm-exercises">
                <div className="svm-ex-header">
                  <span>Exercício</span>
                  <span>Séries</span>
                  <span>Reps</span>
                  <span>Peso</span>
                </div>
                {session.exercises.map((ex, i) => (
                  <div key={i} className="svm-ex-row">
                    <span className="svm-ex-name">{ex.name}</span>
                    <span>{ex.sets ?? '—'}</span>
                    <span>{ex.reps ?? '—'}</span>
                    <span>{ex.weightKg ? `${ex.weightKg} kg` : '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Result */}
          {session.completed && session.result && (
            <div className="svm-section svm-section--result">
              <p className="svm-section__label">Resultado</p>
              <div className="svm-stats">
                {session.result.actualDurationMinutes && (
                  <div className="svm-stat">
                    <span className="svm-stat__label">Duração real</span>
                    <span className="svm-stat__value">{session.result.actualDurationMinutes} min</span>
                  </div>
                )}
                {session.result.actualDistanceKm && (
                  <div className="svm-stat">
                    <span className="svm-stat__label">Distância real</span>
                    <span className="svm-stat__value">{session.result.actualDistanceKm} km</span>
                  </div>
                )}
                {session.result.averageHeartRate && (
                  <div className="svm-stat">
                    <span className="svm-stat__label">FC média</span>
                    <span className="svm-stat__value">{session.result.averageHeartRate} bpm</span>
                  </div>
                )}
                {session.result.perceivedEffort && (
                  <div className="svm-stat">
                    <span className="svm-stat__label">Esforço</span>
                    <span className="svm-stat__value">{session.result.perceivedEffort}/10</span>
                  </div>
                )}
              </div>
              {session.result.notes && (
                <p className="svm-result-notes">{session.result.notes}</p>
              )}
            </div>
          )}
        </div>

        <div className="svm-footer">
          <button className="svm-btn svm-btn--secondary" onClick={onClose}>Fechar</button>
          <button className="svm-btn svm-btn--ghost" onClick={() => { onClose(); onEdit() }}>Editar</button>
          <button className="svm-btn svm-btn--primary" onClick={() => { onClose(); onRegister() }}>
            {session.completed ? 'Ver registo' : 'Registar treino'}
          </button>
        </div>
      </div>
    </div>
  )
}
