import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'
import './RegisterPage.css'

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

export function RegisterPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    gender: '',
  })
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== confirmPassword) {
      setError('As passwords não coincidem.')
      return
    }
    if (!form.gender) {
      setError('Seleciona o teu sexo.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const data = await authApi.register({ ...form, gender: form.gender as 'MALE' | 'FEMALE' | 'OTHER' })
      setAuth(data)
      navigate('/setup')
    } catch {
      setError('Ocorreu um erro no registo. Verifica os dados e tenta novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-page">
      {/* Left panel — form */}
      <div className="register-form-panel">
        <div className="register-form-box">
          <h1 className="register-title">Criar conta</h1>
          <p className="register-subtitle">Começa o teu treino hoje</p>

          <form onSubmit={handleSubmit} className="register-form">
            <div className="register-row">
              <div className="register-field">
                <input
                  type="text"
                  value={form.firstName}
                  onChange={set('firstName')}
                  placeholder="Nome"
                  required
                  className="register-input"
                />
              </div>
              <div className="register-field">
                <input
                  type="text"
                  value={form.lastName}
                  onChange={set('lastName')}
                  placeholder="Apelido"
                  required
                  className="register-input"
                />
              </div>
            </div>

            <div className="register-field">
              <select
                value={form.gender}
                onChange={set('gender')}
                required
                className={`register-input register-select${!form.gender ? ' register-select--placeholder' : ''}`}
              >
                <option value="" disabled>Sexo</option>
                <option value="MALE">Masculino</option>
                <option value="FEMALE">Feminino</option>
                <option value="OTHER">Outro</option>
              </select>
            </div>

            <div className="register-field">
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="Email"
                required
                autoComplete="email"
                className="register-input"
              />
            </div>

            <div className="register-field">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                placeholder="Password"
                required
                autoComplete="new-password"
                className="register-input register-input--password"
              />
              <button
                type="button"
                className="register-password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar password' : 'Mostrar password'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>

            <div className="register-field">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmar password"
                required
                autoComplete="new-password"
                className={`register-input register-input--password${form.password && confirmPassword && form.password !== confirmPassword ? ' register-input--error' : ''}`}
              />
              <button
                type="button"
                className="register-password-toggle"
                onClick={() => setShowConfirmPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Ocultar password' : 'Mostrar password'}
              >
                {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>

            {error && <p className="register-error">{error}</p>}

            <button type="submit" disabled={loading} className="register-btn">
              {loading && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              Criar conta
            </button>
          </form>

          <p className="register-login-link">
            Já tens conta?{' '}
            <Link to="/login">Inicia sessão</Link>
          </p>
        </div>
      </div>

      {/* Right panel — branding */}
      <div className="register-brand-panel">
        <div className="register-brand-glow-bottom" />
        <div className="register-brand-glow-top" />
        <div className="register-brand-content">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
            <circle cx="60" cy="60" r="50" stroke="#f97316" strokeWidth="1" strokeOpacity="0.2" />
            <circle cx="60" cy="60" r="35" stroke="#f97316" strokeWidth="1" strokeOpacity="0.15" />
            <text x="60" y="68" textAnchor="middle" fontSize="36" fontWeight="900" fill="#f97316">IM</text>
          </svg>

          <div className="register-brand-tagline">
            <h2>A tua jornada <span>começa aqui.</span></h2>
            <p>Cria o teu perfil e recebe um plano de treino personalizado para o teu próximo Ironman.</p>
          </div>
        </div>

        <div className="register-brand-quote">
          "It always seems impossible until it's done."
        </div>
      </div>
    </div>
  )
}
