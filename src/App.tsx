import { useEffect, useState } from 'react'
import { ApiError, api } from './lib/api'
import { auth } from './lib/auth'
import type { User } from './lib/types'

type Ping = { data: { ok: boolean; user: string } }

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [booting, setBooting] = useState(true)
  const [email, setEmail] = useState('admin@backendjourney.test')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState<string | null>(null)
  const [access, setAccess] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    auth
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setBooting(false))
  }, [])

  useEffect(() => {
    if (user === null) {
      setAccess(null)
      return
    }

    api<Ping>('/admin/ping')
      .then((r) => setAccess(`Content access granted for ${r.data.user}`))
      .catch((cause) =>
        setAccess(
          cause instanceof ApiError && cause.status === 403
            ? 'This account has no manage-content permission'
            : 'Admin check failed',
        ),
      )
  }, [user])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    try {
      setUser(await auth.login(email, password))
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? (cause.firstError('email') ?? cause.message)
          : 'Could not reach the API',
      )
    } finally {
      setBusy(false)
    }
  }

  if (booting) return <main className="shell">Loading…</main>

  if (user === null) {
    return (
      <main className="shell">
        <h1>Backend Journey · Admin</h1>
        <form onSubmit={submit}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error !== null && <p className="error">{error}</p>}
          <button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </main>
    )
  }

  return (
    <main className="shell">
      <h1>{user.name}</h1>
      <p className="muted">{user.roles.join(', ')}</p>
      <p>{access ?? 'Checking admin access…'}</p>
      <button
        type="button"
        onClick={async () => {
          await auth.logout()
          setUser(null)
        }}
      >
        Sign out
      </button>
    </main>
  )
}
