import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { calendarApi, type CalendarEventResponse } from '../../api/calendar'
import { plansApi } from '../../api/plans'
import { toLocalISODate } from '../../utils/date'
import './CalendarPage.css'

const MACRO_TYPE_LABEL: Record<string, string> = {
  BASE: 'Base', BUILD: 'Construção', PEAK: 'Pico', RACE: 'Prova', RECOVERY: 'Recuperação',
}
const MACRO_TYPE_CLASS: Record<string, string> = {
  BASE: 'cal-macro-base', BUILD: 'cal-macro-build', PEAK: 'cal-macro-peak', RACE: 'cal-macro-race', RECOVERY: 'cal-macro-recovery',
}
const FOCUS_LABEL: Record<string, string> = {
  VOLUME: 'Volume', INTENSITY: 'Intensidade', RECOVERY: 'Recuperação', TEST: 'Teste',
}
const FOCUS_CLASS: Record<string, string> = {
  VOLUME: 'cal-focus-volume', INTENSITY: 'cal-focus-intensity', RECOVERY: 'cal-focus-recovery', TEST: 'cal-focus-test',
}
const WORKOUT_ICON: Record<string, string> = {
  SWIM: '🏊', BIKE: '🚴', RUN: '🏃', STRENGTH: '💪', HYROX: '🔥', CROSSFIT: '⚡', BRICK: '🧱', REST: '😴',
}

const MONTH_LABELS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function dow(d: Date) { return (d.getDay() + 6) % 7 }
function startOfWeek(d: Date) { const r = new Date(d); r.setDate(r.getDate() - dow(r)); return r }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }

type ViewMode = 'month' | 'week'

export function CalendarPage() {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [cursor, setCursor] = useState(new Date())
  const [events, setEvents] = useState<CalendarEventResponse[]>([])
  const [loading, setLoading] = useState(true)

  const { rangeStart, rangeEnd, gridStart, gridEnd } = useMemo(() => {
    if (viewMode === 'week') {
      const ws = startOfWeek(cursor)
      const we = addDays(ws, 6)
      return { rangeStart: ws, rangeEnd: we, gridStart: ws, gridEnd: we }
    }
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
    return { rangeStart: monthStart, rangeEnd: monthEnd, gridStart: startOfWeek(monthStart), gridEnd: addDays(startOfWeek(monthEnd), 6) }
  }, [viewMode, cursor])

  useEffect(() => {
    setLoading(true)
    calendarApi.getRange(toLocalISODate(gridStart), toLocalISODate(gridEnd))
      .then(setEvents)
      .finally(() => setLoading(false))
  }, [gridStart, gridEnd])

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEventResponse[]>()
    events.forEach((e) => {
      const list = map.get(e.date) ?? []
      list.push(e)
      map.set(e.date, list)
    })
    return map
  }, [events])

  const days: Date[] = []
  for (let d = new Date(gridStart); d <= gridEnd; d = addDays(d, 1)) days.push(new Date(d))

  const goPrev = () => setCursor((prev) => (viewMode === 'week' ? addDays(prev, -7) : new Date(prev.getFullYear(), prev.getMonth() - 1, 1)))
  const goNext = () => setCursor((prev) => (viewMode === 'week' ? addDays(prev, 7) : new Date(prev.getFullYear(), prev.getMonth() + 1, 1)))
  const goToday = () => setCursor(new Date())

  const openEvent = async (ev: CalendarEventResponse) => {
    if (ev.eventType === 'TRAINING' && ev.trainingSessionId) {
      const session = await plansApi.getSession(ev.trainingSessionId)
      navigate(session.planId ? `/plans/${session.planId}` : '/plans', { state: { openSession: session } })
    } else if (ev.eventType === 'RACE') {
      navigate('/races')
    }
  }

  const todayIso = toLocalISODate(new Date())

  return (
    <div className="cal-page">
      <div className="cal-header">
        <h1 className="cal-title">Calendário</h1>
        <div className="cal-controls">
          <div className="cal-view-toggle">
            <button className={`cal-view-btn ${viewMode === 'month' ? 'cal-view-btn--active' : ''}`} onClick={() => setViewMode('month')}>Mês</button>
            <button className={`cal-view-btn ${viewMode === 'week' ? 'cal-view-btn--active' : ''}`} onClick={() => setViewMode('week')}>Semana</button>
          </div>
          <div className="cal-nav">
            <button className="cal-nav-btn" onClick={goPrev} aria-label="Anterior">‹</button>
            <button className="cal-nav-btn cal-nav-btn--today" onClick={goToday}>Hoje</button>
            <button className="cal-nav-btn" onClick={goNext} aria-label="Seguinte">›</button>
          </div>
        </div>
      </div>

      <p className="cal-range-label">
        {viewMode === 'month'
          ? `${MONTH_LABELS[cursor.getMonth()]} ${cursor.getFullYear()}`
          : `${rangeStart.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })} – ${rangeEnd.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })}`}
      </p>

      {loading ? (
        <div className="cal-loading"><div className="cal-spinner" /></div>
      ) : (
        <div className={`cal-grid ${viewMode === 'week' ? 'cal-grid--week' : ''}`}>
          {DAY_LABELS.map((l) => <div key={l} className="cal-day-label">{l}</div>)}
          {days.map((day) => {
            const iso = toLocalISODate(day)
            const dayEvents = eventsByDate.get(iso) ?? []
            const inCurrentMonth = viewMode === 'week' || day.getMonth() === cursor.getMonth()
            const macroEvent = dayEvents.find((e) => e.macrocycleType)
            const macroClass = macroEvent?.macrocycleType ? MACRO_TYPE_CLASS[macroEvent.macrocycleType] : ''
            return (
              <div
                key={iso}
                className={`cal-cell ${macroClass} ${!inCurrentMonth ? 'cal-cell--muted' : ''} ${iso === todayIso ? 'cal-cell--today' : ''}`}
              >
                <div className="cal-cell__header">
                  <span className="cal-cell__num">{day.getDate()}</span>
                  {macroEvent?.microcycleFocus && (
                    <span className={`cal-focus-dot ${FOCUS_CLASS[macroEvent.microcycleFocus]}`} title={FOCUS_LABEL[macroEvent.microcycleFocus]} />
                  )}
                </div>
                <div className="cal-cell__events">
                  {dayEvents.map((ev, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`cal-event cal-event--${ev.eventType.toLowerCase()} ${ev.sessionCompleted ? 'cal-event--completed' : ''}`}
                      onClick={() => openEvent(ev)}
                      title={ev.title}
                    >
                      {ev.eventType === 'TRAINING' && ev.workoutType && <span>{WORKOUT_ICON[ev.workoutType]}</span>}
                      {ev.eventType === 'RACE' && <span>🏁</span>}
                      <span className="cal-event__title">{ev.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="cal-legend">
        {Object.entries(MACRO_TYPE_LABEL).map(([type, label]) => (
          <span key={type} className="cal-legend-item">
            <span className={`cal-legend-swatch ${MACRO_TYPE_CLASS[type]}`} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
