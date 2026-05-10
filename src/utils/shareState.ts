import LZString from 'lz-string'
import { FLOWERS_BY_ID } from '../data/flowers'
import { WRAPPERS } from '../data/wrappers'
import type { FlowerId, PlacedFlower, WrapperId } from '../types/bouquet'

/** Bump when the JSON shape changes so older links can be rejected or migrated. */
export const SHARE_STATE_VERSION = 1 as const

const WRAPPER_IDS = new Set<WrapperId>(WRAPPERS.map((w) => w.id))

export type ShareableBouquetState = {
  wrapperId: WrapperId
  bouquet: PlacedFlower[]
  letterText: string
  letterCardColor: string
}

type SharePayloadV1 = {
  v: typeof SHARE_STATE_VERSION
} & ShareableBouquetState

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

function isFlowerId(x: unknown): x is FlowerId {
  return typeof x === 'string' && x in FLOWERS_BY_ID
}

function isPlacedFlower(x: unknown): x is PlacedFlower {
  if (!isRecord(x)) return false
  const { instanceId, flowerId, xPct, yPct, rotation, scale } = x
  return (
    typeof instanceId === 'string' &&
    instanceId.length > 0 &&
    isFlowerId(flowerId) &&
    typeof xPct === 'number' &&
    Number.isFinite(xPct) &&
    typeof yPct === 'number' &&
    Number.isFinite(yPct) &&
    typeof rotation === 'number' &&
    Number.isFinite(rotation) &&
    typeof scale === 'number' &&
    Number.isFinite(scale) &&
    scale > 0
  )
}

function parsePayload(data: unknown): ShareableBouquetState | null {
  if (!isRecord(data)) return null
  if (data.v !== SHARE_STATE_VERSION) return null
  const wrapperId = data.wrapperId
  if (typeof wrapperId !== 'string' || !WRAPPER_IDS.has(wrapperId as WrapperId)) {
    return null
  }
  if (!Array.isArray(data.bouquet) || !data.bouquet.every(isPlacedFlower)) {
    return null
  }
  if (typeof data.letterText !== 'string') return null
  if (typeof data.letterCardColor !== 'string' || !data.letterCardColor.trim()) {
    return null
  }

  const clampPct = (n: number) => Math.min(100, Math.max(0, n))
  const bouquet = (data.bouquet as PlacedFlower[]).map((p) => ({
    ...p,
    xPct: clampPct(p.xPct),
    yPct: clampPct(p.yPct),
  }))

  return {
    wrapperId: wrapperId as WrapperId,
    bouquet,
    letterText: data.letterText,
    letterCardColor: data.letterCardColor.trim(),
  }
}

/** LZ-compressed JSON, safe for URLs (uses compressToEncodedURIComponent). */
export function serializeShareState(state: ShareableBouquetState): string {
  const payload: SharePayloadV1 = {
    v: SHARE_STATE_VERSION,
    wrapperId: state.wrapperId,
    bouquet: state.bouquet,
    letterText: state.letterText,
    letterCardColor: state.letterCardColor,
  }
  const json = JSON.stringify(payload)
  return LZString.compressToEncodedURIComponent(json)
}

export function deserializeShareState(encoded: string): ShareableBouquetState | null {
  if (!encoded || typeof encoded !== 'string') return null
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded.trim())
    if (!json) return null
    const data: unknown = JSON.parse(json)
    return parsePayload(data)
  } catch {
    return null
  }
}

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

/** Viewer-only mode: no chrome, only bouquet + envelope (see `buildShareUrl(..., { embed: true })`). */
export function getEmbedModeFromLocation(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return new URL(window.location.href).searchParams.get('embed') === '1'
  } catch {
    return false
  }
}

export type BuildShareUrlOptions = {
  /** When true, opens in viewer-only layout (query `embed=1`). */
  embed?: boolean
}

export function buildShareUrl(serialized: string, opts?: BuildShareUrlOptions): string {
  const base = `${window.location.origin}${window.location.pathname}`
  if (opts?.embed) {
    const u = new URL(base)
    u.searchParams.set('s', serialized)
    u.searchParams.set('embed', '1')
    return u.toString()
  }
  return `${base}#s=${serialized}`
}
