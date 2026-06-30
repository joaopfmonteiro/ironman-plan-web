import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { athleteApi } from '../../api/athlete'
import './SetupPage.css'

export function SetupPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    birthDate: '',
    weightKg: '',
    heightCm: '',
    fitnessLevel: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await athleteApi.updateMe({
        birthDate: form.birthDate || undefined,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        fitnessLevel: form.fitnessLevel || undefined,
      })
      navigate('/dashboard')
    } catch {
      setError('Erro ao guardar o perfil. Tenta novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="setup-page">
      {/* Left panel — form */}
      <div className="setup-form-panel">
        <div className="setup-form-box">
          <h1 className="setup-title">Perfil de atleta</h1>
          <p className="setup-subtitle">Personaliza o teu plano de treino com os teus dados</p>

          <form onSubmit={handleSubmit} className="setup-form">
            <div className="setup-row">
              <div className="setup-field">
                <label className="setup-label">Peso (kg)</label>
                <input
                  type="number"
                  value={form.weightKg}
                  onChange={set('weightKg')}
                  placeholder="70"
                  min="30"
                  max="200"
                  className="setup-input"
                />
              </div>
              <div className="setup-field">
                <label className="setup-label">Altura (cm)</label>
                <input
                  type="number"
                  value={form.heightCm}
                  onChange={set('heightCm')}
                  placeholder="175"
                  min="100"
                  max="250"
                  className="setup-input"
                />
              </div>
            </div>

            <div className="setup-field">
              <label className="setup-label">Data de nascimento</label>
              <input
                type="date"
                value={form.birthDate}
                onChange={set('birthDate')}
                className="setup-input"
              />
            </div>

            <div className="setup-field">
              <label className="setup-label">Nível de fitness</label>
              <select
                value={form.fitnessLevel}
                onChange={set('fitnessLevel')}
                className="setup-select"
              >
                <option value="">Seleciona o teu nível</option>
                <option value="BEGINNER">Iniciante — Pouca ou nenhuma experiência</option>
                <option value="INTERMEDIATE">Intermédio — Já completei algumas provas</option>
                <option value="ADVANCED">Avançado — Treino regular e competitivo</option>
                <option value="ELITE">Elite — Atleta de alto rendimento</option>
              </select>
            </div>

            {error && <p className="setup-error">{error}</p>}

            <div className="setup-actions">
              <button type="submit" disabled={loading} className="setup-btn">
                {loading && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                Guardar e entrar
              </button>
              <button type="button" className="setup-skip" onClick={() => navigate('/dashboard')}>
                Saltar por agora
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right panel — branding */}
      <div className="setup-brand-panel">
        <div className="setup-brand-glow-bottom" />
        <div className="setup-brand-glow-top" />

        <div className="setup-brand-logo">
          <div className="setup-brand-logo-icon">IM</div>
          <span className="setup-brand-logo-name">IronPlan</span>
        </div>

        <div className="setup-brand-content">
          <div className="setup-brand-tagline">
            <h2>Quase lá.<br /><span>Falta um passo.</span></h2>
            <p>Com os teus dados criamos um plano de treino ajustado ao teu perfil e objectivos.</p>
          </div>

          <div className="setup-brand-steps">
            <div className="setup-brand-step">
              <div className="setup-brand-step-num done">✓</div>
              <div className="setup-brand-step-text">
                <strong>Conta criada</strong>
                <span>Email e password registados</span>
              </div>
            </div>
            <div className="setup-brand-step">
              <div className="setup-brand-step-num active">2</div>
              <div className="setup-brand-step-text">
                <strong>Perfil de atleta</strong>
                <span>Dados físicos e nível de fitness</span>
              </div>
            </div>
            <div className="setup-brand-step">
              <div className="setup-brand-step-num pending">3</div>
              <div className="setup-brand-step-text">
                <strong>Dashboard</strong>
                <span>Cria o teu primeiro plano</span>
              </div>
            </div>
          </div>
        </div>

        <div className="setup-brand-quote">
          "Success is the sum of small efforts, repeated day in and day out."
        </div>
      </div>
    </div>
  )
}
