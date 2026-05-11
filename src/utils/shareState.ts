import LZString from 'lz-string'
import { FLOWERS, FLOWERS_BY_ID } from '../data/flowers'
import { WRAPPERS } from '../data/wrappers'
import type { FlowerId, PlacedFlower, WrapperId } from '../types/bouquet'

const SHARE_SCALE_MIN = 0.3

/** Latest on-the-wire format; older links may still use `v: 1`. */
export const SHARE_STATE_VERSION = 2 as const

const WRAPPER_IDS = new Set<WrapperId>(WRAPPERS.map((w) => w.id))

export type ShareableBouquetState = {
  wrapperId: WrapperId
  bouquet: PlacedFlower[]
  letterText: string
  letterCardColor: string
}

type SharePayloadV1 = {
  v: 1
  wrapperId: WrapperId
  bouquet: PlacedFlower[]
  letterText: string
  letterCardColor: string
}

/** Compact: short keys, numeric tuples, no UUIDs in the URL. */
type SharePayloadV2 = {
  v: 2
  /** Wrapper index in `WRAPPERS` */
  w: number
  /** Rows: [flowerIndex, xPct×10, yPct×10, rotation×10, scale×100] — all integers */
  b: number[][]
  t: string
  c: string
}

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

function parsePayloadV1(data: Record<string, unknown>): ShareableBouquetState | null {
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

function isCompactRow(x: unknown): x is number[] {
  if (!Array.isArray(x) || x.length !== 5) return false
  return x.every((n) => typeof n === 'number' && Number.isFinite(n))
}

function parsePayloadV2(data: Record<string, unknown>): ShareableBouquetState | null {
  const wIdx = data.w
  if (typeof wIdx !== 'number' || !Number.isInteger(wIdx) || wIdx < 0 || wIdx >= WRAPPERS.length) {
    return null
  }
  const rows = data.b
  if (!Array.isArray(rows) || !rows.every(isCompactRow)) {
    return null
  }
  if (typeof data.t !== 'string') return null
  if (typeof data.c !== 'string' || !data.c.trim()) {
    return null
  }

  const wrapperId = WRAPPERS[wIdx]!.id
  const bouquet: PlacedFlower[] = []
  for (const row of rows) {
    const [fi, x10, y10, r10, s100] = row
    if (fi < 0 || fi >= FLOWERS.length) return null
    const flower = FLOWERS[fi]!
    const xPct = Math.min(100, Math.max(0, x10 / 10))
    const yPct = Math.min(100, Math.max(0, y10 / 10))
    const rotation = r10 / 10
    const scale = Math.max(SHARE_SCALE_MIN, s100 / 100)
    bouquet.push({
      instanceId: crypto.randomUUID(),
      flowerId: flower.id as FlowerId,
      xPct,
      yPct,
      rotation,
      scale,
    })
  }

  return {
    wrapperId,
    bouquet,
    letterText: data.t,
    letterCardColor: data.c.trim(),
  }
}

function parsePayload(data: unknown): ShareableBouquetState | null {
  if (!isRecord(data)) return null
  const ver = data.v
  if (ver === 1) return parsePayloadV1(data)
  if (ver === 2) return parsePayloadV2(data)
  return null
}

/** LZ-compressed JSON; emits compact `v:2` payloads for shorter URLs. */
export function serializeShareState(state: ShareableBouquetState): string {
  const wIdx = WRAPPERS.findIndex((w) => w.id === state.wrapperId)
  if (wIdx < 0) return serializeShareStateV1Fallback(state)

  const rows: number[][] = []
  for (const p of state.bouquet) {
    const fi = FLOWERS.findIndex((f) => f.id === p.flowerId)
    if (fi < 0) return serializeShareStateV1Fallback(state)
    rows.push([
      fi,
      Math.round(Math.min(100, Math.max(0, p.xPct)) * 10),
      Math.round(Math.min(100, Math.max(0, p.yPct)) * 10),
      Math.round(p.rotation * 10),
      Math.round(Math.max(SHARE_SCALE_MIN, p.scale) * 100),
    ])
  }

  const payload: SharePayloadV2 = {
    v: 2,
    w: wIdx,
    b: rows,
    t: state.letterText,
    c: state.letterCardColor,
  }
  const json = JSON.stringify(payload)
  return LZString.compressToEncodedURIComponent(json)
}

/** Longer legacy encoding — used only if an unknown flower/wrapper appears. */
function serializeShareStateV1Fallback(state: ShareableBouquetState): string {
  const payload: SharePayloadV1 = {
    v: 1,
    wrapperId: state.wrapperId,
    bouquet: state.bouquet,
    letterText: state.letterText,
    letterCardColor: state.letterCardColor,
  }
  return LZString.compressToEncodedURIComponent(JSON.stringify(payload))
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

export type BuildShareUrlOptions = {
  /** When true, opens in viewer-only layout (query `embed=1`). */
  embed?: boolean
}

/**
 * Base URL for “Copy link”. Uses `VITE_PUBLIC_SITE_URL` when set (prod URL), otherwise
 * origin + path aligned with `import.meta.env.BASE_URL` when applicable (e.g. GitHub Pages).
 */
function shareLinkBase(): string {
  const configured = import.meta.env.VITE_PUBLIC_SITE_URL?.trim()
  if (configured) {
    try {
      const u = new URL(configured)
      const path = u.pathname.replace(/\/$/, '')
      return path ? `${u.origin}${path}` : u.origin
    } catch {
      /* invalid */
    }
  }
  if (typeof window === 'undefined') return ''
  const origin = window.location.origin
  const basePath = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')
  const rawPath = window.location.pathname.replace(/\/$/, '')
  if (basePath && rawPath === basePath) {
    return `${origin}${basePath}`
  }
  if (basePath && rawPath.startsWith(`${basePath}/`)) {
    return `${origin}${basePath}`
  }
  return rawPath ? `${origin}${rawPath}` : origin
}

export function buildShareUrl(serialized: string, opts?: BuildShareUrlOptions): string {
  const base = shareLinkBase()
  if (opts?.embed) {
    /**
     * Keep `embed` in the query (router) but put the payload in the **hash** so:
     * - long bouquets are not truncated by query / CDN / mail clients as often
     * - `?embed=1#s=…` still loads the SPA; hash is client-only (same origin path)
     */
    const u = new URL(base)
    u.searchParams.set('embed', '1')
    u.hash = `s=${serialized}`
    return u.toString()
  }
  return `${base}#s=${serialized}`
}

export {
  getEmbedModeFromLocation,
  getSharePayloadFromLocation,
} from './shareUrlParams'
