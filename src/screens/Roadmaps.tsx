import { useCallback, useEffect, useState } from 'react'
import { ConfirmButton } from '../components/Confirm'
import { LocaleBadge } from '../components/LocaleFields'
import { useToast } from '../components/Toast'
import { admin } from '../lib/admin'
import { ApiError } from '../lib/api'
import { FALLBACK, LOCALES } from '../lib/locales'
import type { Locale, Roadmap, RoadmapInput } from '../lib/types'

type Draft = { title: string; description: string }

export function Roadmaps() {
  const toast = useToast()
  const [roadmaps, setRoadmaps] = useState<Roadmap[] | null>(null)
  const [editing, setEditing] = useState<Roadmap | null | 'new'>(null)

  const load = useCallback(() => {
    admin
      .roadmaps()
      .then(setRoadmaps)
      .catch(() => toast.show('Could not load the roadmaps', 'bad'))
  }, [toast])

  useEffect(load, [load])

  const fail = useCallback(
    (cause: unknown) =>
      toast.show(
        cause instanceof ApiError ? (Object.values(cause.errors)[0]?.[0] ?? cause.message) : 'Could not reach the API',
        'bad',
      ),
    [toast],
  )

  if (roadmaps === null) return <p className="muted">Loading…</p>

  return (
    <>
      <div className="head">
        <div className="grow">
          <p className="eyebrow">Content</p>
          <h1>Roadmaps</h1>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
            A roadmap holds tracks. The learner app shows the first published one.
          </p>
        </div>
        <button type="button" className="btn" onClick={() => setEditing('new')}>
          New roadmap
        </button>
      </div>

      {editing !== null && (
        <RoadmapForm
          roadmap={editing === 'new' ? null : editing}
          nextPosition={roadmaps.length + 1}
          onCancel={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null)
            load()
            toast.show(`Saved ${saved.slug}`, 'ok')
          }}
          onError={fail}
        />
      )}

      <div className="panel" style={{ padding: '14px 6px 6px' }}>
        {roadmaps.length === 0 ? (
          <p className="empty">No roadmaps yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Roadmap</th>
                <th className="num">Position</th>
                <th className="num">Tracks</th>
                <th>State</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {roadmaps.map((roadmap) => (
                <tr key={roadmap.slug}>
                  <td>
                    <span className="key">{roadmap.slug}</span>
                    <span className="stem">{roadmap.title}</span>
                  </td>
                  <td className="num">{roadmap.position}</td>
                  <td className="num">{roadmap.trackCount}</td>
                  <td>
                    {roadmap.isPublished ? (
                      <span className="pill ok">published</span>
                    ) : (
                      <span className="pill gap">draft</span>
                    )}
                  </td>
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                    <button type="button" className="btn ghost sm" onClick={() => setEditing(roadmap)}>
                      Edit
                    </button>{' '}
                    <ConfirmButton
                      label="Delete"
                      onConfirm={() => {
                        admin
                          .deleteRoadmap(roadmap.slug)
                          .then(() => {
                            toast.show(`Deleted ${roadmap.slug}`, 'ok')
                            load()
                          })
                          .catch(fail)
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
    </>
  )
}

function RoadmapForm({
  roadmap,
  nextPosition,
  onCancel,
  onSaved,
  onError,
}: {
  roadmap: Roadmap | null
  nextPosition: number
  onCancel: () => void
  onSaved: (saved: Roadmap) => void
  onError: (cause: unknown) => void
}) {
  const [slug, setSlug] = useState(roadmap?.slug ?? '')
  const [position, setPosition] = useState(roadmap?.position ?? nextPosition)
  const [isPublished, setIsPublished] = useState(roadmap?.isPublished ?? false)
  const [busy, setBusy] = useState(false)

  const [rows, setRows] = useState<Record<Locale, Draft>>({
    en: { title: roadmap?.title ?? '', description: roadmap?.description ?? '' },
    id: { title: '', description: '' },
  })

  const patch = (locale: Locale, change: Partial<Draft>) =>
    setRows((current) => ({ ...current, [locale]: { ...current[locale], ...change } }))

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)

    const input: RoadmapInput = {
      slug: slug.trim(),
      position,
      isPublished,
      translations: Object.fromEntries(
        LOCALES.filter((locale) => rows[locale].title.trim() !== '').map((locale) => [
          locale,
          {
            title: rows[locale].title.trim(),
            description: rows[locale].description.trim() === '' ? null : rows[locale].description.trim(),
          },
        ]),
      ),
    }

    try {
      onSaved(roadmap === null ? await admin.createRoadmap(input) : await admin.updateRoadmap(roadmap.slug, input))
    } catch (cause) {
      onError(cause)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="panel" onSubmit={save} style={{ borderColor: 'var(--hair-2)', marginBottom: 14 }}>
      <h2 style={{ marginBottom: 12 }}>{roadmap === null ? 'New roadmap' : `Edit ${roadmap.slug}`}</h2>

      <div className="filters" style={{ marginBottom: 0 }}>
        <label className="field" style={{ flex: '1 1 220px' }}>
          <span>Slug {roadmap === null ? '' : '(fixed)'}</span>
          <input
            value={slug}
            disabled={roadmap !== null}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="frontend-engineering"
            required
          />
        </label>
        <label className="field" style={{ maxWidth: 110 }}>
          <span>Position</span>
          <input type="number" min={0} value={position} onChange={(e) => setPosition(Number(e.target.value))} />
        </label>
      </div>

      <div className="two" style={{ marginTop: 14 }}>
        {LOCALES.map((locale) => (
          <div key={locale}>
            <LocaleBadge locale={locale} filled={rows[locale].title.trim() !== ''} />
            <label className="field">
              <span>Title</span>
              <input
                value={rows[locale].title}
                onChange={(e) => patch(locale, { title: e.target.value })}
                required={locale === FALLBACK}
              />
            </label>
            <label className="field" style={{ marginTop: 9 }}>
              <span>Description</span>
              <textarea
                style={{ minHeight: 56 }}
                value={rows[locale].description}
                onChange={(e) => patch(locale, { description: e.target.value })}
              />
            </label>
          </div>
        ))}
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <label className="check">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
          Published
        </label>
        <span className="grow" />
        <button type="button" className="btn ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn" disabled={busy}>
          {busy ? 'Saving…' : 'Save roadmap'}
        </button>
      </div>
    </form>
  )
}
