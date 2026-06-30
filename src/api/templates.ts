import client from './client'
import type { TemplateSummaryResponse } from '../types'

export const templatesApi = {
  list: () =>
    client.get<TemplateSummaryResponse[]>('/templates').then((r) => r.data),

  get: (id: number) =>
    client.get<TemplateSummaryResponse>(`/templates/${id}`).then((r) => r.data),
}
