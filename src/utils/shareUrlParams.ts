/**
 * URL-only helpers for share/embed links — keeps the initial bundle free of
 * `lz-string` and flower/wrapper validation data (those stay in `shareState.ts`).
 */

/**
 * Reads a share payload from `?s=` or `#s=` (fragment after `#` must be `s=<payload>`).
 */
export function getSharePayloadFromLocation(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const url = new URL(window.location.href)
    const fromQuery = url.searchParams.get('s')
    if (fromQuery && fromQuery.trim()) return fromQuery.trim()

    const { hash } = window.location
    if (hash.length <= 1) return null
    const raw = hash.startsWith('#') ? hash.slice(1) : hash
    if (raw.startsWith('s=')) {
      return raw.slice(2)
    }
    return null
  } catch {
    return null
  }
}

/** Viewer-only mode: `embed` query (see `buildShareUrl(..., { embed: true })`). */
export function getEmbedModeFromLocation(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const v = new URL(window.location.href).searchParams.get('embed')
    if (v == null) return false
    const t = v.trim().toLowerCase()
    return t === '1' || t === 'true' || t === 'yes' || t === 'on'
  } catch {
    return false
  }
}
