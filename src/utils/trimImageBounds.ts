/** Session cache: same-src + threshold share one in-flight / settled computation. */
const boundsCache = new Map<string, Promise<TrimmedImageBoundsResult>>()

export type TrimmedImageBoundsResult = {
  x: number
  y: number
  w: number
  h: number
  iw: number
  ih: number
}

const DEFAULT_THRESHOLD = 8

/** Downscale on the GPU-side draw, then scan few pixels — keeps main thread responsive on large PNGs. */
const MAX_TRIM_SCAN_EDGE = 240

function cacheKey(src: string, alphaThreshold: number) {
  return `${src}::${alphaThreshold}`
}

function scanAlphaBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  alphaThreshold: number,
): { x: number; y: number; w: number; h: number } | null {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y++) {
    const row = y * width * 4
    for (let x = 0; x < width; x++) {
      const a = data[row + x * 4 + 3]
      if (a > alphaThreshold) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < minX || maxY < minY) {
    return null
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`trimImageBounds: failed to load ${src}`))
    img.src = src
  })
}

function computeTrimmedImageBoundsFromElement(
  img: HTMLImageElement,
  alphaThreshold: number,
): TrimmedImageBoundsResult {
  const iw = img.naturalWidth
  const ih = img.naturalHeight
  const fullBox: TrimmedImageBoundsResult = { x: 0, y: 0, w: iw, h: ih, iw, ih }
  if (iw < 1 || ih < 1) {
    return fullBox
  }

  try {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
      return fullBox
    }
    const canvas = document.createElement('canvas')
    const longEdge = Math.max(iw, ih)
    const scale =
      longEdge <= MAX_TRIM_SCAN_EDGE ? 1 : MAX_TRIM_SCAN_EDGE / longEdge
    const sw = Math.max(1, Math.round(iw * scale))
    const sh = Math.max(1, Math.round(ih * scale))
    canvas.width = sw
    canvas.height = sh
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) {
      return fullBox
    }
    ctx.drawImage(img, 0, 0, sw, sh)
    const imageData = ctx.getImageData(0, 0, sw, sh)
    const bounds = scanAlphaBounds(imageData.data, sw, sh, alphaThreshold)
    if (!bounds || bounds.w < 1 || bounds.h < 1) {
      return fullBox
    }
    const sx = iw / sw
    const sy = ih / sh
    const x = Math.max(0, Math.floor(bounds.x * sx))
    const y = Math.max(0, Math.floor(bounds.y * sy))
    const w = Math.min(iw - x, Math.ceil(bounds.w * sx))
    const h = Math.min(ih - y, Math.ceil(bounds.h * sy))
    if (w < 1 || h < 1) {
      return fullBox
    }
    return { x, y, w, h, iw, ih }
  } catch {
    return fullBox
  }
}

async function computeTrimmedImageBounds(
  src: string,
  alphaThreshold: number,
): Promise<TrimmedImageBoundsResult> {
  const img = await loadHtmlImage(src)
  return computeTrimmedImageBoundsFromElement(img, alphaThreshold)
}

/**
 * Bounding box of pixels with alpha above the threshold (default 8), relative to natural size.
 * Cached per session by `src` and `alphaThreshold`. On scan failure, returns the full image box.
 */
export function getTrimmedImageBounds(
  src: string,
  opts?: { alphaThreshold?: number },
): Promise<TrimmedImageBoundsResult> {
  const alphaThreshold = opts?.alphaThreshold ?? DEFAULT_THRESHOLD
  const key = cacheKey(src, alphaThreshold)
  const cached = boundsCache.get(key)
  if (cached) return cached

  const p = computeTrimmedImageBounds(src, alphaThreshold)
  boundsCache.set(key, p)
  return p
}

/**
 * Alpha-trim using the **already-loaded** bitmap from an on-screen `<img>`.
 * Avoids spawning a second `Image()` fetch/decode for the same URL.
 */
export function getTrimmedImageBoundsFromLoadedImage(
  src: string,
  img: HTMLImageElement,
  opts?: { alphaThreshold?: number },
): Promise<TrimmedImageBoundsResult> {
  const alphaThreshold = opts?.alphaThreshold ?? DEFAULT_THRESHOLD
  const key = cacheKey(src, alphaThreshold)
  const cached = boundsCache.get(key)
  if (cached) return cached

  const settled = Promise.resolve(
    computeTrimmedImageBoundsFromElement(img, alphaThreshold),
  )
  boundsCache.set(key, settled)
  return settled
}
