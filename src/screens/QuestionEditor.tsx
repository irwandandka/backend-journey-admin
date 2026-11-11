import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../components/Toast'
import { admin } from '../lib/admin'
import { ApiError } from '../lib/api'
import type { Difficulty, Locale, QuestionDetail, QuestionInput, QuestionType, Tag, TrackTree } from '../lib/types'

const LOCALES: Locale[] = ['en', 'id']
const FALLBACK: Locale = 'en'
const TYPES: QuestionType[] = ['single_choice', 'multi_choice', 'true_false']
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']

type StemDraft = { stemMd: string; explanationMd: string; codeSnippet: string }
type LabelDraft = { labelMd: string; optionExplanationMd: string }

type Draft = {
  key: string
  trackSlug: string
  type: QuestionType
  difficulty: Difficulty
  isActive: boolean
  codeLanguage: string
  tags: string[]
  translations: Record<Locale, StemDraft>
  options: { isCorrect: boolean; translations: Record<Locale, LabelDraft> }[]
}

const emptyStem = (): StemDraft => ({ stemMd: '', explanationMd: '', codeSnippet: '' })
const emptyLabel = (): LabelDraft => ({ labelMd: '', optionExplanationMd: '' })

const emptyOption = () => ({
  isCorrect: false,
  translations: { en: emptyLabel(), id: emptyLabel() } as Record<Locale, LabelDraft>,
})

function blankDraft(trackSlug: string): Draft {
  return {
    key: '',
    trackSlug,
    type: 'single_choice',
    difficulty: 'medium',
    isActive: true,
    codeLanguage: '',
    tags: [],
    translations: { en: emptyStem(), id: emptyStem() },
    options: [{ ...emptyOption(), isCorrect: true }, emptyOption(), emptyOption(), emptyOption()],
  }
}

function draftFrom(detail: QuestionDetail): Draft {
  const translations = { en: emptyStem(), id: emptyStem() } as Record<Locale, StemDraft>

  for (const locale of LOCALES) {
    const row = detail.translations[locale]

    if (row === undefined) continue

    translations[locale] = {
      stemMd: row.stemMd,
      explanationMd: row.explanationMd ?? '',
      codeSnippet: row.codeSnippet ?? '',
    }
  }

  return {
    key: detail.key,
    trackSlug: detail.trackSlug,
    type: detail.type,
    difficulty: detail.difficulty,
    isActive: detail.isActive,
    codeLanguage: detail.codeLanguage ?? '',
    tags: detail.tags,
    translations,
    options: detail.options.map((option) => {
      const labels = { en: emptyLabel(), id: emptyLabel() } as Record<Locale, LabelDraft>

      for (const locale of LOCALES) {
        const row = option.translations[locale]

        if (row === undefined) continue

        labels[locale] = { labelMd: row.labelMd, optionExplanationMd: row.optionExplanationMd ?? '' }
      }

      return { isCorrect: option.isCorrect, translations: labels }
    }),
  }
}

/**
 * Only locales with a stem are sent. An empty Indonesian column means "not
 * translated yet", not "translated to an empty string".
 */
function toInput(draft: Draft): QuestionInput {
  const translations: QuestionInput['translations'] = {}

  for (const locale of LOCALES) {
    const row = draft.translations[locale]

    if (row.stemMd.trim() === '') continue

    translations[locale] = {
      stemMd: row.stemMd.trim(),
      explanationMd: row.explanationMd.trim() === '' ? null : row.explanationMd.trim(),
      codeSnippet: row.codeSnippet.trim() === '' ? null : row.codeSnippet.trim(),
    }
  }

  return {
    key: draft.key.trim(),
    trackSlug: draft.trackSlug,
    type: draft.type,
    difficulty: draft.difficulty,
    isActive: draft.isActive,
    codeLanguage: draft.codeLanguage.trim() === '' ? null : draft.codeLanguage.trim(),
    tags: draft.tags,
    translations,
    options: draft.options.map((option) => {
      const labels: QuestionInput['options'][number]['translations'] = {}

      for (const locale of LOCALES) {
        const row = option.translations[locale]

        if (row.labelMd.trim() === '') continue

        labels[locale] = {
          labelMd: row.labelMd.trim(),
          optionExplanationMd: row.optionExplanationMd.trim() === '' ? null : row.optionExplanationMd.trim(),
        }
      }

      return { isCorrect: option.isCorrect, translations: labels }
    }),
  }
}

