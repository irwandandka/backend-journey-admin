import { createContext, useContext } from 'react'
import type { User } from './types'

export type ThemeChoice = 'auto' | 'dark' | 'light'

export const THEME_ORDER: ThemeChoice[] = ['auto', 'dark', 'light']

export type AppState = {
  user: User | null
  booting: boolean
  theme: ThemeChoice
  setTheme: (theme: ThemeChoice) => void
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AppContext = createContext<AppState | null>(null)

export function useApp(): AppState {
  const state = useContext(AppContext)

  if (state === null) throw new Error('useApp must be used inside AppProvider')

  return state
}
