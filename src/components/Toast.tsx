import { useCallback, useEffect, useRef, useState } from 'react'

type Tone = 'ok' | 'bad' | 'plain'

export function useToast() {
  const [message, setMessage] = useState<{ text: string; tone: Tone } | null>(null)
  const timer = useRef<number | null>(null)

  const show = useCallback((text: string, tone: Tone = 'plain') => {
    if (timer.current !== null) window.clearTimeout(timer.current)

    setMessage({ text, tone })
    timer.current = window.setTimeout(() => setMessage(null), 4200)
  }, [])

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    },
    [],
  )

  const node =
    message === null ? null : (
      <div className={message.tone === 'plain' ? 'toast' : `toast ${message.tone}`} role="status">
        {message.text}
      </div>
    )

  return { show, node }
}