export function QuestionEditor() {
  const { key } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const isNew = key === undefined

  const [tracks, setTracks] = useState<TrackTree[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [detail, setDetail] = useState<QuestionDetail | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    admin.tags().then(setTags).catch(() => setTags([]))
    admin.tracks().then(setTracks).catch(() => setTracks([]))
  }, [])

  useEffect(() => {
    if (isNew) return

    admin
      .question(key)
      .then((loaded) => {
        setDetail(loaded)
        setDraft(draftFrom(loaded))
      })
      .catch(() => setNotFound(true))
  }, [isNew, key])

  useEffect(() => {
    if (!isNew || draft !== null || tracks.length === 0) return

    setDraft(blankDraft(tracks[0].slug))
  }, [isNew, draft, tracks])

  const patch = useCallback((change: Partial<Draft>) => {
    setDraft((current) => (current === null ? current : { ...current, ...change }))
  }, [])

  const correctCount = useMemo(
    () => draft?.options.filter((option) => option.isCorrect).length ?? 0,
    [draft],
  )

  const contentChanged = useMemo(() => {
    if (draft === null || detail === null) return false

    return JSON.stringify(toInput(draft)) !== JSON.stringify(toInput(draftFrom(detail)))
  }, [draft, detail])

  async function save() {
    if (draft === null) return

    setSaving(true)
    setErrors({})

    try {
      if (isNew) {
        const created = await admin.createQuestion(toInput(draft))

        toast.show(`Created ${created.key} at version ${created.version}`, 'ok')
        navigate(`/questions/${encodeURIComponent(created.key)}`, { replace: true })
      } else {
        const result = await admin.updateQuestion(key, toInput(draft))

        setDetail(result.data)
        setDraft(draftFrom(result.data))
        toast.show(
          result.meta.newVersion
            ? `Saved as version ${result.data.version}; the previous version stays readable`
            : 'Saved. The content did not change, so no new version was written',
          'ok',
        )
      }
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 422) {
        setErrors(cause.errors)
        toast.show('Some fields need fixing', 'bad')
      } else {
        toast.show(cause instanceof ApiError ? cause.message : 'Could not reach the API', 'bad')
      }
    } finally {
      setSaving(false)
    }
  }

  if (notFound) {
    return (
      <>
        <p className="note bad">No question with the key {key}.</p>
        <p style={{ marginTop: 12 }}>
          <Link to="/questions" className="btn ghost">
            Back to questions
          </Link>
        </p>
      </>
    )
  }

  if (draft === null) return <p className="muted">Loading…</p>

  const fieldError = (field: string) => errors[field]?.[0]

  return (
    <>
      <div className="head">
        <div className="grow">
          <p className="eyebrow">{isNew ? 'New question' : `Version ${detail?.version ?? 1}`}</p>
          <h1>{isNew ? 'Write a question' : draft.key}</h1>
        </div>
        <Link to="/questions" className="btn ghost">
          Cancel
        </Link>
        <button type="button" className="btn" disabled={saving} onClick={() => void save()}>
          {saving ? 'Saving…' : isNew ? 'Create' : 'Save'}
        </button>
      </div>

      {!isNew && detail !== null && (
        <p className={contentChanged ? 'note warn' : 'note'} style={{ marginBottom: 14 }}>
          {contentChanged
            ? `Saving writes version ${detail.version + 1}. Version ${detail.version} stays readable for anyone who was already served it.`
            : `No content change pending. Difficulty, tags and the active flag save without a new version.`}
        </p>
      )}

      <div className="panel">
        <h2 style={{ marginBottom: 12 }}>Metadata</h2>
        <div className="filters" style={{ marginBottom: 0 }}>
          <label className="field" style={{ flex: '1 1 240px' }}>
            <span>Key {isNew ? '' : '(fixed)'}</span>
            <input
              value={draft.key}
              disabled={!isNew}
              onChange={(event) => patch({ key: event.target.value })}
              placeholder="q-composite-index-order"
            />
          </label>
          <label className="field">
            <span>Track</span>
            <select value={draft.trackSlug} onChange={(event) => patch({ trackSlug: event.target.value })}>
              {tracks.map((track) => (
                <option key={track.slug} value={track.slug}>
                  {track.slug}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Type</span>
            <select value={draft.type} onChange={(event) => patch({ type: event.target.value as QuestionType })}>
              {TYPES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Difficulty</span>
            <select
              value={draft.difficulty}
              onChange={(event) => patch({ difficulty: event.target.value as Difficulty })}
            >
              {DIFFICULTIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Code language</span>
            <input
              value={draft.codeLanguage}
              onChange={(event) => patch({ codeLanguage: event.target.value })}
              placeholder="sql"
            />
          </label>
        </div>

        {fieldError('key') !== undefined && <p className="error" style={{ marginTop: 8 }}>{fieldError('key')}</p>}
        {fieldError('trackSlug') !== undefined && (
          <p className="error" style={{ marginTop: 8 }}>{fieldError('trackSlug')}</p>
        )}

        <div className="row" style={{ marginTop: 12 }}>
          <label className="check">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(event) => patch({ isActive: event.target.checked })}
            />
            Active — an inactive question is never served
          </label>
        </div>

        <div style={{ marginTop: 12 }}>
          <p className="eyebrow">Tags</p>
          <div className="row">
            {tags.length === 0 && <span className="muted">No tags yet.</span>}
            {tags.map((tag) => (
              <label key={tag.slug} className="check">
                <input
                  type="checkbox"
                  checked={draft.tags.includes(tag.slug)}
                  onChange={(event) =>
                    patch({
                      tags: event.target.checked
                        ? [...draft.tags, tag.slug].sort()
                        : draft.tags.filter((slug) => slug !== tag.slug),
                    })
                  }
                />
                {tag.slug}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <h2 style={{ marginBottom: 12 }}>Stem and explanation</h2>
        <div className="two">
          {LOCALES.map((locale) => (
            <div key={locale}>
              <div className="locale-head">
                <span className="pill">{locale}</span>
                {locale === FALLBACK ? (
                  <span className="muted" style={{ fontSize: 12 }}>
                    required — every other locale falls back here
                  </span>
                ) : draft.translations[locale].stemMd.trim() === '' ? (
                  <span className="pill gap">not translated</span>
                ) : (
                  <span className="pill ok">translated</span>
                )}
              </div>
              <label className="field">
                <span>Stem (markdown)</span>
                <textarea
                  value={draft.translations[locale].stemMd}
                  onChange={(event) =>
                    patch({
                      translations: {
                        ...draft.translations,
                        [locale]: { ...draft.translations[locale], stemMd: event.target.value },
                      },
                    })
                  }
                />
              </label>
              <label className="field" style={{ marginTop: 9 }}>
                <span>Why the answer is right</span>
                <textarea
                  style={{ minHeight: 64 }}
                  value={draft.translations[locale].explanationMd}
                  onChange={(event) =>
                    patch({
                      translations: {
                        ...draft.translations,
                        [locale]: { ...draft.translations[locale], explanationMd: event.target.value },
                      },
                    })
                  }
                />
              </label>
              <label className="field" style={{ marginTop: 9 }}>
                <span>Code snippet</span>
                <textarea
                  style={{ minHeight: 64 }}
                  value={draft.translations[locale].codeSnippet}
                  onChange={(event) =>
                    patch({
                      translations: {
                        ...draft.translations,
                        [locale]: { ...draft.translations[locale], codeSnippet: event.target.value },
                      },
                    })
                  }
                />
              </label>
            </div>
          ))}
        </div>
        {fieldError('translations') !== undefined && (
          <p className="error" style={{ marginTop: 10 }}>{fieldError('translations')}</p>
        )}
        {LOCALES.map((locale) => {
          const message = fieldError(`translations.${locale}.stemMd`)

          return message === undefined ? null : (
            <p key={locale} className="error" style={{ marginTop: 6 }}>
              {locale}: {message}
            </p>
          )
        })}
      </div>

      <div className="panel">
        <div className="head" style={{ marginBottom: 12 }}>
          <div className="grow">
            <h2>Options</h2>
            <p className="muted" style={{ fontSize: 12.5 }}>
              {draft.type === 'multi_choice'
                ? `${correctCount} marked correct — a multi_choice question needs at least one.`
                : `${correctCount} marked correct — a ${draft.type} question needs exactly one.`}
            </p>
          </div>
          <button
            type="button"
            className="btn ghost sm"
            disabled={draft.options.length >= 10}
            onClick={() => patch({ options: [...draft.options, emptyOption()] })}
          >
            Add option
          </button>
        </div>

        {fieldError('options') !== undefined && (
          <p className="error" style={{ marginBottom: 10 }}>{fieldError('options')}</p>
        )}

        {draft.options.map((option, index) => (
          <div key={index} className={option.isCorrect ? 'opt correct' : 'opt'}>
            <div className="top">
              <span className="letter">{LETTERS[index] ?? index + 1}</span>
              <label className="check">
                <input
                  type="checkbox"
                  checked={option.isCorrect}
                  onChange={(event) => {
                    const single = draft.type !== 'multi_choice'

                    patch({
                      options: draft.options.map((row, i) =>
                        i === index
                          ? { ...row, isCorrect: event.target.checked }
                          : single && event.target.checked
                            ? { ...row, isCorrect: false }
                            : row,
                      ),
                    })
                  }}
                />
                Correct
              </label>
              <span className="grow" />
              <button
                type="button"
                className="btn ghost sm"
                disabled={index === 0}
                onClick={() => {
                  const next = [...draft.options]

                  ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
                  patch({ options: next })
                }}
              >
                ↑
              </button>
              <button
                type="button"
                className="btn ghost sm"
                disabled={index === draft.options.length - 1}
                onClick={() => {
                  const next = [...draft.options]

                  ;[next[index + 1], next[index]] = [next[index], next[index + 1]]
                  patch({ options: next })
                }}
              >
                ↓
              </button>
              <button
                type="button"
                className="btn danger sm"
                disabled={draft.options.length <= 2}
                onClick={() => patch({ options: draft.options.filter((_, i) => i !== index) })}
              >
                Remove
              </button>
            </div>

            <div className="two">
              {LOCALES.map((locale) => (
                <div key={locale}>
                  <div className="locale-head">
                    <span className="pill">{locale}</span>
                  </div>
                  <label className="field">
                    <span>Label</span>
                    <textarea
                      style={{ minHeight: 56 }}
                      value={option.translations[locale].labelMd}
                      onChange={(event) =>
                        patch({
                          options: draft.options.map((row, i) =>
                            i === index
                              ? {
                                  ...row,
                                  translations: {
                                    ...row.translations,
                                    [locale]: { ...row.translations[locale], labelMd: event.target.value },
                                  },
                                }
                              : row,
                          ),
                        })
                      }
                    />
                  </label>
                  <label className="field" style={{ marginTop: 9 }}>
                    <span>Why this option is right or wrong</span>
                    <textarea
                      style={{ minHeight: 56 }}
                      value={option.translations[locale].optionExplanationMd}
                      onChange={(event) =>
                        patch({
                          options: draft.options.map((row, i) =>
                            i === index
                              ? {
                                  ...row,
                                  translations: {
                                    ...row.translations,
                                    [locale]: {
                                      ...row.translations[locale],
                                      optionExplanationMd: event.target.value,
                                    },
                                  },
                                }
                              : row,
                          ),
                        })
                      }
                    />
                  </label>
                </div>
              ))}
            </div>

            {fieldError(`options.${index}.translations`) !== undefined && (
              <p className="error" style={{ marginTop: 8 }}>{fieldError(`options.${index}.translations`)}</p>
            )}
          </div>
        ))}
      </div>

      {!isNew && detail !== null && detail.history.length > 0 && (
        <div className="panel">
          <h2 style={{ marginBottom: 12 }}>Version history</h2>
          <table>
            <thead>
              <tr>
                <th className="num">Version</th>
                <th className="num">Times served</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              {detail.history.map((row) => (
                <tr key={row.version}>
                  <td className="num">{row.version}</td>
                  <td className="num">{row.servedCount}</td>
                  <td>
                    {row.isCurrent ? <span className="pill ok">current</span> : <span className="pill">archived</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
            An archived version is kept so an attempt still reads as it was answered. It is used in {detail.quizCount}{' '}
            {detail.quizCount === 1 ? 'quiz' : 'quizzes'}.
          </p>
        </div>
      )}

      {toast.node}
    </>
  )
}
