import client from './client'
import type { RaceResponse, CreateRaceRequest } from '../types'

export interface UpdateRaceRequest {
  name?: string
  date?: string
  location?: string
  distance?: string
  targetFinishTimeMinutes?: number
  actualFinishTimeMinutes?: number
  notes?: string
}

export const racesApi = {
  list: () =>
    client.get<RaceResponse[]>('/races').then((r) => r.data),

  create: (data: CreateRaceRequest) =>
    client.post<RaceResponse>('/races', data).then((r) => r.data),

  update: (id: number, data: UpdateRaceRequest) =>
    client.put<RaceResponse>(`/races/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    client.delete(`/races/${id}`),
}
