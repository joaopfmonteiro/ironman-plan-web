import client from './client'
import type { Equipment, ExerciseResponse, MuscleGroup } from '../types'

export interface CreateExerciseRequest {
  name: string
  muscleGroup?: MuscleGroup
  equipment?: Equipment
}

export const exercisesApi = {
  list: () =>
    client.get<ExerciseResponse[]>('/exercises').then((r) => r.data),

  create: (data: CreateExerciseRequest) =>
    client.post<ExerciseResponse>('/exercises', data).then((r) => r.data),
}
