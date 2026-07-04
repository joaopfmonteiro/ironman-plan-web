import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../../api/auth'
import './ForgotPasswordPage.css'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setSent(true)
    } catch {
      setError('Não foi possível enviar o email. Tenta novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-simple-page">
      <div className="auth-simple-box">
        <h1 className="auth-simple-title">Recuperar password</h1>
        <p className="auth-simple-subtitle">
          Introduz o teu email e enviamos-te um link para definires uma nova password.
        </p>

        {sent ? (
          <>
            <p className="auth-simple-success">
              Se existir uma conta com esse email, foi enviado um link de recuperação. Verifica a tua caixa de entrada.
            </p>
            <p className="auth-simple-back-link">
              <Link to="/login">← Voltar ao login</Link>
            </p>
          </>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="auth-simple-form">
              <div className="auth-simple-field">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="joao@exemplo.com"
                  required
                  autoComplete="email"
                  className="auth-simple-input"
                />
              </div>

              {error && <p className="auth-simple-error">{error}</p>}

              <button type="submit" disabled={loading} className="auth-simple-btn">
                {loading && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                Enviar link de recuperação
              </button>
            </form>

            <p className="auth-simple-back-link">
              Lembraste-te da password? <Link to="/login">Inicia sessão</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
