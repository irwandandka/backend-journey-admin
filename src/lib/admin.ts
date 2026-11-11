import { api } from './api'
import type {
  Envelope,
  Overview,
  Page,
  QuestionDetail,
  QuestionInput,
  QuestionSummary,
  Tag,
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
