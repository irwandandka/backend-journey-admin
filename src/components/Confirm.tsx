import { useState } from 'react'

type Props = {
  label: string
  confirmLabel?: string
  busy?: boolean
  onConfirm: () => void
}

/**
 * A delete button that asks once, inline. A modal for a two-word question is
 * more ceremony than the action deserves, and the API refuses anything that
 * would destroy learner history anyway.
 */
export function ConfirmButton({ label, confirmLabel = 'Really delete', busy = false, onConfirm }: Props) {
  const [armed, setArmed] = useState(false)

  if (!armed) {
    return (
      <button type="button" className="btn danger sm" onClick={() => setArmed(true)}>
        {label}
      </button>
    )
  }

  return (
    <>
      <button type="button" className="btn ghost sm" onClick={() => setArmed(false)}>
        Cancel
      </button>
      <button
        type="button"
        className="btn danger sm armed"
        disabled={busy}
        onClick={() => {
          setArmed(false)
          onConfirm()
        }}
      >
        {busy ? 'Deleting…' : confirmLabel}
      </button>
    </>
  )
}
