import { api } from './api'
import type { Envelope, User } from './types'

export const auth = {
  me: () => api<Envelope<User>>('/auth/me').then((r) => r.data),

  login: (email: string, password: string) =>
    api<Envelope<User>>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }).then((r) => r.data),

  logout: () => api<void>('/auth/logout', { method: 'POST' }),
}
