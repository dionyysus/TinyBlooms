import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type SyntheticEvent,
} from 'react'
import {
  getTrimmedImageBoundsFromLoadedImage,
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
 * Trim runs on the **same** `<img>` decode as the visible asset (no duplicate fetch).
 */
export function TrimmedFlowerImage({
  src,
  alt,
  displayHeightPx,
  fallbackImgClassName,
  wrapperClassName = '',
  fetchPriority,
}: Props) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [bounds, setBounds] = useState<TrimmedImageBoundsResult | null>(null)

  const applyTrimFromImage = useCallback((img: HTMLImageElement) => {
    if (img.naturalWidth < 1) return
    void getTrimmedImageBoundsFromLoadedImage(src, img)
      .then(setBounds)
      .catch(() => setBounds(null))
  }, [src])

  useLayoutEffect(() => {
    const el = imgRef.current
    if (el?.complete && el.naturalWidth > 0) {
      applyTrimFromImage(el)
    }
  }, [src, applyTrimFromImage])

  const onLoad = useCallback(
    (e: SyntheticEvent<HTMLImageElement>) => {
      applyTrimFromImage(e.currentTarget)
    },
    [applyTrimFromImage],
  )

  const cropped =
    bounds &&
    displayHeightPx > 0 &&
    isNontrivialTrim(bounds) &&
    bounds.h > 1e-6

  const s = cropped && bounds ? displayHeightPx / bounds.h : 0

  return (
    <div
      className={
        cropped
          ? `relative inline-flex shrink-0 overflow-hidden ${wrapperClassName}`
          : `inline-flex shrink-0 ${wrapperClassName}`.trim()
      }
      style={
        cropped && bounds
          ? { width: bounds.w * s, height: displayHeightPx }
          : undefined
      }
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onLoad={onLoad}
        draggable={false}
        decoding="async"
        fetchPriority={fetchPriority}
        className={
          cropped ? 'pointer-events-none max-w-none select-none' : fallbackImgClassName
        }
        style={
          cropped && bounds
            ? {
                position: 'absolute',
                left: -bounds.x * s,
                top: -bounds.y * s,
                width: bounds.iw * s,
                height: bounds.ih * s,
              }
            : undefined
        }
      />
    </div>
  )
}
