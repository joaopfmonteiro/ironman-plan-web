export interface StrengthScheme {
  repsMin: number
  repsMax: number
  pctRM: number
  sets: number
}

// Reference rep range / %1RM / set count per strength training type.
// Used only to pre-fill a suggestion — always editable afterwards.
export const STRENGTH_SCHEME: Record<string, StrengthScheme> = {
  GENERAL:     { repsMin: 8,  repsMax: 12, pctRM: 65, sets: 3 },
  HYPERTROPHY: { repsMin: 8,  repsMax: 12, pctRM: 70, sets: 4 },
  POWER:       { repsMin: 3,  repsMax: 5,  pctRM: 85, sets: 5 },
  FUNCTIONAL:  { repsMin: 10, repsMax: 15, pctRM: 55, sets: 3 },
  CIRCUIT:     { repsMin: 15, repsMax: 20, pctRM: 45, sets: 3 },
}

export interface StrengthSuggestion {
  sets: number
  reps: number
  weightKg: number
}

export function suggestFromRM(strengthType: string, oneRepMax: number): StrengthSuggestion | null {
  const scheme = STRENGTH_SCHEME[strengthType]
  if (!scheme) return null
  const reps = Math.round((scheme.repsMin + scheme.repsMax) / 2)
  const weightKg = Math.round((oneRepMax * scheme.pctRM / 100) / 0.5) * 0.5
  return { sets: scheme.sets, reps, weightKg }
}
