// The App.Data.* shapes come from src/types/api.d.ts, generated out of the
// Laravel Data DTOs. Run `npm run sync:types` after changing a DTO.

export type Locale = 'en' | 'id'

type Unknown<T, M> = Exclude<keyof M, keyof T>

type Narrow<T, M> = [Unknown<T, M>] extends [never]
  ? Omit<T, keyof M> & M
  : { 'narrowed a field the API does not send': Unknown<T, M> }

export type QuestionType = 'single_choice' | 'multi_choice' | 'true_false'

export type Difficulty = 'easy' | 'medium' | 'hard'

export type Tier = 'foundation' | 'intermediate' | 'advanced' | 'deep'

export type User = Narrow<App.Data.UserData, { locale: Locale }>

export type QuestionSummary = Narrow<
  App.Data.Admin.QuestionSummaryData,
  { type: QuestionType; difficulty: Difficulty; missingLocales: Locale[] }
>

export type QuestionDetail = Narrow<
  App.Data.Admin.QuestionDetailData,
  { type: QuestionType; difficulty: Difficulty }
>

export type QuestionInput = Narrow<
  App.Data.Admin.QuestionInputData,
  { type: QuestionType; difficulty: Difficulty }
>

export type Tag = { slug: string; name: string; questionCount: number }

export type Overview = Narrow<
  App.Data.Admin.OverviewData,
  {
    translationCoverage: { locale: Locale; translated: number; total: number }[]
    emptyJourneys: { slug: string; trackSlug: string; position: number; tier: Tier }[]
  }
>

export type TrackTree = Narrow<
  App.Data.Admin.TrackTreeData,
  { journeys: (Omit<App.Data.Admin.TrackTreeData['journeys'][number], 'tier'> & { tier: Tier })[] }
>

export type Page<T> = {
  data: T[]
  meta: { page: number; perPage: number; total: number; lastPage: number }
}

export type Envelope<T> = { data: T }
