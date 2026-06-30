import client from './client'
import type { AthleteResponse } from '../types'

export interface UpdateAthleteRequest {
  firstName?: string
  lastName?: string
  birthDate?: string
  weightKg?: number
  heightCm?: number
  fitnessLevel?: string
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
}

export const athleteApi = {
  getMe: () =>
    client.get<AthleteResponse>('/athlete/me').then((r) => r.data),

  updateMe: (data: UpdateAthleteRequest) =>
    client.put<AthleteResponse>('/athlete/me', data).then((r) => r.data),
}
