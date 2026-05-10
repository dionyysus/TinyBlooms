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

/** Viewer-only mode: URL has `embed=1` (see `buildShareUrl(..., { embed: true })`). */
export function getEmbedModeFromLocation(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return new URL(window.location.href).searchParams.get('embed') === '1'
  } catch {
    return false
  }
}
