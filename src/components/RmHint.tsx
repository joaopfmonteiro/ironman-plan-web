import { useEffect, useState } from 'react'
import { exerciseLogsApi } from '../api/exerciseLogs'
import { suggestFromRM, type StrengthSuggestion } from '../utils/strengthScheme'
import './RmHint.css'

interface Props {
  exerciseId?: number
  strengthType?: string
  onApply: (suggestion: StrengthSuggestion) => void
}

export function RmHint({ exerciseId, strengthType, onApply }: Props) {
  // undefined = loading/unknown, null = no history yet
  const [rm, setRm] = useState<number | null | undefined>(undefined)

  useEffect(() => {
    if (!exerciseId) { setRm(undefined); return }
    let cancelled = false
    setRm(undefined)
    exerciseLogsApi.best(exerciseId)
      .then((r) => { if (!cancelled) setRm(r.bestOneRepMax ?? null) })
      .catch(() => { if (!cancelled) setRm(null) })
    return () => { cancelled = true }
  }, [exerciseId])

  if (!exerciseId || rm === undefined || rm === null) return null

  const suggestion = strengthType ? suggestFromRM(strengthType, rm) : null

  return (
    <div className="rm-hint">
      <span className="rm-hint__value">💡 RM estimado: {rm}kg</span>
      {suggestion ? (
        <button type="button" className="rm-hint__btn" onClick={() => onApply(suggestion)}>
          Usar recomendação ({suggestion.sets}×{suggestion.reps} @ {suggestion.weightKg}kg)
        </button>
      ) : (
        <span className="rm-hint__note">escolhe o subtipo de força para ver uma sugestão</span>
      )}
    </div>
  )
}
