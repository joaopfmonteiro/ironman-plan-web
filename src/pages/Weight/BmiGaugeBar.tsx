import { getBmiCat } from '../../utils/bodyMetrics'

const SCALE_MIN = 15
const SCALE_MAX = 45

const SEGMENTS = [
  { from: 15, to: 18.5, cls: 'gauge--low' },
  { from: 18.5, to: 25, cls: 'gauge--normal' },
  { from: 25, to: 30, cls: 'gauge--over' },
  { from: 30, to: 35, cls: 'gauge--obese1' },
  { from: 35, to: 40, cls: 'gauge--obese2' },
  { from: 40, to: 45, cls: 'gauge--obese3' },
]

interface BmiGaugeBarProps {
  bmi: number
}

export function BmiGaugeBar({ bmi }: BmiGaugeBarProps) {
  const clamped = Math.max(SCALE_MIN, Math.min(SCALE_MAX, bmi))
  const markerPct = ((clamped - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100
  const cat = getBmiCat(bmi)

  return (
    <div className="bmi-gauge">
      <div className="bmi-gauge__bar">
        {SEGMENTS.map((s) => (
          <div key={s.cls} className={`bmi-gauge__seg ${s.cls}`} style={{ flex: s.to - s.from }} />
        ))}
        <div className="bmi-gauge__marker" style={{ left: `${markerPct}%` }}>
          <div className="bmi-gauge__marker-tri" />
          <div className="bmi-gauge__marker-line" />
        </div>
      </div>
      <div className="bmi-gauge__scale">
        <span>{SCALE_MIN}</span>
        <span>Ideal</span>
        <span>{SCALE_MAX}+</span>
      </div>
      <div className="bmi-gauge__result">
        <span className="bmi-gauge__value">{bmi.toFixed(1)}</span>
        <span className={`wp-stat__badge ${cat.cls}`}>{cat.label}</span>
      </div>
    </div>
  )
}
