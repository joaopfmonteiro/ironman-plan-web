import client from './client'
import type { WorkoutTemplate, SaveWorkoutTemplateRequest } from '../types'

export const workoutTemplatesApi = {
  list: () => client.get<WorkoutTemplate[]>('/workout-templates').then(r => r.data),
  save: (data: SaveWorkoutTemplateRequest) => client.post<WorkoutTemplate>('/workout-templates', data).then(r => r.data),
  delete: (id: number) => client.delete(`/workout-templates/${id}`),
}
