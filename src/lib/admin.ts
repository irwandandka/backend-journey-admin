import { api } from './api'
import type {
  Envelope,
  JourneyInput,
  Overview,
  Page,
  QuestionDetail,
  QuestionInput,
  QuestionSummary,
  QuizInput,
  QuizQuestions,
  Tag,
  TrackInput,
  TrackTree,
} from './types'

export type QuestionFilters = {
  track?: string
  tag?: string
  difficulty?: string
  missingLocale?: string
  q?: string
  page?: number
  perPage?: number
}

function query(filters: QuestionFilters): string {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === '' || value === null) continue
    params.set(key, String(value))
  }

  const encoded = params.toString()

  return encoded === '' ? '' : `?${encoded}`
}

export const admin = {
  overview: () => api<Envelope<Overview>>('/admin/overview').then((r) => r.data),

  tracks: () => api<Envelope<TrackTree[]>>('/admin/tracks').then((r) => r.data),

  createTrack: (input: TrackInput) =>
    api<Envelope<TrackTree>>('/admin/tracks', { method: 'POST', body: input }).then((r) => r.data),

  updateTrack: (slug: string, input: TrackInput) =>
    api<Envelope<TrackTree>>(`/admin/tracks/${encodeURIComponent(slug)}`, { method: 'PUT', body: input })
      .then((r) => r.data),

  createJourney: (input: JourneyInput) =>
    api<Envelope<TrackTree>>('/admin/journeys', { method: 'POST', body: input }).then((r) => r.data),

  updateJourney: (slug: string, input: JourneyInput) =>
    api<Envelope<TrackTree>>(`/admin/journeys/${encodeURIComponent(slug)}`, { method: 'PUT', body: input })
      .then((r) => r.data),

  createQuiz: (input: QuizInput) =>
    api<Envelope<TrackTree>>('/admin/quizzes', { method: 'POST', body: input }).then((r) => r.data),

  updateQuiz: (slug: string, input: QuizInput) =>
    api<Envelope<TrackTree>>(`/admin/quizzes/${encodeURIComponent(slug)}`, { method: 'PUT', body: input })
      .then((r) => r.data),

  quizQuestions: (slug: string) =>
    api<Envelope<QuizQuestions>>(`/admin/quizzes/${encodeURIComponent(slug)}/questions`).then((r) => r.data),

  setQuizQuestions: (slug: string, keys: string[]) =>
    api<Envelope<QuizQuestions>>(`/admin/quizzes/${encodeURIComponent(slug)}/questions`, {
      method: 'PUT',
      body: { keys },
    }).then((r) => r.data),

  tags: () => api<Envelope<Tag[]>>('/admin/tags').then((r) => r.data),

  createTag: (slug: string, name: string) =>
    api<Envelope<Tag>>('/admin/tags', { method: 'POST', body: { slug, name } }).then((r) => r.data),

  questions: (filters: QuestionFilters) => api<Page<QuestionSummary>>(`/admin/questions${query(filters)}`),

  question: (key: string) =>
    api<Envelope<QuestionDetail>>(`/admin/questions/${encodeURIComponent(key)}`).then((r) => r.data),

  createQuestion: (input: QuestionInput) =>
    api<Envelope<QuestionDetail>>('/admin/questions', { method: 'POST', body: input }).then((r) => r.data),

  updateQuestion: (key: string, input: QuestionInput) =>
    api<Envelope<QuestionDetail> & { meta: { newVersion: boolean } }>(
      `/admin/questions/${encodeURIComponent(key)}`,
      { method: 'PUT', body: input },
    ),
}
