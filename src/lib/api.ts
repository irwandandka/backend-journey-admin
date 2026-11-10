const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export class ApiError extends Error {
  readonly status: number
  readonly errors: Record<string, string[]>

  constructor(status: number, message: string, errors: Record<string, string[]> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }

  firstError(field: string): string | undefined {
    return this.errors[field]?.[0]
  }
}

function readCookie(name: string): string | null {
  const escaped = name.replace(/([.*+?^${}()|[\]\\])/g, '\\$1')
  const match = document.cookie.match(new RegExp(`(^|;\\s*)${escaped}=([^;]*)`))

  return match ? decodeURIComponent(match[2]) : null
}

let csrfFetched = false

async function ensureCsrfCookie(): Promise<void> {
  if (csrfFetched && readCookie('XSRF-TOKEN')) return

  await fetch(`${BASE}/sanctum/csrf-cookie`, { credentials: 'include' })
  csrfFetched = true
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  locale?: string
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET'
  const mutating = method !== 'GET'

  if (mutating) await ensureCsrfCookie()

  const send = (): Promise<Response> => {
    const token = readCookie('XSRF-TOKEN')

    return fetch(`${BASE}/api/v1${path}`, {
      method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token === null ? {} : { 'X-XSRF-TOKEN': token }),
        ...(options.locale === undefined ? {} : { 'Accept-Language': options.locale }),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  }

  let response = await send()

  if (response.status === 419 && mutating) {
    csrfFetched = false
    await ensureCsrfCookie()
    response = await send()
  }

  if (response.status === 204) return undefined as T

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.message ?? response.statusText,
      payload?.errors ?? {},
    )
  }

  return payload as T
}
