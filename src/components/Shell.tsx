import { NavLink, Outlet } from 'react-router-dom'
import { useApp, THEME_ORDER } from '../lib/app-state'

const THEME_LABEL = { auto: 'Theme: system', dark: 'Theme: dark', light: 'Theme: light' } as const

export function Shell() {
  const { user, theme, setTheme, signOut } = useApp()

  const nextTheme = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length]

  return (
    <>
      <header className="bar">
        <span className="mark">
          <b>BJ</b> Admin
        </span>
        <nav>
          <NavLink to="/" end>
            Overview
          </NavLink>
          <NavLink to="/questions">Questions</NavLink>
          <NavLink to="/structure">Structure</NavLink>
          <NavLink to="/tags">Tags</NavLink>
        </nav>
        <span className="grow" />
        <span className="who">{user?.email}</span>
        <button
          type="button"
          className="icon-btn"
          title={THEME_LABEL[theme]}
          aria-label={THEME_LABEL[theme]}
          onClick={() => setTheme(nextTheme)}
        >
          ◐
        </button>
        <button type="button" className="btn ghost sm" onClick={() => void signOut()}>
          Sign out
        </button>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  )
}
