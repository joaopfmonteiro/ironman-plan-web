import client from './client'

export interface ExerciseSetLogDto {
  setNumber: number
  reps?: number
  weightKg?: number
  rpe?: number
  completed: boolean
}

export interface ExerciseLogEntryDto {
  exerciseId: number
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
  exerciseId: number
  exerciseName: string
  orderIndex: number
  notes?: string
  estimatedOneRepMax?: number
  loggedAt: string
  sets: ExerciseSetLogResponse[]
}

export interface BestOneRepMaxResponse {
  exerciseId: number
  bestOneRepMax?: number
  loggedAt?: string
}

export const exerciseLogsApi = {
  save: (sessionId: number, data: SaveExerciseLogRequest) =>
    client.post<ExerciseLogResponse[]>(`/sessions/${sessionId}/exercise-logs`, data).then(r => r.data),

  get: (sessionId: number) =>
    client.get<ExerciseLogResponse[]>(`/sessions/${sessionId}/exercise-logs`).then(r => r.data),

  history: (exerciseId: number) =>
    client.get<ExerciseLogResponse[]>(`/exercise-logs/history`, { params: { exerciseId } }).then(r => r.data),

  best: (exerciseId: number) =>
    client.get<BestOneRepMaxResponse>(`/exercise-logs/exercises/${exerciseId}/best`).then(r => r.data),
}
