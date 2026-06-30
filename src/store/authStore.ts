import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthResponse } from '../types'

interface AuthState {
  token: string | null
  user: Omit<AuthResponse, 'token'> | null
  isAuthenticated: boolean
  setAuth: (data: AuthResponse) => void
  updateUser: (fields: Partial<Omit<AuthResponse, 'token'>>) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setAuth: (data: AuthResponse) => {
        localStorage.setItem('token', data.token)
        set({
          token: data.token,
          user: {
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            athleteId: data.athleteId,
          },
          isAuthenticated: true,
        })
      },

      updateUser: (fields) =>
        set((state) => ({ user: state.user ? { ...state.user, ...fields } : null })),

      logout: () => {
        localStorage.removeItem('token')
        set({ token: null, user: null, isAuthenticated: false })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)
