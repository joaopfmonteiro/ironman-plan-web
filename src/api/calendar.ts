import client from './client'
import type { MacrocycleType, MicrocycleFocus, WorkoutType } from '../types'

export type CalendarEventType = 'TRAINING' | 'RACE' | 'MANUAL'

export interface CalendarEventResponse {
  id?: number
  date: string
  eventType: CalendarEventType
  title: string
  description?: string
  trainingSessionId?: number
  workoutType?: WorkoutType
  sessionCompleted?: boolean
  raceId?: number
  raceLocation?: string
  macrocycleId?: number
  macrocycleType?: MacrocycleType
  microcycleId?: number
  microcycleFocus?: MicrocycleFocus
}

export interface CreateEventRequest {
  date: string
  eventType: CalendarEventType
  title: string
  description?: string
  trainingSessionId?: number
  raceId?: number
}

export const calendarApi = {
  getMonth: (year: number, month: number) =>
    client.get<CalendarEventResponse[]>('/calendar', { params: { year, month } }).then((r) => r.data),

  getRange: (start: string, end: string) =>
    client.get<CalendarEventResponse[]>('/calendar/range', { params: { start, end } }).then((r) => r.data),

  createEvent: (data: CreateEventRequest) =>
    client.post<CalendarEventResponse>('/calendar/events', data).then((r) => r.data),

  deleteEvent: (id: number) =>
    client.delete(`/calendar/events/${id}`),
}
