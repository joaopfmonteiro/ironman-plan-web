import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { weightApi } from '../../api/weight'
import type { WeightEntryResponse } from '../../types'
import './WeightChart.css'

const W = 600
const H = 110
const PT = 10
const PB = 22
const PL = 40
const PR = 10
const IW = W - PL - PR
const IH = H - PT - PB

type Period = '1S' | '1M' | '3M' | '6M' | '1A'

const PERIODS: { key: Period; label: string; days: number }[] = [
  { key: '1S', label: 'Semana',  days: 7   },
  { key: '1M', label: 'Mês',     days: 30  },
  { key: '3M', label: '3 Meses', days: 90  },
  { key: '6M', label: '6 Meses', days: 180 },
  { key: '1A', label: 'Ano',     days: 365 },
]

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const DAYS   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

function getPeriodStart(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d
}

function dateToX(dateStr: string, startMs: number, endMs: number): number {
  const ms = new Date(dateStr).getTime()
  return PL + Math.max(0, Math.min(1, (ms - startMs) / (endMs - startMs))) * IW
}

function toY(kg: number, min: number, range: number): number {
  if (range === 0) return PT + IH / 2
  return PT + (1 - (kg - min) / range) * IH
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

export function WeightChart() {
  const navigate = useNavigate()
  const [allEntries, setAllEntries] = useState<WeightEntryResponse[]>([])
  const [loading, setLoading]       = useState(true)
  const [period, setPeriod]         = useState<Period>('1M')

  useEffect(() => {
    weightApi.list().then(setAllEntries).finally(() => setLoading(false))
  }, [])

  const periodDays  = PERIODS.find((p) => p.key === period)!.days
  const periodStart = getPeriodStart(periodDays)
  const periodEnd   = new Date()
  const startMs     = periodStart.getTime()
  const endMs       = periodEnd.getTime()

  const startStr = periodStart.toISOString().slice(0, 10)
  const entries  = allEntries.filter((e) => e.date >= startStr)

  const last = allEntries[allEntries.length - 1]
  const prev = allEntries[allEntries.length - 2]
  const diff = last && prev ? last.weightKg - prev.weightKg : null

  const kgs   = entries.map((e) => e.weightKg)
  const pad   = kgs.length ? Math.max(0.5, (Math.max(...kgs) - Math.min(...kgs)) * 0.2) : 2
  const minKg = kgs.length ? Math.min(...kgs) - pad : 60
  const maxKg = kgs.length ? Math.max(...kgs) + pad : 80
  const range = maxKg - minKg
  const yTicks = Array.from({ length: 3 }, (_, i) => minKg + (range / 2) * i)

  const points  = entries.map((e) => ({
    x: dateToX(e.date, startMs, endMs),
    y: toY(e.weightKg, minKg, range),
    entry: e,
  }))
  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ')
  const xTicks   = generateXTicks(periodStart, periodEnd, period)

  return (
    <div className="weight-card" onClick={() => navigate('/weight')} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate('/weight')}>
      <div className="weight-card__header">
        <div className="weight-card__left">
          <h2 className="weight-card__title">Evolução do Peso</h2>
          {last && (
            <span className="weight-card__last">
              <strong>{last.weightKg} kg</strong>
              {diff !== null && (
                <span className={`weight-card__diff ${diff < 0 ? 'weight-card__diff--down' : diff > 0 ? 'weight-card__diff--up' : 'weight-card__diff--neutral'}`}>
                  {diff > 0 ? '▲' : diff < 0 ? '▼' : '—'} {Math.abs(diff).toFixed(1)} kg
                </span>
              )}
            </span>
          )}
        </div>
        <div className="weight-period-tabs" onClick={(e) => e.stopPropagation()}>
          {PERIODS.map((p) => (
            <button key={p.key}
              className={`weight-period-tab ${period === p.key ? 'weight-period-tab--active' : ''}`}
              onClick={() => setPeriod(p.key)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="weight-chart-empty">A carregar...</div>
      ) : (
        <svg className="weight-chart-svg" viewBox={`0 0 ${W} ${H}`}>
          {yTicks.map((tick, i) => {
            const y = toY(tick, minKg, range)
            return (
              <g key={i}>
                <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                <text x={PL - 4} y={y + 4} textAnchor="end" fontSize="9" fill="#94a3b8">
                  {tick.toFixed(1)}
                </text>
              </g>
            )
          })}
          {xTicks.map((tick, i) => {
            const x = dateToX(tick.toISOString().slice(0, 10), startMs, endMs)
            return (
              <g key={i} className="weight-x-tick">
                <line x1={x} y1={PT} x2={x} y2={PT + IH} stroke="#f8fafc" strokeWidth="1" />
                <text x={x} y={H - 5} textAnchor="middle" fontSize="9" fill="#94a3b8">
                  {fmtTick(tick, period)}
                </text>
              </g>
            )
          })}
          {entries.length === 0 && (
            <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="11" fill="#cbd5e1">
              {allEntries.length === 0 ? 'Sem registos — clique para adicionar' : `Sem registos nos últimos ${periodDays} dias`}
            </text>
          )}
          {entries.length > 1 && (
            <polygon
              points={`${points[0].x},${PT + IH} ${polyline} ${points[points.length - 1].x},${PT + IH}`}
              fill="rgba(249,115,22,0.07)" />
          )}
          {entries.length > 1 && (
            <polyline points={polyline} fill="none" stroke="#f97316"
              strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          )}
          {points.map((p) => (
            <circle key={p.entry.id} cx={p.x} cy={p.y} r="3.5"
              fill="#fff" stroke="#f97316" strokeWidth="2" className="weight-dot">
              <title>{p.entry.weightKg} kg — {p.entry.date}</title>
            </circle>
          ))}
        </svg>
      )}
    </div>
  )
}
