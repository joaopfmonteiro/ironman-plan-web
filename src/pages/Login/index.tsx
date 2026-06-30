import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'
import './LoginPage.css'

export function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authApi.login({ email, password })
      setAuth(data)
      navigate('/dashboard')
    } catch {
      setError('Email ou password incorretos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* Left panel — form */}
      <div className="login-form-panel">
        <div className="login-form-box">
          <h1 className="login-title">Iniciar sessão</h1>
          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="joao@exemplo.com"
                required
                autoComplete="email"
                className="login-input"
              />
            </div>

            <div className="login-field">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="login-input"
              />
            </div>

            {error && <p className="login-error">{error}</p>}

            <button type="submit" disabled={loading} className="login-btn">
              {loading && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              Entrar
            </button>
          </form>

          <p className="login-register-link">
            Ainda não tens conta?{' '}
            <Link to="/register">Regista-te aqui</Link>
          </p>
        </div>
      </div>

      {/* Right panel — branding */}
      <div className="login-brand-panel">
        <div className="login-brand-glow-bottom" />
        <div className="login-brand-glow-top" />
        
        {/* Center content */}
        <div className="login-brand-content">
          <div className="login-brand-icons">
            {/* Swim */}
            <div className="login-brand-icon-item" style={{opacity: 0.7}}>
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="#fb923c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="44" cy="12" r="4" />
                <path d="M20 28 C24 22, 32 20, 38 24 L50 32 C44 36, 36 36, 30 32 Z" />
                <path d="M8 40 C14 36, 20 38, 26 36 C32 34, 38 36, 44 34 C50 32, 56 34, 58 38" />
                <path d="M8 48 C14 44, 20 46, 26 44 C32 42, 38 44, 44 42 C50 40, 56 42, 58 46" />
              </svg>
              <span>Swim</span>
            </div>

            {/* Bike */}
            <div className="login-brand-icon-item">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                {/* Wheels */}
                <circle cx="16" cy="54" r="14" />
                <circle cx="64" cy="54" r="14" />
                {/* Hubs */}
                <circle cx="16" cy="54" r="2" fill="#f97316" stroke="none" />
                <circle cx="64" cy="54" r="2" fill="#f97316" stroke="none" />
                {/* Chain stay */}
                <line x1="16" y1="54" x2="39" y2="54" />
                {/* Seat tube */}
                <line x1="39" y1="54" x2="33" y2="22" />
                {/* Seat stay */}
                <line x1="16" y1="54" x2="33" y2="22" />
                {/* Top tube */}
                <line x1="33" y1="22" x2="55" y2="26" />
                {/* Down tube */}
                <line x1="55" y1="26" x2="39" y2="54" />
                {/* Fork */}
                <path d="M55,26 Q58,40 64,54" />
                {/* Seat post */}
                <line x1="33" y1="22" x2="33" y2="17" />
                {/* Saddle */}
                <path d="M25,17 Q33,14 41,17" />
                {/* Stem */}
                <line x1="55" y1="26" x2="53" y2="16" />
                {/* Handlebar */}
                <line x1="47" y1="16" x2="59" y2="16" />
                {/* Chainring */}
                <circle cx="39" cy="54" r="6" />
              </svg>
              <span>Bike</span>
            </div>

            {/* Run */}
            <div className="login-brand-icon-item" style={{opacity: 0.7}}>
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="#fb923c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="38" cy="10" r="4" />
                <path d="M28 20 L36 18 L44 26 L52 24" />
                <path d="M36 18 L34 34 L24 44" />
                <path d="M34 34 L42 42 L48 54" />
                <path d="M24 44 L18 54" />
              </svg>
              <span>Run</span>
            </div>
          </div>

          <div className="login-brand-tagline">
            <h2>Train. Race. <span>Conquer.</span></h2>
            <p>O teu plano de treino personalizado para o próximo Ironman.</p>
          </div>
        </div>

        {/* Bottom quote */}
        <div className="login-brand-quote">
          "The body will do what the mind commands."
        </div>
      </div>
    </div>
  )
}
