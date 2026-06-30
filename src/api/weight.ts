import client from './client'
import type { WeightEntryResponse, CreateWeightEntryRequest } from '../types'

export const weightApi = {
  list: () => client.get<WeightEntryResponse[]>('/weight').then((r) => r.data),
  create: (data: CreateWeightEntryRequest) =>
    client.post<WeightEntryResponse>('/weight', data).then((r) => r.data),
  update: (id: number, data: Partial<CreateWeightEntryRequest>) =>
    client.put<WeightEntryResponse>(`/weight/${id}`, data).then((r) => r.data),
  delete: (id: number) => client.delete(`/weight/${id}`),
}
