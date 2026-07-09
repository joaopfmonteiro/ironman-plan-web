import { toLocalISODate } from '../../utils/date'

const W = 700
const H = 200
const PT = 14
const PB = 28
const PL = 48
const PR = 12
const IW = W - PL - PR
const IH = H - PT - PB

export type Period = '1S' | '1M' | '3M' | '6M' | '1A'

export const PERIODS: { key: Period; label: string; days: number }[] = [
  { key: '1S', label: 'Semana',  days: 7   },
  { key: '1M', label: 'Mês',     days: 30  },
  { key: '3M', label: '3 Meses', days: 90  },
  { key: '6M', label: '6 Meses', days: 180 },
  { key: '1A', label: 'Ano',     days: 365 },
]

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const DAYS   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

export function getPeriodStart(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d
}

function dateToX(dateStr: string, startMs: number, endMs: number): number {
  const ms = new Date(dateStr).getTime()
  return PL + Math.max(0, Math.min(1, (ms - startMs) / (endMs - startMs))) * IW
}

function toY(value: number, min: number, range: number): number {
  if (range === 0) return PT + IH / 2
  return PT + (1 - (value - min) / range) * IH
}

function generateXTicks(start: Date, end: Date, period: Period): Date[] {
  const ticks: Date[] = []
  const cur = new Date(start)
  if (period === '1S') {
    while (cur <= end) { ticks.push(new Date(cur)); cur.setDate(cur.getDate() + 1) }
  } else if (period === '1M') {
    while (cur <= end) { ticks.push(new Date(cur)); cur.setDate(cur.getDate() + 7) }
  } else {
    cur.setDate(1)
    const step = period === '1A' ? 2 : 1
    while (cur <= end) { ticks.push(new Date(cur)); cur.setMonth(cur.getMonth() + step) }
  }
  return ticks
}

function fmtTick(d: Date, period: Period): string {
  if (period === '1S') return DAYS[d.getDay()]
  if (period === '1M') return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
  return MONTHS[d.getMonth()]
}

export interface ChartPoint {
  id: number
  date: string
  value: number
}

interface LineChartProps {
  points: ChartPoint[]
  period: Period
  periodStart: Date
  periodEnd: Date
  color?: string
  fillColor?: string
  yTickFormat?: (v: number) => string
  tooltip?: (p: ChartPoint) => string
  emptyLabel?: string
}

export function LineChart({
  points,
  period,
  periodStart,
  periodEnd,
  color = '#f97316',
  fillColor = 'rgba(249,115,22,0.07)',
  yTickFormat = (v) => v.toFixed(1),
  tooltip = (p) => `${p.value} — ${p.date}`,
  emptyLabel = 'Sem registos neste período',
}: LineChartProps) {
  const startMs = periodStart.getTime()
  const endMs   = periodEnd.getTime()

  const values = points.map((p) => p.value)
  const pad    = values.length ? Math.max(0.5, (Math.max(...values) - Math.min(...values)) * 0.2) : 2
  const minV   = values.length ? Math.min(...values) - pad : 0
  const maxV   = values.length ? Math.max(...values) + pad : 1
  const range  = maxV - minV
  const yTicks = Array.from({ length: 5 }, (_, i) => minV + (range / 4) * i)

  // Extend line to today if last point is in the past
  const todayStr = toLocalISODate()
  const lastPoint = points[points.length - 1]
  const chartPoints = points.length > 0 && lastPoint.date < todayStr
    ? [...points, { ...lastPoint, date: todayStr, id: -1 }]
    : points

  const svgPoints = chartPoints.map((p) => ({ x: dateToX(p.date, startMs, endMs), y: toY(p.value, minV, range), point: p }))
  const polyline  = svgPoints.map((p) => `${p.x},${p.y}`).join(' ')
  const xTicks    = generateXTicks(periodStart, periodEnd, period)

  return (
    <svg className="wp-chart-svg" viewBox={`0 0 ${W} ${H}`}>
      {yTicks.map((tick, i) => {
        const y = toY(tick, minV, range)
        return (
          <g key={i}>
            <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#f1f5f9" strokeWidth="1" />
            <text x={PL - 5} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{yTickFormat(tick)}</text>
          </g>
        )
      })}
      {xTicks.map((tick, i) => {
        const x = dateToX(toLocalISODate(tick), startMs, endMs)
        return (
          <g key={i} className="weight-x-tick">
            <line x1={x} y1={PT} x2={x} y2={PT + IH} stroke="#f8fafc" strokeWidth="1" />
            <text x={x} y={H - 6} textAnchor="middle" fontSize="10" fill="#94a3b8">{fmtTick(tick, period)}</text>
          </g>
        )
      })}
      {points.length === 0 && (
        <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="12" fill="#cbd5e1">
          {emptyLabel}
        </text>
      )}
      {points.length > 1 && (
        <polygon
          points={`${svgPoints[0].x},${PT + IH} ${polyline} ${svgPoints[svgPoints.length - 1].x},${PT + IH}`}
          fill={fillColor} />
      )}
      {points.length > 1 && (
        <polyline points={polyline} fill="none" stroke={color}
          strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      )}
      {svgPoints.filter(p => p.point.id !== -1).map((p) => (
        <circle key={p.point.id} cx={p.x} cy={p.y} r="4"
          fill="#fff" stroke={color} strokeWidth="2.5">
          <title>{tooltip(p.point)}</title>
        </circle>
      ))}
    </svg>
  )
}
