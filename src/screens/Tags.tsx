import { useEffect, useState } from 'react'
import { useToast } from '../components/Toast'
import { admin } from '../lib/admin'
import { ApiError } from '../lib/api'
import type { Tag } from '../lib/types'

export function Tags() {
  const toast = useToast()
  const [tags, setTags] = useState<Tag[] | null>(null)
  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    admin.tags().then(setTags).catch(() => setTags([]))
  }, [])

  async function create(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    try {
      const tag = await admin.createTag(slug.trim(), name.trim())

      setTags((current) => [...(current ?? []), tag].sort((a, b) => a.slug.localeCompare(b.slug)))
      setSlug('')
      setName('')
      toast.show(`Added ${tag.slug}`, 'ok')
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? (cause.firstError('slug') ?? cause.firstError('name') ?? cause.message)
          : 'Could not reach the API',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="head">
        <div className="grow">
          <p className="eyebrow">Content</p>
          <h1>Tags</h1>
        </div>
      </div>

      <form className="panel" onSubmit={create}>
        <div className="filters" style={{ marginBottom: 0 }}>
          <label className="field" style={{ flex: '1 1 160px' }}>
            <span>Slug</span>
            <input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="wal" required />
          </label>
          <label className="field" style={{ flex: '1 1 200px' }}>
            <span>Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="WAL" required />
          </label>
          <button type="submit" className="btn" disabled={busy}>
            {busy ? 'Adding…' : 'Add tag'}
          </button>
        </div>
        {error !== null && <p className="error" style={{ marginTop: 9 }}>{error}</p>}
      </form>

      <div className="panel" style={{ padding: '14px 6px 6px' }}>
        {tags === null ? (
          <p className="empty">Loading…</p>
        ) : tags.length === 0 ? (
          <p className="empty">No tags yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Slug</th>
                <th>Name</th>
                <th className="num">Questions</th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag) => (
                <tr key={tag.slug}>
                  <td>
                    <span className="key">{tag.slug}</span>
                  </td>
                  <td>{tag.name}</td>
                  <td className="num">{tag.questionCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {toast.node}
    </>
  )
}
