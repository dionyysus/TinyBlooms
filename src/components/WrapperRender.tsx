import type { WrapperId } from '../types/bouquet'
import { WRAPPERS } from '../data/wrappers'

export type WrapperLayer = 'back' | 'front'

type Props = {
  wrapperId: WrapperId
  layer: WrapperLayer
  height?: number
  className?: string
}

const WRAPPERS_BY_ID = Object.fromEntries(WRAPPERS.map((w) => [w.id, w])) as Record<
  WrapperId,
  (typeof WRAPPERS)[number]
>

const FRONT_MASK = 'linear-gradient(to top, black 0%, black 60%, transparent 78%)'

export function WrapperRender({ wrapperId, layer, height = 360, className = '' }: Props) {
  const wrapper = WRAPPERS_BY_ID[wrapperId]
  if (!wrapper) return null

  if (layer === 'front') {
    return (
      <img
        src={wrapper.imagePath}
        alt={wrapper.name}
        className={`w-auto object-contain ${className}`}
        style={{
          height: `${height}px`,
          maskImage: FRONT_MASK,
          WebkitMaskImage: FRONT_MASK,
          pointerEvents: 'none',
          opacity: 0.9,
        }}
      />
    )
  }

  return (
    <img
      src={wrapper.imagePath}
      alt={wrapper.name}
      className={`w-auto object-contain ${className}`}
      style={{ height: `${height}px`, opacity: 0.9 }}
    />
  )
}

/** Full wrapper preview — no layer split. */
export function WrapperRenderFull({
  wrapperId,
  height = 360,
  className = '',
}: Omit<Props, 'layer'>) {
  const wrapper = WRAPPERS_BY_ID[wrapperId]
  if (!wrapper) return null

  return (
    <img
      src={wrapper.imagePath}
      alt={wrapper.name}
      className={`w-auto object-contain ${className}`}
      style={{ height: `${height}px` }}
    />
  )
}
