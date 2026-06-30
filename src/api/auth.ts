import client from './client'
import type { AuthResponse, LoginRequest, RegisterRequest } from '../types'

export const authApi = {
  login: (data: LoginRequest) =>
    client.post<AuthResponse>('/auth/login', data).then((r) => r.data),

  register: (data: RegisterRequest) =>
    client.post<AuthResponse>('/auth/register', data).then((r) => r.data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    client.put('/auth/change-password', data),
}
