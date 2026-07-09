import client from './client'
import type { BodyMeasurementResponse, CreateBodyMeasurementRequest } from '../types'

export const bodyMeasurementsApi = {
  list: () => client.get<BodyMeasurementResponse[]>('/body-measurements').then((r) => r.data),
  create: (data: CreateBodyMeasurementRequest) =>
    client.post<BodyMeasurementResponse>('/body-measurements', data).then((r) => r.data),
  update: (id: number, data: Partial<CreateBodyMeasurementRequest>) =>
    client.put<BodyMeasurementResponse>(`/body-measurements/${id}`, data).then((r) => r.data),
  delete: (id: number) => client.delete(`/body-measurements/${id}`),
}
