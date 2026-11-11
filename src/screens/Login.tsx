import { useState } from 'react'
import { ApiError } from '../lib/api'
import { useApp } from '../lib/app-state'

export function Login() {
  const { signIn } = useApp()
  const [email, setEmail] = useState('admin@backendjourney.test')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    try {
      await signIn(email, password)
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

  return (
    <div className="login">
      <div className="head">
        <div>
          <p className="eyebrow">Backend Journey</p>
          <h1>Content admin</h1>
        </div>
      </div>
      <form className="panel" onSubmit={submit}>
        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        {error !== null && <p className="error">{error}</p>}
        <button type="submit" className="btn" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
