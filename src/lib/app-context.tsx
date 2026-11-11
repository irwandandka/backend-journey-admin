import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { auth } from './auth'
import { AppContext, type ThemeChoice } from './app-state'
import type { User } from './types'

function storedTheme(): ThemeChoice {
  try {
    const raw = localStorage.getItem('bja-theme')

    return raw === 'dark' || raw === 'light' ? raw : 'auto'
  } catch {
    return 'auto'
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [booting, setBooting] = useState(true)
  const [theme, setThemeState] = useState<ThemeChoice>(storedTheme)

  useEffect(() => {
    auth
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setBooting(false))
  }, [])

  useEffect(() => {
    const root = document.documentElement

    if (theme === 'auto') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
  }, [theme])

  const setTheme = useCallback((next: ThemeChoice) => {
    setThemeState(next)

    try {
      localStorage.setItem('bja-theme', next)
    } catch {
      // A private window with storage blocked still gets a working theme.
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setUser(await auth.login(email, password))
  }, [])

  const signOut = useCallback(async () => {
    await auth.logout()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, booting, theme, setTheme, signIn, signOut }),
    [user, booting, theme, setTheme, signIn, signOut],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
