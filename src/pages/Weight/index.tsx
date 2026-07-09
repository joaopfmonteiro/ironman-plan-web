import { useEffect, useState } from 'react'
import { athleteApi } from '../../api/athlete'
import type { AthleteResponse } from '../../types'
import { WeightSection } from './WeightSection'
import { MeasurementsSection } from './MeasurementsSection'
import './WeightPage.css'

type Tab = 'weight' | 'measurements'

export function WeightPage() {
  const [athlete, setAthlete] = useState<AthleteResponse | null>(null)
  const [tab, setTab]         = useState<Tab>('weight')

  useEffect(() => {
    athleteApi.getMe().then(setAthlete)
  }, [])

  return (
    <div className="wp">
      <h1 className="wp__title">Peso & IMC</h1>

      <div className="wp-tabs">
        <button
          className={`wp-tab ${tab === 'weight' ? 'wp-tab--active' : ''}`}
          onClick={() => setTab('weight')}>
          Peso & IMC
        </button>
        <button
          className={`wp-tab ${tab === 'measurements' ? 'wp-tab--active' : ''}`}
          onClick={() => setTab('measurements')}>
          Medidas corporais
        </button>
      </div>

      {tab === 'weight'
        ? <WeightSection athlete={athlete} />
        : <MeasurementsSection athlete={athlete} />}
    </div>
  )
}
