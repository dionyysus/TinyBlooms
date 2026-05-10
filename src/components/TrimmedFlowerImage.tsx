import { useEffect, useState } from 'react'
import {
  getTrimmedImageBounds,
  type TrimmedImageBoundsResult,
} from '../utils/trimImageBounds'

type Props = {
  src: string
  alt: string
  /** Target height for the trimmed region in CSS pixels. */
  displayHeightPx: number
  /** Image classes before trim resolves or when using full-frame fallback. */
  fallbackImgClassName: string
  /** Optional wrapper classes appended to the cropped container. */
  wrapperClassName?: string
  /** Hint for LCP when this image is above the fold (e.g. shared viewer). */
  fetchPriority?: 'high' | 'low' | 'auto'
}

function isNontrivialTrim(b: TrimmedImageBoundsResult) {
  return (
    b.w > 0 &&
    b.h > 0 &&
    b.iw > 0 &&
    b.ih > 0 &&
    (b.x > 0 || b.y > 0 || b.w < b.iw || b.h < b.ih)
  )
}

/**
 * Sizes layout and hit-testing to opaque pixel bounds once trim analysis finishes.
 * Before that, behaves like a normal intrinsic `height` / `width: auto` PNG.
 */
export function TrimmedFlowerImage({
  src,
  alt,
  displayHeightPx,
  fallbackImgClassName,
  wrapperClassName = '',
  fetchPriority,
}: Props) {
  const [bounds, setBounds] = useState<TrimmedImageBoundsResult | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const b = await getTrimmedImageBounds(src)
        if (!cancelled) setBounds(b)
      } catch {
        if (!cancelled) setBounds(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [src])

  const cropped =
    bounds &&
    displayHeightPx > 0 &&
    isNontrivialTrim(bounds) &&
    bounds.h > 1e-6

  if (!cropped || !bounds) {
    return (
      <img
        key={src}
        src={src}
        alt={alt}
        className={fallbackImgClassName}
        draggable={false}
        decoding="async"
        fetchPriority={fetchPriority}
      />
    )
  }

  const s = displayHeightPx / bounds.h

  return (
    <div
      className={`relative inline-flex shrink-0 overflow-hidden ${wrapperClassName}`}
      style={{
        width: bounds.w * s,
        height: displayHeightPx,
      }}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        decoding="async"
        fetchPriority={fetchPriority}
        className="pointer-events-none max-w-none select-none"
        style={{
          position: 'absolute',
          left: -bounds.x * s,
          top: -bounds.y * s,
          width: bounds.iw * s,
          height: bounds.ih * s,
        }}
      />
    </div>
  )
}
