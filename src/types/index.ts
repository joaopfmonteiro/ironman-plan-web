// --- Weight ---
export interface WeightEntryResponse {
  id: number
  date: string
  weightKg: number
}

export interface CreateWeightEntryRequest {
  date: string
  weightKg: number
}

// --- Auth ---
export interface AuthResponse {
  token: string
  email: string
  firstName: string
  lastName: string
  athleteId: number
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  gender: Gender
}

// --- Athlete ---
export type FitnessLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE'
export type Gender = 'MALE' | 'FEMALE' | 'OTHER'

export interface AthleteResponse {
  id: number
  email: string
  firstName: string
  lastName: string
  birthDate?: string
  weightKg?: number
  heightCm?: number
  fitnessLevel: FitnessLevel
  gender?: Gender
}

// --- Enums ---
export type WorkoutType = 'SWIM' | 'BIKE' | 'RUN' | 'STRENGTH' | 'HYROX' | 'CROSSFIT' | 'BRICK' | 'REST'
export type StrengthType = 'GENERAL' | 'HYPERTROPHY' | 'POWER' | 'FUNCTIONAL' | 'CIRCUIT'
export type IntensityZone = 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5'
export type MacrocycleType = 'BASE' | 'BUILD' | 'PEAK' | 'RACE' | 'RECOVERY'
export type MicrocycleFocus = 'VOLUME' | 'INTENSITY' | 'RECOVERY' | 'TEST'
export type RaceDistance = 'SPRINT' | 'OLYMPIC' | 'IRON70' | 'IRON140'

// --- Race ---
export interface RaceResponse {
  id: number
  name: string
  date: string
  location?: string
  distance: RaceDistance
  targetFinishTimeMinutes?: number
  actualFinishTimeMinutes?: number
  notes?: string
}

export interface CreateRaceRequest {
  name: string
  date: string
  location?: string
  distance: RaceDistance
  targetFinishTimeMinutes?: number
  notes?: string
}

// --- Session ---
export interface SessionResultResponse {
  id: number
  completedAt: string
  actualDurationMinutes?: number
  actualDistanceKm?: number
  averageHeartRate?: number
  perceivedEffort?: number
  notes?: string
}

export interface SessionExercise {
  id?: number
  orderIndex?: number
  name: string
  sets?: number
  reps?: number
  weightKg?: number
  notes?: string
}

export interface SessionResponse {
  id: number
  microcycleId: number
  date: string
  workoutType: WorkoutType
  title: string
  description?: string
  plannedDurationMinutes?: number
  plannedDistanceKm?: number
  intensityZone?: IntensityZone
  strengthType?: StrengthType
  exercises?: SessionExercise[]
  completed: boolean
  result?: SessionResultResponse
}

// --- Workout Templates ---
export interface WorkoutTemplateExercise {
  id?: number
  orderIndex?: number
  name: string
  sets?: number
  reps?: number
  weightKg?: number
  notes?: string
}

export interface WorkoutTemplate {
  id: number
  name: string
  workoutType: WorkoutType
  strengthType?: StrengthType
  defaultTitle?: string
  description?: string
  plannedDurationMinutes?: number
  plannedDistanceKm?: number
  intensityZone?: IntensityZone
  exercises: WorkoutTemplateExercise[]
}

export interface SaveWorkoutTemplateRequest {
  name: string
  workoutType: WorkoutType
  strengthType?: StrengthType
  defaultTitle?: string
  description?: string
  plannedDurationMinutes?: number
  plannedDistanceKm?: number
  intensityZone?: IntensityZone
  exercises?: WorkoutTemplateExercise[]
}

// --- Microcycle ---
export interface MicrocycleResponse {
  id: number
  macrocycleId: number
  weekNumber: number
  startDate: string
  endDate: string
  focus?: MicrocycleFocus
  totalPlannedHours?: number
  totalSessions: number
}

// --- Macrocycle ---
export interface MacrocycleResponse {
  id: number
  planId: number
  name: string
  type: MacrocycleType
  startDate: string
  endDate: string
  goals?: string
  microcycles: MicrocycleResponse[]
}

// --- Training Plan ---
export interface PlanSummaryResponse {
  id: number
  name: string
  description?: string
  startDate: string
  endDate?: string
  isActive: boolean
  targetRaceName?: string
  totalMacrocycles: number
  totalSessions: number
}

export interface PlanResponse {
  id: number
  name: string
  description?: string
  startDate: string
  endDate?: string
  isActive: boolean
  targetRaceId?: number
  targetRaceName?: string
  macrocycles: MacrocycleResponse[]
}

export interface CreatePlanRequest {
  name: string
  description?: string
  startDate: string
  endDate?: string
  targetRaceId?: number
}

// --- Templates ---
export interface TemplateSummaryResponse {
  id: number
  name: string
  description?: string
  durationWeeks: number
  targetDistance: RaceDistance
  fitnessLevel: FitnessLevel
}

export interface CreateFromTemplateRequest {
  startDate: string
  targetRaceId?: number
  planName?: string
}
