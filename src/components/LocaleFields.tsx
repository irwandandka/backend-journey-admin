import { FALLBACK } from '../lib/locales'
import type { Locale } from '../lib/types'

export function LocaleBadge({ locale, filled }: { locale: Locale; filled: boolean }) {
  return (
    <div className="locale-head">
      <span className="pill">{locale}</span>
      {locale === FALLBACK ? (
        <span className="muted" style={{ fontSize: 12 }}>
          required
        </span>
      ) : filled ? (
        <span className="pill ok">translated</span>
      ) : (
        <span className="pill gap">not translated</span>
      )}
    </div>
  )
}
