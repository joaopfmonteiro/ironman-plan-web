import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'
import '../ForgotPassword/ForgotPasswordPage.css'

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

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const setAuth = useAuthStore((s) => s.setAuth)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('As passwords não coincidem.')
      return
    }
    if (!token) {
      setError('Link de recuperação inválido.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const data = await authApi.resetPassword(token, password)
      setAuth(data)
      navigate('/dashboard')
    } catch {
      setError('Este link é inválido ou já expirou. Pede um novo.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="auth-simple-page">
        <div className="auth-simple-box">
          <h1 className="auth-simple-title">Link inválido</h1>
          <p className="auth-simple-error">Este link de recuperação não é válido.</p>
          <p className="auth-simple-back-link">
            <Link to="/forgot-password">Pedir um novo link →</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-simple-page">
      <div className="auth-simple-box">
        <h1 className="auth-simple-title">Definir nova password</h1>
        <p className="auth-simple-subtitle">Escolhe uma nova password para a tua conta.</p>

        <form onSubmit={handleSubmit} className="auth-simple-form">
          <div className="auth-simple-field">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nova password"
              required
              autoComplete="new-password"
              className="auth-simple-input"
              style={{ paddingRight: '2.75rem' }}
            />
            <button
              type="button"
              className="auth-simple-toggle"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              aria-label={showPassword ? 'Ocultar password' : 'Mostrar password'}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>

          <div className="auth-simple-field">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmar password"
              required
              autoComplete="new-password"
              className="auth-simple-input"
              style={{ paddingRight: '2.75rem' }}
            />
            <button
              type="button"
              className="auth-simple-toggle"
              onClick={() => setShowConfirmPassword((v) => !v)}
              tabIndex={-1}
              aria-label={showConfirmPassword ? 'Ocultar password' : 'Mostrar password'}
            >
              {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>

          {error && <p className="auth-simple-error">{error}</p>}

          <button type="submit" disabled={loading} className="auth-simple-btn">
            {loading && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            Definir nova password
          </button>
        </form>

        <p className="auth-simple-back-link">
          <Link to="/login">← Voltar ao login</Link>
        </p>
      </div>
    </div>
  )
}
