import { useCallback, useEffect, useState } from 'react'
import { LocaleBadge } from '../components/LocaleFields'
import { useToast } from '../components/Toast'
import { admin } from '../lib/admin'
import { ApiError } from '../lib/api'
import { FALLBACK, LOCALES } from '../lib/locales'
import type { JourneyInput, Locale, QuizInput, Tier, TrackInput, TrackTree, UnlockRule } from '../lib/types'

const TIERS: Tier[] = ['foundation', 'intermediate', 'advanced', 'deep']
const RULES: UnlockRule[] = ['sequential', 'tier', 'open']

type Journey = TrackTree['journeys'][number]

type Editing =
  | { kind: 'track'; slug: string | null }
  | { kind: 'journey'; trackSlug: string; slug: string | null }
  | { kind: 'quiz'; journeySlug: string; slug: string | null }
  | { kind: 'questions'; quizSlug: string }
  | null

export function Structure() {
  const toast = useToast()
  const [tracks, setTracks] = useState<TrackTree[] | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [editing, setEditing] = useState<Editing>(null)

  const load = useCallback(() => {
    admin
      .tracks()
      .then(setTracks)
      .catch(() => toast.show('Could not load the structure', 'bad'))
  }, [toast])

  useEffect(load, [load])

  const merge = useCallback((updated: TrackTree) => {
    setTracks((current) =>
      current === null
        ? [updated]
        : current.some((track) => track.slug === updated.slug)
          ? current.map((track) => (track.slug === updated.slug ? updated : track))
          : [...current, updated].sort((a, b) => a.position - b.position),
    )
    setEditing(null)
  }, [])

  if (tracks === null) return <p className="muted">Loading…</p>

  return (
    <>
      <div className="head">
        <div className="grow">
          <p className="eyebrow">Content</p>
          <h1>Structure</h1>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
            A journey with no quiz cannot be completed, so under sequential unlock it blocks every journey after it.
          </p>
        </div>
        <button type="button" className="btn" onClick={() => setEditing({ kind: 'track', slug: null })}>
          New track
        </button>
      </div>

      {editing?.kind === 'track' && (
        <TrackForm
          track={editing.slug === null ? null : (tracks.find((t) => t.slug === editing.slug) ?? null)}
          nextPosition={tracks.length + 1}
          onCancel={() => setEditing(null)}
          onSaved={(updated) => {
            merge(updated)
            toast.show(`Saved ${updated.slug}`, 'ok')
          }}
        />
      )}

      {tracks.map((track) => {
        const expanded = open === track.slug

        return (
          <div key={track.slug} className="panel">
            <div className="row">
              <span
                className="letter"
                style={{ background: track.colorDark, color: '#07070d', width: 30, height: 30, borderRadius: 9 }}
              >
                {track.abbreviation}
              </span>
              <div className="grow">
                <strong style={{ fontFamily: 'var(--display)' }}>{track.name}</strong>
                <span className="muted" style={{ display: 'block', fontSize: 12 }}>
                  <code>{track.slug}</code> · position {track.position} · {track.journeys.length} journeys ·{' '}
                  {track.questionCount} questions
                </span>
              </div>
              {!track.isPublished && <span className="pill gap">draft</span>}
              <button type="button" className="btn ghost sm" onClick={() => setEditing({ kind: 'track', slug: track.slug })}>
                Edit
              </button>
              <button type="button" className="btn ghost sm" onClick={() => setOpen(expanded ? null : track.slug)}>
                {expanded ? 'Hide journeys' : 'Journeys'}
              </button>
            </div>

            {expanded && (
              <div style={{ marginTop: 14 }}>
                {editing?.kind === 'journey' && editing.trackSlug === track.slug && (
                  <JourneyForm
                    trackSlug={track.slug}
                    tracks={tracks}
                    journey={
                      editing.slug === null ? null : (track.journeys.find((j) => j.slug === editing.slug) ?? null)
                    }
                    nextPosition={track.journeys.length + 1}
                    onCancel={() => setEditing(null)}
                    onSaved={(updated) => {
                      merge(updated)
                      toast.show('Journey saved', 'ok')
                    }}
                  />
                )}

                {track.journeys.length === 0 ? (
                  <p className="empty">No journeys yet.</p>
                ) : (
                  <div className="rows">
                    {track.journeys.map((journey) => (
                      <JourneyRow
                        key={journey.slug}
                        journey={journey}
                        editing={editing}
                        tracks={tracks}
                        onEdit={(next) => setEditing(next)}
                        onSaved={(updated, message) => {
                          merge(updated)
                          toast.show(message, 'ok')
                        }}
                        onError={(message) => toast.show(message, 'bad')}
                      />
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  className="btn ghost sm"
                  style={{ marginTop: 12 }}
                  onClick={() => setEditing({ kind: 'journey', trackSlug: track.slug, slug: null })}
                >
                  Add journey
                </button>
              </div>
            )}
          </div>
        )
      })}

      {toast.node}
    </>
  )
}

function JourneyRow({
  journey,
  editing,
  tracks,
  onEdit,
  onSaved,
  onError,
}: {
  journey: Journey
  editing: Editing
  tracks: TrackTree[]
  onEdit: (next: Editing) => void
  onSaved: (updated: TrackTree, message: string) => void
  onError: (message: string) => void
}) {
  const quiz = journey.quizzes[0] ?? null

  return (
    <div className="opt">
      <div className="top">
        <span className="letter">{journey.position}</span>
        <div className="grow">
          <strong style={{ fontFamily: 'var(--display)', fontSize: 13.5 }}>{journey.title}</strong>
          <span className="muted" style={{ display: 'block', fontSize: 11.5 }}>
            <code>{journey.slug}</code>
          </span>
        </div>
        <span className="pill">{journey.tier}</span>
        <span className="pill">{journey.unlockRule}</span>
        {!journey.isPublished && <span className="pill gap">draft</span>}
        {quiz === null ? <span className="pill gap">no quiz</span> : <span className="pill ok">{quiz.questionCount} served</span>}
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => onEdit({ kind: 'journey', trackSlug: tracks.find((t) => t.journeys.includes(journey))?.slug ?? '', slug: journey.slug })}
        >
          Edit
        </button>
        {quiz === null ? (
          <button type="button" className="btn ghost sm" onClick={() => onEdit({ kind: 'quiz', journeySlug: journey.slug, slug: null })}>
            Add quiz
          </button>
        ) : (
          <>
            <button type="button" className="btn ghost sm" onClick={() => onEdit({ kind: 'quiz', journeySlug: journey.slug, slug: quiz.slug })}>
              Quiz
            </button>
            <button type="button" className="btn ghost sm" onClick={() => onEdit({ kind: 'questions', quizSlug: quiz.slug })}>
              Questions
            </button>
          </>
        )}
      </div>

      {editing?.kind === 'quiz' && editing.journeySlug === journey.slug && (
        <QuizForm
          journeySlug={journey.slug}
          quizSlug={editing.slug}
          defaultTitle={journey.title}
          onCancel={() => onEdit(null)}
          onSaved={(updated) => onSaved(updated, 'Quiz saved')}
          onError={onError}
        />
      )}

      {editing?.kind === 'questions' && quiz !== null && editing.quizSlug === quiz.slug && (
        <QuizQuestionPicker quizSlug={quiz.slug} onClose={() => onEdit(null)} onError={onError} />
      )}
    </div>
  )
}

function useLocaleDraft<T extends Record<string, string>>(blank: T, initial?: Partial<Record<Locale, T>>) {
  const [rows, setRows] = useState<Record<Locale, T>>(() => ({
    en: { ...blank, ...(initial?.en ?? {}) },
    id: { ...blank, ...(initial?.id ?? {}) },
  }) as Record<Locale, T>)

  const patch = (locale: Locale, change: Partial<T>) =>
    setRows((current) => ({ ...current, [locale]: { ...current[locale], ...change } }))

  return { rows, patch }
}

function TrackForm({
  track,
  nextPosition,
  onCancel,
  onSaved,
}: {
  track: TrackTree | null
  nextPosition: number
  onCancel: () => void
  onSaved: (updated: TrackTree) => void
}) {
  const [slug, setSlug] = useState(track?.slug ?? '')
  const [abbreviation, setAbbreviation] = useState(track?.abbreviation ?? '')
  const [colorDark, setColorDark] = useState(track?.colorDark ?? '#00e5ff')
  const [colorLight, setColorLight] = useState(track?.colorLight ?? '#0e7490')
  const [position, setPosition] = useState(track?.position ?? nextPosition)
  const [isPublished, setIsPublished] = useState(track?.isPublished ?? false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // An existing track's other-locale name is not in the tree payload, so the
  // form only carries what it can prove: the resolved name for the fallback.
  const { rows, patch } = useLocaleDraft({ name: '', description: '' }, { en: { name: track?.name ?? '', description: '' } })

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    const input: TrackInput = {
      slug: slug.trim(),
      abbreviation: abbreviation.trim(),
      colorDark,
      colorLight,
      position,
      isPublished,
      translations: Object.fromEntries(
        LOCALES.filter((locale) => rows[locale].name.trim() !== '').map((locale) => [
          locale,
          {
            name: rows[locale].name.trim(),
            description: rows[locale].description.trim() === '' ? null : rows[locale].description.trim(),
          },
        ]),
      ),
    }

    try {
      onSaved(track === null ? await admin.createTrack(input) : await admin.updateTrack(track.slug, input))
    } catch (cause) {
      setError(cause instanceof ApiError ? Object.values(cause.errors)[0]?.[0] ?? cause.message : 'Could not reach the API')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="panel" onSubmit={save} style={{ borderColor: 'var(--hair-2)', marginBottom: 14 }}>
      <h2 style={{ marginBottom: 12 }}>{track === null ? 'New track' : `Edit ${track.slug}`}</h2>
      <div className="filters" style={{ marginBottom: 0 }}>
        <label className="field" style={{ flex: '1 1 200px' }}>
          <span>Slug {track === null ? '' : '(fixed)'}</span>
          <input value={slug} disabled={track !== null} onChange={(e) => setSlug(e.target.value)} placeholder="observability" required />
        </label>
        <label className="field" style={{ maxWidth: 90 }}>
          <span>Abbrev</span>
          <input value={abbreviation} maxLength={3} onChange={(e) => setAbbreviation(e.target.value)} placeholder="OB" required />
        </label>
        <label className="field" style={{ maxWidth: 120 }}>
          <span>Dark hue</span>
          <input type="color" value={colorDark} onChange={(e) => setColorDark(e.target.value)} />
        </label>
        <label className="field" style={{ maxWidth: 120 }}>
          <span>Light hue</span>
          <input type="color" value={colorLight} onChange={(e) => setColorLight(e.target.value)} />
        </label>
        <label className="field" style={{ maxWidth: 110 }}>
          <span>Position</span>
          <input type="number" min={0} value={position} onChange={(e) => setPosition(Number(e.target.value))} />
        </label>
      </div>

      <div className="two" style={{ marginTop: 14 }}>
        {LOCALES.map((locale) => (
          <div key={locale}>
            <LocaleBadge locale={locale} filled={rows[locale].name.trim() !== ''} />
            <label className="field">
              <span>Name</span>
              <input value={rows[locale].name} onChange={(e) => patch(locale, { name: e.target.value })} required={locale === FALLBACK} />
            </label>
            <label className="field" style={{ marginTop: 9 }}>
              <span>Description</span>
              <textarea style={{ minHeight: 56 }} value={rows[locale].description} onChange={(e) => patch(locale, { description: e.target.value })} />
            </label>
          </div>
        ))}
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <label className="check">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
          Published — an unpublished track is invisible to learners
        </label>
        <span className="grow" />
        <button type="button" className="btn ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn" disabled={busy}>
          {busy ? 'Saving…' : 'Save track'}
        </button>
      </div>

      {error !== null && <p className="error" style={{ marginTop: 9 }}>{error}</p>}
    </form>
  )
}

function JourneyForm({
  trackSlug,
  tracks,
  journey,
  nextPosition,
  onCancel,
  onSaved,
}: {
  trackSlug: string
  tracks: TrackTree[]
  journey: Journey | null
  nextPosition: number
  onCancel: () => void
  onSaved: (updated: TrackTree) => void
}) {
  const [slug, setSlug] = useState(journey?.slug ?? '')
  const [track, setTrack] = useState(trackSlug)
  const [tier, setTier] = useState<Tier>(journey?.tier ?? 'foundation')
  const [rule, setRule] = useState<UnlockRule>((journey?.unlockRule as UnlockRule) ?? 'sequential')
  const [position, setPosition] = useState(journey?.position ?? nextPosition)
  const [passThreshold, setPassThreshold] = useState(journey?.passThreshold ?? 70)
  const [isPublished, setIsPublished] = useState(journey?.isPublished ?? true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { rows, patch } = useLocaleDraft({ title: '', description: '' }, { en: { title: journey?.title ?? '', description: '' } })

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    const input: JourneyInput = {
      slug: slug.trim(),
      trackSlug: track,
      tier,
      unlockRule: rule,
      position,
      passThreshold,
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
      onSaved(journey === null ? await admin.createJourney(input) : await admin.updateJourney(journey.slug, input))
    } catch (cause) {
      setError(cause instanceof ApiError ? Object.values(cause.errors)[0]?.[0] ?? cause.message : 'Could not reach the API')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="panel" onSubmit={save} style={{ borderColor: 'var(--hair-2)', marginBottom: 14 }}>
      <h2 style={{ marginBottom: 12 }}>{journey === null ? 'New journey' : `Edit ${journey.slug}`}</h2>
      <div className="filters" style={{ marginBottom: 0 }}>
        <label className="field" style={{ flex: '1 1 200px' }}>
          <span>Slug {journey === null ? '' : '(fixed)'}</span>
          <input value={slug} disabled={journey !== null} onChange={(e) => setSlug(e.target.value)} placeholder="structured-logging" required />
        </label>
        <label className="field">
          <span>Track</span>
          <select value={track} onChange={(e) => setTrack(e.target.value)}>
            {tracks.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.slug}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Tier</span>
          <select value={tier} onChange={(e) => setTier(e.target.value as Tier)}>
            {TIERS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Unlock rule</span>
          <select value={rule} onChange={(e) => setRule(e.target.value as UnlockRule)}>
            {RULES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="field" style={{ maxWidth: 110 }}>
          <span>Position</span>
          <input type="number" min={1} value={position} onChange={(e) => setPosition(Number(e.target.value))} />
        </label>
        <label className="field" style={{ maxWidth: 110 }}>
          <span>Pass %</span>
          <input type="number" min={1} max={100} value={passThreshold} onChange={(e) => setPassThreshold(Number(e.target.value))} />
        </label>
      </div>

      <p className="note" style={{ marginTop: 12 }}>
        {rule === 'sequential'
          ? 'Sequential: the journey before this one must be completed, which means it needs a quiz.'
          : rule === 'tier'
            ? 'Tier: every journey in an earlier tier must be completed.'
            : 'Open: always available.'}
      </p>

      <div className="two" style={{ marginTop: 14 }}>
        {LOCALES.map((locale) => (
          <div key={locale}>
            <LocaleBadge locale={locale} filled={rows[locale].title.trim() !== ''} />
            <label className="field">
              <span>Title</span>
              <input value={rows[locale].title} onChange={(e) => patch(locale, { title: e.target.value })} required={locale === FALLBACK} />
            </label>
            <label className="field" style={{ marginTop: 9 }}>
              <span>Description</span>
              <textarea style={{ minHeight: 56 }} value={rows[locale].description} onChange={(e) => patch(locale, { description: e.target.value })} />
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
          {busy ? 'Saving…' : 'Save journey'}
        </button>
      </div>

      {error !== null && <p className="error" style={{ marginTop: 9 }}>{error}</p>}
    </form>
  )
}

function QuizForm({
  journeySlug,
  quizSlug,
  defaultTitle,
  onCancel,
  onSaved,
  onError,
}: {
  journeySlug: string
  quizSlug: string | null
  defaultTitle: string
  onCancel: () => void
  onSaved: (updated: TrackTree) => void
  onError: (message: string) => void
}) {
  const [slug, setSlug] = useState(quizSlug ?? `${journeySlug}-core`)
  const [questionCount, setQuestionCount] = useState(2)
  const [timeLimit, setTimeLimit] = useState('')
  const [shuffleQuestions, setShuffleQuestions] = useState(true)
  const [shuffleOptions, setShuffleOptions] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { rows, patch } = useLocaleDraft({ title: '' }, { en: { title: defaultTitle } })

  useEffect(() => {
    if (quizSlug === null) return

    admin
      .quizQuestions(quizSlug)
      .then((data) => setQuestionCount(data.questionCount))
      .catch(() => onError('Could not read the quiz'))
  }, [quizSlug, onError])

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    const input: QuizInput = {
      slug: slug.trim(),
      journeySlug,
      questionCount,
      timeLimitS: timeLimit.trim() === '' ? null : Number(timeLimit),
      shuffleQuestions,
      shuffleOptions,
      position: 0,
      translations: Object.fromEntries(
        LOCALES.filter((locale) => rows[locale].title.trim() !== '').map((locale) => [
          locale,
          { title: rows[locale].title.trim() },
        ]),
      ),
    }

    try {
      onSaved(quizSlug === null ? await admin.createQuiz(input) : await admin.updateQuiz(quizSlug, input))
    } catch (cause) {
      setError(cause instanceof ApiError ? Object.values(cause.errors)[0]?.[0] ?? cause.message : 'Could not reach the API')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="panel" onSubmit={save} style={{ marginTop: 12, borderColor: 'var(--hair-2)' }}>
      <h3 style={{ marginBottom: 10 }}>{quizSlug === null ? 'New quiz' : `Edit ${quizSlug}`}</h3>
      <div className="filters" style={{ marginBottom: 0 }}>
        <label className="field" style={{ flex: '1 1 200px' }}>
          <span>Slug {quizSlug === null ? '' : '(fixed)'}</span>
          <input value={slug} disabled={quizSlug !== null} onChange={(e) => setSlug(e.target.value)} required />
        </label>
        <label className="field" style={{ maxWidth: 130 }}>
          <span>Questions served</span>
          <input type="number" min={1} max={50} value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} />
        </label>
        <label className="field" style={{ maxWidth: 130 }}>
          <span>Time limit (s)</span>
          <input type="number" min={10} value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} placeholder="none" />
        </label>
      </div>

      <div className="two" style={{ marginTop: 12 }}>
        {LOCALES.map((locale) => (
          <div key={locale}>
            <LocaleBadge locale={locale} filled={rows[locale].title.trim() !== ''} />
            <label className="field">
              <span>Title</span>
              <input value={rows[locale].title} onChange={(e) => patch(locale, { title: e.target.value })} required={locale === FALLBACK} />
            </label>
          </div>
        ))}
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <label className="check">
          <input type="checkbox" checked={shuffleQuestions} onChange={(e) => setShuffleQuestions(e.target.checked)} />
          Shuffle questions
        </label>
        <label className="check">
          <input type="checkbox" checked={shuffleOptions} onChange={(e) => setShuffleOptions(e.target.checked)} />
          Shuffle options
        </label>
        <span className="grow" />
        <button type="button" className="btn ghost sm" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn sm" disabled={busy}>
          {busy ? 'Saving…' : 'Save quiz'}
        </button>
      </div>

      {error !== null && <p className="error" style={{ marginTop: 9 }}>{error}</p>}
    </form>
  )
}

function QuizQuestionPicker({
  quizSlug,
  onClose,
  onError,
}: {
  quizSlug: string
  onClose: () => void
  onError: (message: string) => void
}) {
  const [keys, setKeys] = useState<string[] | null>(null)
  const [served, setServed] = useState(0)
  const [candidates, setCandidates] = useState<{ key: string; stem: string }[]>([])
  const [term, setTerm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    admin
      .quizQuestions(quizSlug)
      .then((data) => {
        setKeys(data.keys)
        setServed(data.questionCount)
      })
      .catch(() => onError('Could not read the quiz questions'))
  }, [quizSlug, onError])

  useEffect(() => {
    admin
      .questions({ q: term.trim(), perPage: 20 })
      .then((page) => setCandidates(page.data.map((q) => ({ key: q.key, stem: q.stem }))))
      .catch(() => setCandidates([]))
  }, [term])

  async function save() {
    if (keys === null) return

    setBusy(true)
    setError(null)

    try {
      const saved = await admin.setQuizQuestions(quizSlug, keys)

      setKeys(saved.keys)
      onClose()
    } catch (cause) {
      setError(cause instanceof ApiError ? Object.values(cause.errors)[0]?.[0] ?? cause.message : 'Could not reach the API')
    } finally {
      setBusy(false)
    }
  }

  if (keys === null) return <p className="muted" style={{ marginTop: 12 }}>Loading…</p>

  const move = (index: number, by: number) => {
    const next = [...keys]

    ;[next[index + by], next[index]] = [next[index], next[index + by]]
    setKeys(next)
  }

  return (
    <div className="panel" style={{ marginTop: 12, borderColor: 'var(--hair-2)' }}>
      <h3 style={{ marginBottom: 4 }}>Questions in {quizSlug}</h3>
      <p className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
        {keys.length} attached, {served} served per attempt. Order is the order served when shuffle is off.
      </p>

      {keys.length < served && keys.length > 0 && (
        <p className="note warn" style={{ marginBottom: 10 }}>
          This quiz serves {served} questions but only {keys.length} are attached. Attach more, or lower the served count
          first.
        </p>
      )}

      <div className="rows" style={{ marginBottom: 14 }}>
        {keys.length === 0 && <p className="empty">Nothing attached yet.</p>}
        {keys.map((key, index) => (
          <div key={key} className="row">
            <span className="letter">{index + 1}</span>
            <code className="grow">{key}</code>
            <button type="button" className="btn ghost sm" disabled={index === 0} onClick={() => move(index, -1)}>
              ↑
            </button>
            <button type="button" className="btn ghost sm" disabled={index === keys.length - 1} onClick={() => move(index, 1)}>
              ↓
            </button>
            <button type="button" className="btn danger sm" onClick={() => setKeys(keys.filter((k) => k !== key))}>
              Remove
            </button>
          </div>
        ))}
      </div>

      <label className="field">
        <span>Add a question</span>
        <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="search key or stem…" />
      </label>

      <div className="rows" style={{ marginTop: 10, maxHeight: 220, overflowY: 'auto' }}>
        {candidates
          .filter((candidate) => !keys.includes(candidate.key))
          .map((candidate) => (
            <div key={candidate.key} className="row">
              <div className="grow" style={{ minWidth: 0 }}>
                <code>{candidate.key}</code>
                <span className="stem" style={{ display: 'block' }}>
                  {candidate.stem}
                </span>
              </div>
              <button type="button" className="btn ghost sm" onClick={() => setKeys([...keys, candidate.key])}>
                Add
              </button>
            </div>
          ))}
      </div>

      <div className="row" style={{ marginTop: 14 }}>
        <span className="grow" />
        <button type="button" className="btn ghost sm" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn sm" disabled={busy} onClick={() => void save()}>
          {busy ? 'Saving…' : 'Save list'}
        </button>
      </div>

      {error !== null && <p className="error" style={{ marginTop: 9 }}>{error}</p>}
    </div>
  )
}
