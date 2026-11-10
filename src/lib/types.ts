export type Locale = 'en' | 'id'

export type User = {
  id: number
  name: string
  email: string
  locale: Locale
  xpTotal: number
  currentStreak: number
  longestStreak: number
  lastActiveOn: string | null
  roles: string[]
}

export type Envelope<T> = { data: T }
