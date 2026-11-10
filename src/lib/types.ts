// The App.Data.* shapes come from src/types/api.d.ts, generated out of the
// Laravel Data DTOs. Run `npm run sync:types` after changing a DTO.

export type Locale = 'en' | 'id'

type Unknown<T, M> = Exclude<keyof M, keyof T>

type Narrow<T, M> = [Unknown<T, M>] extends [never]
  ? Omit<T, keyof M> & M
  : { 'narrowed a field the API does not send': Unknown<T, M> }

export type User = Narrow<App.Data.UserData, { locale: Locale }>

export type Envelope<T> = { data: T }
