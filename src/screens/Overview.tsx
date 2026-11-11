import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { admin } from '../lib/admin'
import type { Overview as OverviewData } from '../lib/types'

export function Overview() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    admin
      .overview()
      .then(setData)
      .catch(() => setError('Could not load the overview'))
  }, [])

  if (error !== null) return <p className="error">{error}</p>
  if (data === null) return <p className="muted">Loading…</p>

  return (
    <>
      <div className="head">
        <div className="grow">
          <p className="eyebrow">Content</p>
          <h1>Overview</h1>
        </div>
        <a className="btn ghost" href={`${import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}/api/v1/admin/export`}>
          Export content
        </a>
        <Link to="/questions/new" className="btn">
          New question
        </Link>
      </div>

      <div className="grid4">
        <div className="stat">
          <span className="k">Questions</span>
          <span className="v">{data.questions.total}</span>
          <span className="n">{data.questions.active} active</span>
        </div>
        <div className="stat">
          <span className="k">Tracks</span>
          <span className="v">{data.tracks.total}</span>
          <span className="n">{data.tracks.published} published</span>
        </div>
        <div className="stat">
          <span className="k">Journeys</span>
          <span className="v">{data.journeys.total}</span>
          <span className="n">{data.journeys.withoutQuiz} with no quiz</span>
        </div>
        <div className="stat">
          <span className="k">Quizzes</span>
          <span className="v">{data.quizzes.total}</span>
          <span className="n">across all journeys</span>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 14 }}>
        <div className="head" style={{ marginBottom: 12 }}>
          <div className="grow">
            <h2>Translation coverage</h2>
            <p className="muted" style={{ fontSize: 12.5 }}>
              Counted over current question versions.
            </p>
          </div>
        </div>
        <div className="rows">
          {data.translationCoverage.map((row) => {
            const pct = row.total === 0 ? 0 : Math.round((row.translated / row.total) * 100)

            return (
              <div key={row.locale}>
                <div className="row">
                  <span className="pill">{row.locale}</span>
                  <span className="grow muted" style={{ fontSize: 12.5 }}>
                    {row.translated} of {row.total}
                  </span>
                  <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{pct}%</strong>
                  {pct < 100 && (
                    <Link to={`/questions?missingLocale=${row.locale}`} className="btn ghost sm">
                      Show gaps
                    </Link>
                  )}
                </div>
                <div className="meter">
                  <i style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="panel">
        <div className="head" style={{ marginBottom: 12 }}>
          <div className="grow">
            <h2>Journeys with no quiz</h2>
            <p className="muted" style={{ fontSize: 12.5 }}>
              A journey with no quiz cannot be completed, so under sequential unlock it blocks everything after it.
            </p>
          </div>
        </div>
        {data.emptyJourneys.length === 0 ? (
          <p className="note ok">Every journey has a quiz.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Track</th>
                <th>Journey</th>
                <th>Tier</th>
                <th className="num">Position</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.emptyJourneys.map((journey) => (
                <tr key={`${journey.trackSlug}/${journey.slug}`}>
                  <td>
                    <code>{journey.trackSlug}</code>
                  </td>
                  <td>
                    <span className="key">{journey.slug}</span>
                  </td>
                  <td>
                    <span className="pill">{journey.tier}</span>
                  </td>
                  <td className="num">{journey.position}</td>
                  <td>
                    <Link to="/structure" className="btn ghost sm">
                      Fix
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
