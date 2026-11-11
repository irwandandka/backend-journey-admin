import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ConfirmButton } from '../components/Confirm'
import { useToast } from '../components/Toast'
import { admin } from '../lib/admin'
import { ApiError } from '../lib/api'
import type { Page, QuestionSummary, Tag, TrackTree } from '../lib/types'

const DIFFICULTIES = ['easy', 'medium', 'hard']
const LOCALES = ['en', 'id']

export function Questions() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [page, setPage] = useState<Page<QuestionSummary> | null>(null)
  const [tags, setTags] = useState<Tag[]>([])
  const [tracks, setTracks] = useState<TrackTree[]>([])
  const [error, setError] = useState<string | null>(null)
  const [term, setTerm] = useState(params.get('q') ?? '')

  const read = useCallback((key: string) => params.get(key) ?? '', [params])

  const set = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params)

      if (value === '') next.delete(key)
      else next.set(key, value)

      if (key !== 'page') next.delete('page')

      setParams(next, { replace: true })
    },
    [params, setParams],
  )

  useEffect(() => {
    admin.tags().then(setTags).catch(() => setTags([]))
    admin.tracks().then(setTracks).catch(() => setTracks([]))
  }, [])

  const [reloads, setReloads] = useState(0)

  useEffect(() => {
    setError(null)

    admin
      .questions({
        track: read('track'),
        tag: read('tag'),
        difficulty: read('difficulty'),
        missingLocale: read('missingLocale'),
        q: read('q'),
        page: Number(read('page')) || 1,
      })
      .then(setPage)
      .catch(() => setError('Could not load the questions'))
  }, [read, reloads])

  useEffect(() => {
    setTerm(params.get('q') ?? '')
  }, [params])

  return (
    <>
      <div className="head">
        <div className="grow">
          <p className="eyebrow">Content</p>
          <h1>Questions</h1>
        </div>
        <Link to="/questions/new" className="btn">
          New question
        </Link>
      </div>

      <div className="filters">
        <label className="field" style={{ flex: '1 1 220px' }}>
          <span>Search key or stem</span>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              set('q', term.trim())
            }}
          >
            <input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="bitmap, uuid, q-btree…" />
          </form>
        </label>
        <label className="field">
          <span>Track</span>
          <select value={read('track')} onChange={(event) => set('track', event.target.value)}>
            <option value="">Any</option>
            {tracks.map((track) => (
              <option key={track.slug} value={track.slug}>
                {track.slug}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Tag</span>
          <select value={read('tag')} onChange={(event) => set('tag', event.target.value)}>
            <option value="">Any</option>
            {tags.map((tag) => (
              <option key={tag.slug} value={tag.slug}>
                {tag.slug}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Difficulty</span>
          <select value={read('difficulty')} onChange={(event) => set('difficulty', event.target.value)}>
            <option value="">Any</option>
            {DIFFICULTIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Missing locale</span>
          <select value={read('missingLocale')} onChange={(event) => set('missingLocale', event.target.value)}>
            <option value="">Any</option>
            {LOCALES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error !== null && <p className="error">{error}</p>}

      <div className="panel" style={{ padding: '14px 6px 6px' }}>
        {page === null ? (
          <p className="empty">Loading…</p>
        ) : page.data.length === 0 ? (
          <p className="empty">No question matches these filters.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Question</th>
                <th>Track</th>
                <th>Tags</th>
                <th>Locales</th>
                <th className="num">Ver</th>
                <th className="num">Opts</th>
                <th className="num">Quizzes</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {page.data.map((question) => (
                <tr key={question.key}>
                  <td>
                    <Link to={`/questions/${encodeURIComponent(question.key)}`} style={{ textDecoration: 'none' }}>
                      <span className="key">{question.key}</span>
                    </Link>
                    <span className="stem">{question.stem}</span>
                    <span style={{ display: 'inline-block', marginTop: 5 }}>
                      <span className={`pill ${question.difficulty}`}>{question.difficulty}</span>
                      {question.type !== 'single_choice' && <span className="pill">{question.type}</span>}
                      {!question.isActive && <span className="pill gap">inactive</span>}
                    </span>
                  </td>
                  <td>
                    <code>{question.trackSlug}</code>
                  </td>
                  <td>
                    {question.tags.length === 0 ? (
                      <span className="muted">—</span>
                    ) : (
                      question.tags.map((tag) => (
                        <span key={tag} className="pill tag">
                          {tag}
                        </span>
                      ))
                    )}
                  </td>
                  <td>
                    {question.missingLocales.length === 0 ? (
                      <span className="pill ok">complete</span>
                    ) : (
                      question.missingLocales.map((locale) => (
                        <span key={locale} className="pill gap">
                          no {locale}
                        </span>
                      ))
                    )}
                  </td>
                  <td className="num">{question.version}</td>
                  <td className="num">{question.optionCount}</td>
                  <td className="num">{question.quizCount}</td>
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                    <ConfirmButton
                      label="Delete"
                      onConfirm={() => {
                        admin
                          .deleteQuestion(question.key)
                          .then(() => {
                            toast.show(`Deleted ${question.key}`, 'ok')
                            setReloads((n) => n + 1)
                          })
                          .catch((cause: unknown) =>
                            toast.show(
                              cause instanceof ApiError
                                ? (Object.values(cause.errors)[0]?.[0] ?? cause.message)
                                : 'Could not reach the API',
                              'bad',
                            ),
                          )
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {toast.node}

      {page !== null && page.meta.lastPage > 1 && (
        <div className="pager">
          <span>
            Page {page.meta.page} of {page.meta.lastPage} · {page.meta.total} questions
          </span>
          <button
            type="button"
            className="btn ghost sm"
            disabled={page.meta.page <= 1}
            onClick={() => set('page', String(page.meta.page - 1))}
          >
            Previous
          </button>
          <button
            type="button"
            className="btn ghost sm"
            disabled={page.meta.page >= page.meta.lastPage}
            onClick={() => set('page', String(page.meta.page + 1))}
          >
            Next
          </button>
        </div>
      )}
    </>
  )
}
