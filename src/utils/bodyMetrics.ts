import type { Gender, WeightEntryResponse, BodyMeasurementResponse, AthleteResponse } from '../types'

// --- BMI ---
export const BMI_CATS = [
  { max: 18.5, label: 'Abaixo do peso', cls: 'bmi--low' },
  { max: 25, label: 'Peso normal', cls: 'bmi--normal' },
  { max: 30, label: 'Excesso de peso', cls: 'bmi--over' },
  { max: 35, label: 'Obesidade I', cls: 'bmi--obese1' },
  { max: 40, label: 'Obesidade II', cls: 'bmi--obese2' },
  { max: Infinity, label: 'Obesidade III', cls: 'bmi--obese3' },
]

export function calcBmi(weightKg: number, heightCm: number): number {
  const h = heightCm / 100
  return weightKg / (h * h)
}

export function getBmiCat(bmi: number) {
  return BMI_CATS.find((c) => bmi < c.max) ?? BMI_CATS[BMI_CATS.length - 1]
}

// --- Waist-hip ratio ---
export function calcWaistHipRatio(waistCm: number, hipCm: number): number {
  return waistCm / hipCm
}

const WHR_THRESHOLDS: Record<'MALE' | 'FEMALE', { moderate: number; high: number }> = {
  MALE: { moderate: 0.90, high: 1.0 },
  FEMALE: { moderate: 0.80, high: 0.85 },
}

export function getWhrCategory(ratio: number, gender?: Gender) {
  const t = WHR_THRESHOLDS[gender === 'FEMALE' ? 'FEMALE' : 'MALE']
  if (ratio >= t.high) return { label: 'Risco elevado', cls: 'risk--high' }
  if (ratio >= t.moderate) return { label: 'Risco moderado', cls: 'risk--moderate' }
  return { label: 'Risco baixo', cls: 'risk--low' }
}

// --- Body fat % (US Navy method) ---
export function calcBodyFatNavy(params: {
  gender?: Gender
  heightCm?: number
  neckCm?: number
  waistCm?: number
  hipCm?: number
}): number | null {
  const { gender, heightCm, neckCm, waistCm, hipCm } = params
  if (!heightCm || !neckCm || !waistCm) return null

  if (gender === 'FEMALE') {
    if (!hipCm) return null
    const diff = waistCm + hipCm - neckCm
    if (diff <= 0) return null
    const bf = 495 / (1.29579 - 0.35004 * Math.log10(diff) + 0.221 * Math.log10(heightCm)) - 450
    return bf > 0 ? bf : null
  }

  const diff = waistCm - neckCm
  if (diff <= 0) return null
  const bf = 495 / (1.0324 - 0.19077 * Math.log10(diff) + 0.15456 * Math.log10(heightCm)) - 450
  return bf > 0 ? bf : null
}

const BODY_FAT_CATS: Record<'MALE' | 'FEMALE', { max: number; label: string; cls: string }[]> = {
  MALE: [
    { max: 5, label: 'Gordura essencial', cls: 'bf--essential' },
    { max: 13, label: 'Atleta', cls: 'bf--athlete' },
    { max: 17, label: 'Fitness', cls: 'bf--fitness' },
    { max: 24, label: 'Médio', cls: 'bf--average' },
    { max: Infinity, label: 'Obesidade', cls: 'bf--obese' },
  ],
  FEMALE: [
    { max: 13, label: 'Gordura essencial', cls: 'bf--essential' },
    { max: 20, label: 'Atleta', cls: 'bf--athlete' },
    { max: 24, label: 'Fitness', cls: 'bf--fitness' },
    { max: 31, label: 'Médio', cls: 'bf--average' },
    { max: Infinity, label: 'Obesidade', cls: 'bf--obese' },
  ],
}

export function getBodyFatCategory(percent: number, gender?: Gender) {
  const cats = BODY_FAT_CATS[gender === 'FEMALE' ? 'FEMALE' : 'MALE']
  return cats.find((c) => percent < c.max) ?? cats[cats.length - 1]
}

// --- Body composition blocks: pair each weigh-in with the latest known
// perimeters as of that date, so fat/lean mass (kg) stay in sync with
// weight even though perimeters are measured less often. ---
export interface BodyCompositionBlock {
  id: number
  date: string
  weightKg: number
  measurementDate: string | null
  bodyFatPercent: number | null
  fatMassKg: number | null
  leanMassKg: number | null
}

export function buildBodyCompositionBlocks(
  weightEntries: WeightEntryResponse[],
  measurementEntries: BodyMeasurementResponse[],
  athlete?: Pick<AthleteResponse, 'gender' | 'heightCm'> | null
): BodyCompositionBlock[] {
  const sortedMeasurements = [...measurementEntries].sort((a, b) => a.date.localeCompare(b.date))
  const sortedWeights = [...weightEntries].sort((a, b) => a.date.localeCompare(b.date))

  return sortedWeights.map((w) => {
    const latestMeasurement = sortedMeasurements.filter((m) => m.date <= w.date).pop() ?? null

    const bodyFatPercent = latestMeasurement
      ? calcBodyFatNavy({
          gender: athlete?.gender,
          heightCm: athlete?.heightCm,
          neckCm: latestMeasurement.neckCm,
          waistCm: latestMeasurement.waistCm,
          hipCm: latestMeasurement.hipCm,
        })
      : null

    const fatMassKg = bodyFatPercent != null ? (w.weightKg * bodyFatPercent) / 100 : null
    const leanMassKg = fatMassKg != null ? w.weightKg - fatMassKg : null

    return {
      id: w.id,
      date: w.date,
      weightKg: w.weightKg,
      measurementDate: latestMeasurement?.date ?? null,
      bodyFatPercent,
      fatMassKg,
      leanMassKg,
    }
  })
}

// --- Measurement guide ---
export interface MeasurementGuideEntry {
  key: 'neckCm' | 'chestCm' | 'waistCm' | 'hipCm' | 'armCm' | 'thighCm'
  label: string
  description: string
}

export const MEASUREMENT_GUIDE: MeasurementGuideEntry[] = [
  { key: 'neckCm', label: 'Pescoço', description: 'Logo abaixo da maçã-de-adão, com a fita ligeiramente inclinada para baixo à frente.' },
  { key: 'chestCm', label: 'Peito', description: 'À linha dos mamilos, com os braços relaxados ao lado do corpo.' },
  { key: 'waistCm', label: 'Cintura', description: 'No ponto mais estreito do tronco, geralmente ao nível do umbigo.' },
  { key: 'hipCm', label: 'Anca', description: 'No ponto mais largo das ancas/glúteos.' },
  { key: 'armCm', label: 'Braço', description: 'No meio do bícep, com o braço relaxado ao lado do corpo.' },
  { key: 'thighCm', label: 'Coxa', description: 'No ponto mais largo da coxa, logo abaixo da virilha.' },
]
