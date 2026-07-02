import client from './client'

export interface ExerciseSetLogDto {
  setNumber: number
  reps?: number
  weightKg?: number
  rpe?: number
  completed: boolean
}

export interface ExerciseLogEntryDto {
  exerciseName: string
  orderIndex: number
  notes?: string
  sets: ExerciseSetLogDto[]
}

export interface SaveExerciseLogRequest {
  exercises: ExerciseLogEntryDto[]
}

export interface ExerciseSetLogResponse {
  id: number
  setNumber: number
  reps?: number
  weightKg?: number
  rpe?: number
  completed: boolean
  estimatedOneRepMax?: number
}

export interface ExerciseLogResponse {
  id: number
  exerciseName: string
  orderIndex: number
  notes?: string
  estimatedOneRepMax?: number
  loggedAt: string
  sets: ExerciseSetLogResponse[]
}

export const exerciseLogsApi = {
  save: (sessionId: number, data: SaveExerciseLogRequest) =>
    client.post<ExerciseLogResponse[]>(`/sessions/${sessionId}/exercise-logs`, data).then(r => r.data),

  get: (sessionId: number) =>
    client.get<ExerciseLogResponse[]>(`/sessions/${sessionId}/exercise-logs`).then(r => r.data),

  history: (exercise: string) =>
    client.get<ExerciseLogResponse[]>(`/exercise-logs/history`, { params: { exercise } }).then(r => r.data),

  knownExercises: () =>
    client.get<string[]>(`/exercise-logs/exercises`).then(r => r.data),
}
