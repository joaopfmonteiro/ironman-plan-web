import client from './client'
import type {
  PlanSummaryResponse,
  PlanResponse,
  CreatePlanRequest,
  MacrocycleResponse,
  MicrocycleResponse,
  SessionResponse,
  CreateFromTemplateRequest,
} from '../types'

export interface CreateMacrocycleRequest {
  name: string
  type: string
  startDate: string
  endDate: string
  goals?: string
}

export interface UpdateMacrocycleRequest {
  name?: string
  type?: string
  startDate?: string
  endDate?: string
  goals?: string
}

export interface CreateMicrocycleRequest {
  weekNumber: number
  startDate: string
  endDate: string
  focus?: string
  totalPlannedHours?: number
}

export interface UpdateMicrocycleRequest {
  weekNumber?: number
  startDate?: string
  endDate?: string
  focus?: string
  totalPlannedHours?: number
}

export interface CreateSessionRequest {
  date: string
  workoutType: string
  title: string
  description?: string
  plannedDurationMinutes?: number
  plannedDistanceKm?: number
  intensityZone?: string
  strengthType?: string
  exercises?: { name: string; sets?: number; reps?: number; weightKg?: number }[]
}

export interface BulkCreateSessionRequest {
  dates: string[]
  workoutType: string
  title: string
  description?: string
  plannedDurationMinutes?: number
  plannedDistanceKm?: number
  intensityZone?: string
  strengthType?: string
  exercises?: { name: string; sets?: number; reps?: number; weightKg?: number }[]
}

export interface UpdateSessionRequest {
  date?: string
  workoutType?: string
  title?: string
  description?: string
  plannedDurationMinutes?: number
  plannedDistanceKm?: number
  intensityZone?: string
  strengthType?: string
  exercises?: { name: string; sets?: number; reps?: number; weightKg?: number }[]
}

export interface CompleteSessionRequest {
  completedAt?: string
  actualDurationMinutes?: number
  actualDistanceKm?: number
  averageHeartRate?: number
  perceivedEffort?: number
  notes?: string
}

export const plansApi = {
  // Plans
  list: () =>
    client.get<PlanSummaryResponse[]>('/plans').then((r) => r.data),

  get: (id: number) =>
    client.get<PlanResponse>(`/plans/${id}`).then((r) => r.data),

  create: (data: CreatePlanRequest) =>
    client.post<PlanResponse>('/plans', data).then((r) => r.data),

  update: (id: number, data: Partial<CreatePlanRequest>) =>
    client.put<PlanResponse>(`/plans/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    client.delete(`/plans/${id}`),

  createFromTemplate: (templateId: number, data: CreateFromTemplateRequest) =>
    client.post<PlanResponse>(`/plans/from-template/${templateId}`, data).then((r) => r.data),

  // Macrocycles
  getMacrocycles: (planId: number) =>
    client.get<MacrocycleResponse[]>(`/plans/${planId}/macrocycles`).then((r) => r.data),

  createMacrocycle: (planId: number, data: CreateMacrocycleRequest) =>
    client.post<MacrocycleResponse>(`/plans/${planId}/macrocycles`, data).then((r) => r.data),

  updateMacrocycle: (id: number, data: UpdateMacrocycleRequest) =>
    client.put<MacrocycleResponse>(`/macrocycles/${id}`, data).then((r) => r.data),

  deleteMacrocycle: (id: number) =>
    client.delete(`/macrocycles/${id}`),

  // Microcycles
  getMicrocycles: (macrocycleId: number) =>
    client.get<MicrocycleResponse[]>(`/macrocycles/${macrocycleId}/microcycles`).then((r) => r.data),

  createMicrocycle: (macrocycleId: number, data: CreateMicrocycleRequest) =>
    client.post<MicrocycleResponse>(`/macrocycles/${macrocycleId}/microcycles`, data).then((r) => r.data),

  updateMicrocycle: (id: number, data: UpdateMicrocycleRequest) =>
    client.put<MicrocycleResponse>(`/microcycles/${id}`, data).then((r) => r.data),

  deleteMicrocycle: (id: number) =>
    client.delete(`/microcycles/${id}`),

  // Sessions
  getSessions: (microcycleId: number) =>
    client.get<SessionResponse[]>(`/microcycles/${microcycleId}/sessions`).then((r) => r.data),

  createSession: (microcycleId: number, data: CreateSessionRequest) =>
    client.post<SessionResponse>(`/microcycles/${microcycleId}/sessions`, data).then((r) => r.data),

  bulkCreateSessions: (microcycleId: number, data: BulkCreateSessionRequest) =>
    client.post<SessionResponse[]>(`/microcycles/${microcycleId}/sessions/bulk`, data).then((r) => r.data),

  updateSession: (id: number, data: UpdateSessionRequest) =>
    client.put<SessionResponse>(`/sessions/${id}`, data).then((r) => r.data),

  completeSession: (id: number, data: CompleteSessionRequest) =>
    client.patch<SessionResponse>(`/sessions/${id}/complete`, data).then((r) => r.data),

  updateResult: (id: number, data: CompleteSessionRequest) =>
    client.put<SessionResponse>(`/sessions/${id}/result`, data).then((r) => r.data),

  deleteResult: (id: number) =>
    client.delete(`/sessions/${id}/result`),

  deleteSession: (id: number) =>
    client.delete(`/sessions/${id}`),
}
