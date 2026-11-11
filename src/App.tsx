import { Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell'
import { useApp } from './lib/app-state'
import { Login } from './screens/Login'
import { Overview } from './screens/Overview'
import { QuestionEditor } from './screens/QuestionEditor'
import { Questions } from './screens/Questions'
import { Structure } from './screens/Structure'
import { Tags } from './screens/Tags'

export default function App() {
  const { user, booting } = useApp()

  if (booting) {
    return (
      <main>
        <p className="muted">Loading…</p>
      </main>
    )
  }

  if (user === null) return <Login />

  if (!user.roles.includes('admin')) {
    return (
      <main>
        <div className="head">
          <div>
            <p className="eyebrow">Backend Journey</p>
            <h1>No content access</h1>
          </div>
        </div>
        <p className="note bad">
          {user.email} is signed in, but the account has no admin role. Ask for the admin role, then reload.
        </p>
      </main>
    )
  }

  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Overview />} />
        <Route path="questions" element={<Questions />} />
        <Route path="questions/new" element={<QuestionEditor />} />
        <Route path="questions/:key" element={<QuestionEditor />} />
        <Route path="structure" element={<Structure />} />
        <Route path="tags" element={<Tags />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
