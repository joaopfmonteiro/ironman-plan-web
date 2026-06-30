import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { athleteApi } from '../../api/athlete'
import { authApi } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'
import './ProfilePage.css'

export function ProfilePage() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuthStore()
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    weightKg: '',
    heightCm: '',
    fitnessLevel: '',
    gender: '',
  })
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    athleteApi.getMe().then((data) => {
      setForm({
        firstName: data.firstName ?? '',
        lastName: data.lastName ?? '',
        birthDate: data.birthDate ?? '',
        weightKg: data.weightKg?.toString() ?? '',
        heightCm: data.heightCm?.toString() ?? '',
        fitnessLevel: data.fitnessLevel ?? '',
        gender: data.gender ?? '',
      })
    }).finally(() => setFetching(false))
  }, [])

  const setField = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const setPassword = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setPasswords((p) => ({ ...p, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (passwords.newPassword && passwords.newPassword !== passwords.confirmPassword) {
      setError('As passwords novas não coincidem.')
      return
    }

    setLoading(true)
    try {
      await athleteApi.updateMe({
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
        birthDate: form.birthDate || undefined,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        fitnessLevel: form.fitnessLevel || undefined,
        gender: (form.gender as 'MALE' | 'FEMALE' | 'OTHER') || undefined,
      })

      if (passwords.currentPassword && passwords.newPassword) {
        await authApi.changePassword({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        })
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
      }

      updateUser({ firstName: form.firstName, lastName: form.lastName })
      setSuccess(true)
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || ''
      if (msg.toLowerCase().includes('password')) {
        setError('Password actual incorrecta.')
      } else {
        setError('Erro ao guardar o perfil. Tenta novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  const passwordsMatch =
    !passwords.newPassword ||
    !passwords.confirmPassword ||
    passwords.newPassword === passwords.confirmPassword

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1 className="profile-title">O meu perfil</h1>
        <p className="profile-subtitle">Actualiza os teus dados pessoais e físicos</p>
      </div>

      <div className="profile-card">
        {fetching ? (
          <div className="profile-loading">
            <svg className="animate-spin h-8 w-8" style={{ color: '#f97316' }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div className="profile-columns">

              {/* Coluna 1 — Dados pessoais */}
              <div className="profile-col">
                <div className="profile-section-title">Dados pessoais</div>

                <div className="profile-field">
                  <label className="profile-label">Nome</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={setField('firstName')}
                    placeholder="João"
                    className="profile-input"
                  />
                </div>

                <div className="profile-field">
                  <label className="profile-label">Apelido</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={setField('lastName')}
                    placeholder="Silva"
                    className="profile-input"
                  />
                </div>

                <div className="profile-field">
                  <label className="profile-label">Email</label>
                  <input
                    type="email"
                    value={user?.email ?? ''}
                    disabled
                    className="profile-input profile-input--disabled"
                  />
                </div>
              </div>

              {/* Coluna 2 — Alterar password */}
              <div className="profile-col">
                <div className="profile-section-title">Alterar password</div>

                <div className="profile-field">
                  <label className="profile-label">Password actual</label>
                  <input
                    type="password"
                    value={passwords.currentPassword}
                    onChange={setPassword('currentPassword')}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="profile-input"
                  />
                </div>

                <div className="profile-field">
                  <label className="profile-label">Nova password</label>
                  <input
                    type="password"
                    value={passwords.newPassword}
                    onChange={setPassword('newPassword')}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="profile-input"
                  />
                </div>

                <div className="profile-field">
                  <label className="profile-label">Confirmar nova password</label>
                  <input
                    type="password"
                    value={passwords.confirmPassword}
                    onChange={setPassword('confirmPassword')}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={`profile-input${!passwordsMatch ? ' profile-input--error' : ''}`}
                  />
                </div>
              </div>

              {/* Coluna 3 — Dados físicos */}
              <div className="profile-col">
                <div className="profile-section-title">Dados físicos</div>

                <div className="profile-field">
                  <label className="profile-label">Peso (kg)</label>
                  <input
                    type="number"
                    value={form.weightKg}
                    onChange={setField('weightKg')}
                    placeholder="70"
                    min="30"
                    max="200"
                    step="0.1"
                    className="profile-input"
                  />
                </div>

                <div className="profile-field">
                  <label className="profile-label">Altura (cm)</label>
                  <input
                    type="number"
                    value={form.heightCm}
                    onChange={setField('heightCm')}
                    placeholder="175"
                    min="100"
                    max="250"
                    className="profile-input"
                  />
                </div>

                <div className="profile-field">
                  <label className="profile-label">Data de nascimento</label>
                  <input
                    type="date"
                    value={form.birthDate}
                    onChange={setField('birthDate')}
                    className="profile-input"
                  />
                </div>

                <div className="profile-field">
                  <label className="profile-label">Sexo</label>
                  <select
                    value={form.gender}
                    onChange={setField('gender')}
                    required
                    className="profile-select"
                  >
                    <option value="">Seleciona</option>
                    <option value="MALE">Masculino</option>
                    <option value="FEMALE">Feminino</option>
                    <option value="OTHER">Outro</option>
                  </select>
                </div>

                <div className="profile-field">
                  <label className="profile-label">Nível de fitness</label>
                  <select
                    value={form.fitnessLevel}
                    onChange={setField('fitnessLevel')}
                    className="profile-select"
                  >
                    <option value="">Seleciona o teu nível</option>
                    <option value="BEGINNER">Iniciante</option>
                    <option value="INTERMEDIATE">Intermédio</option>
                    <option value="ADVANCED">Avançado</option>
                    <option value="ELITE">Elite</option>
                  </select>
                </div>
              </div>

            </div>

            <div className="profile-footer">
              <button type="submit" disabled={loading} className="profile-btn">
                {loading && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                Guardar alterações
              </button>
              <button type="button" className="profile-back" onClick={() => navigate('/dashboard')}>
                ← Voltar ao dashboard
              </button>
              {error && <span className="profile-error">{error}</span>}
              {success && <span className="profile-success">Perfil guardado com sucesso!</span>}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
