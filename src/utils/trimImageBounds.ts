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

async function computeTrimmedImageBounds(
  src: string,
  alphaThreshold: number,
): Promise<TrimmedImageBoundsResult> {
  const img = await loadHtmlImage(src)
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
    canvas.width = iw
    canvas.height = ih
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) {
      return fullBox
    }
    ctx.drawImage(img, 0, 0)
    const imageData = ctx.getImageData(0, 0, iw, ih)
    const bounds = scanAlphaBounds(imageData.data, iw, ih, alphaThreshold)
    if (!bounds || bounds.w < 1 || bounds.h < 1) {
      return fullBox
    }
    return { ...bounds, iw, ih }
  } catch {
    return fullBox
  }
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
