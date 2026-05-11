import { useDroppable } from '@dnd-kit/core'
import { AnimatePresence, motion } from 'framer-motion'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { FLOWERS_BY_ID } from '../data/flowers'
import type { PlacedFlower, WrapperId } from '../types/bouquet'
import { clampPlacementPercent } from '../utils/dropPosition'
import { BOUQUET_SCENE_H, WRAPPER_H } from '../utils/bouquetSceneSize'
import { TrimmedFlowerImage } from './TrimmedFlowerImage'
import { WrapperRender } from './WrapperRender'

export const VASE_DROP_ID = 'vase-canvas'

const SCALE_MIN = 0.3
const SCALE_WHEEL_STEP = 0.06

type Props = {
  wrapperId: WrapperId
  bouquet: PlacedFlower[]
  /** Bloom % coords and DnD placement use the same full-width hero rect. */
  onBloomPlacementRef?: (el: HTMLDivElement | null) => void
  selectedInstanceId?: string | null
  onSelectBloom?: (instanceId: string | null) => void
  onMoveBloom?: (instanceId: string, xPct: number, yPct: number) => void
  onScaleBloom?: (instanceId: string, scale: number) => void
  onRotateBloom?: (instanceId: string, rotation: number) => void
  onRemoveBloom?: (instanceId: string) => void
}

/**
 * Studio hero — bouquet wrapper sits on the cream page background behind placed blooms.
 * Hover state stays light: subtle scale + ground shadow swell.
 */
export function VaseCanvas({
  wrapperId,
  bouquet,
  onBloomPlacementRef,
  selectedInstanceId = null,
  onSelectBloom,
  onMoveBloom,
  onScaleBloom,
  onRotateBloom,
  onRemoveBloom,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: VASE_DROP_ID })

  const placementSurfaceRef = useRef<HTMLDivElement | null>(null)
  const bloomContentRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [transformDraggingId, setTransformDraggingId] = useState<string | null>(
    null,
  )

  const setHeroRef = useCallback(
    (el: HTMLDivElement | null) => {
      setNodeRef(el)
      placementSurfaceRef.current = el
      onBloomPlacementRef?.(el)
    },
    [setNodeRef, onBloomPlacementRef],
  )

  return (
    <div className="flex w-full shrink-0 justify-center px-6 py-8 sm:px-8 sm:py-10">
      <div
        ref={setHeroRef}
        role="region"
        aria-label="Bouquet wrapper — drop flowers here"
        className="relative w-full min-w-0 overflow-visible"
        style={{ height: BOUQUET_SCENE_H }}
      >
      <motion.span
        aria-hidden
        animate={{
          opacity: isOver ? 0.16 : 0.1,
          scaleX: isOver ? 1.12 : 1,
        }}
        transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        className="pointer-events-none absolute bottom-0 left-1/2 z-0 h-7 min-w-[200px] max-w-[340px] w-[92%] -translate-x-1/2 translate-y-[30%] rounded-[50%] bg-ink-900 blur-2xl sm:w-[324px]"
      />

      {/* Clicks empty of blooms pass through bouquet layer → deselect */}
      <div
        aria-hidden
        className="absolute inset-0 z-[9] cursor-default"
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) {
            onSelectBloom?.(null)
          }
        }}
      />

      {/* Wrapper back — sits behind blooms */}
      <motion.div
        animate={{ scale: isOver ? 1.025 : 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        className="pointer-events-none absolute inset-0 z-[1] flex flex-col items-center justify-end"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={wrapperId}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            <WrapperRender
              layer="back"
              wrapperId={wrapperId}
              height={WRAPPER_H}
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <BouquetLayer
        bouquet={bouquet}
        placementSurfaceRef={placementSurfaceRef}
        bloomContentRefs={bloomContentRefs}
        selectedInstanceId={selectedInstanceId}
        transformDraggingId={transformDraggingId}
        onSelectBloom={onSelectBloom}
        onMoveBloom={onMoveBloom}
        onScaleBloom={onScaleBloom}
      />

      {/* Wrapper front — gradient mask sits above blooms, hides stems naturally */}
      <motion.div
        animate={{ scale: isOver ? 1.025 : 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        className="pointer-events-none absolute inset-0 z-[20] flex flex-col items-center justify-end"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={wrapperId}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            <WrapperRender
              layer="front"
              wrapperId={wrapperId}
              height={WRAPPER_H}
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <BloomSelectionOverlay
        heroRef={placementSurfaceRef}
        bouquet={bouquet}
        selectedInstanceId={selectedInstanceId}
        bloomContentRefs={bloomContentRefs}
        onScaleBloom={onScaleBloom}
        onRotateBloom={onRotateBloom}
        onRemoveBloom={onRemoveBloom}
        onTransformDraggingChange={(active) =>
          setTransformDraggingId(active ? selectedInstanceId ?? null : null)
        }
      />
      </div>
    </div>
  )
}

type DragSession = {
  pointerId: number
  instanceId: string
  startClientX: number
  startClientY: number
  originXPct: number
  originYPct: number
}

type ScaleCornerSession = {
  pointerId: number
  startDist: number
  startScale: number
}

type RotateHandleSession = {
  pointerId: number
  lastAngle: number
  rotation: number
}

function distance(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by)
}

function centerFromEl(el: HTMLDivElement) {
  const r = el.getBoundingClientRect()
  return {
    cx: r.left + r.width / 2,
    cy: r.top + r.height / 2,
  }
}

/** Hairline inset frame, × above to remove, small icon-only rotate / scale below (no fills). */
function BloomTransformHandles({
  instanceId,
  scale,
  rotation,
  getContainerEl,
  onScaleChange,
  onRotateChange,
  onRemove,
  onTransformActiveChange,
  flowerLabel,
}: {
  instanceId: string
  scale: number
  rotation: number
  getContainerEl: () => HTMLDivElement | null
  onScaleChange: (instanceId: string, scale: number) => void
  onRotateChange: (instanceId: string, rotationDeg: number) => void
  onRemove: (instanceId: string) => void
  onTransformActiveChange?: (active: boolean) => void
  flowerLabel: string
}) {
  const scaleSessionRef = useRef<ScaleCornerSession | null>(null)
  const rotateSessionRef = useRef<RotateHandleSession | null>(null)

  const endScale = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const s = scaleSessionRef.current
      if (!s || e.pointerId !== s.pointerId) return
      scaleSessionRef.current = null
      onTransformActiveChange?.(false)
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* already released */
      }
    },
    [onTransformActiveChange],
  )

  const endRotate = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const s = rotateSessionRef.current
      if (!s || e.pointerId !== s.pointerId) return
      rotateSessionRef.current = null
      onTransformActiveChange?.(false)
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* already released */
      }
    },
    [onTransformActiveChange],
  )

  const clearScaleSessionIfPointer = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const s = scaleSessionRef.current
      if (s && e.pointerId === s.pointerId) {
        scaleSessionRef.current = null
        onTransformActiveChange?.(false)
      }
    },
    [onTransformActiveChange],
  )

  const clearRotateSessionIfPointer = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const s = rotateSessionRef.current
      if (s && e.pointerId === s.pointerId) {
        rotateSessionRef.current = null
        onTransformActiveChange?.(false)
      }
    },
    [onTransformActiveChange],
  )

  const onCornerPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()
      const el = getContainerEl()
      if (!el) return
      const { cx, cy } = centerFromEl(el)
      const startDist = distance(e.clientX, e.clientY, cx, cy)
      if (startDist < 1e-6) return
      scaleSessionRef.current = {
        pointerId: e.pointerId,
        startDist,
        startScale: scale,
      }
      onTransformActiveChange?.(true)
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [getContainerEl, scale, onTransformActiveChange],
  )

  const onCornerPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const s = scaleSessionRef.current
      if (!s || e.pointerId !== s.pointerId) return
      const el = getContainerEl()
      if (!el) return
      const { cx, cy } = centerFromEl(el)
      const dist = distance(e.clientX, e.clientY, cx, cy)
      const ratio = dist / Math.max(s.startDist, 1e-6)
      const next = Math.max(SCALE_MIN, s.startScale * ratio)
      onScaleChange(instanceId, next)
    },
    [getContainerEl, instanceId, onScaleChange],
  )

  const onRotatePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()
      const el = getContainerEl()
      if (!el) return
      const { cx, cy } = centerFromEl(el)
      const lastAngle = Math.atan2(e.clientY - cy, e.clientX - cx)
      rotateSessionRef.current = {
        pointerId: e.pointerId,
        lastAngle,
        rotation,
      }
      onTransformActiveChange?.(true)
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [getContainerEl, rotation, onTransformActiveChange],
  )

  const onRotatePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const s = rotateSessionRef.current
      if (!s || e.pointerId !== s.pointerId) return
      const el = getContainerEl()
      if (!el) return
      const { cx, cy } = centerFromEl(el)
      const angle = Math.atan2(e.clientY - cy, e.clientX - cx)
      let delta = angle - s.lastAngle
      if (delta > Math.PI) delta -= 2 * Math.PI
      if (delta < -Math.PI) delta += 2 * Math.PI
      s.lastAngle = angle
      s.rotation += (delta * 180) / Math.PI
      onRotateChange(instanceId, s.rotation)
    },
    [getContainerEl, instanceId, onRotateChange],
  )

  const onRemovePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.stopPropagation()
    },
    [],
  )

  const onRemoveClick = useCallback(
    (e: ReactMouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      onRemove(instanceId)
    },
    [instanceId, onRemove],
  )

  /** Bottom tool pair: icon-only, no fill — small tap targets. */
  const toolBtn =
    'pointer-events-auto flex h-6 w-6 shrink-0 touch-none select-none items-center justify-center rounded-full border-0 bg-transparent text-ink-600 opacity-[0.72] transition-[opacity,transform] hover:opacity-100 active:scale-[0.92]'

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] rounded-md shadow-[inset_0_0_0_1px_rgba(42,34,27,0.13)]"
      />

      <button
        type="button"
        aria-label={`Remove ${flowerLabel} from bouquet`}
        className="pointer-events-auto absolute left-1/2 top-0 z-[2] flex h-6 min-w-[1.5rem] -translate-x-1/2 -translate-y-full touch-none select-none items-center justify-center cursor-default text-[1.05rem] font-extralight leading-none text-ink-400 transition-colors hover:text-ink-700"
        onPointerDown={onRemovePointerDown}
        onClick={onRemoveClick}
      >
        ×
      </button>

      <div
        className="pointer-events-auto absolute bottom-0 left-1/2 z-[2] flex -translate-x-1/2 translate-y-[calc(100%+8px)] gap-1.5"
      >
        <div
          role="slider"
          aria-label={`Rotate ${flowerLabel}`}
          aria-valuenow={Math.round(rotation)}
          className={`${toolBtn} cursor-grab active:cursor-grabbing`}
          title="Drag to rotate"
          onPointerDown={onRotatePointerDown}
          onPointerMove={onRotatePointerMove}
          onPointerUp={endRotate}
          onPointerCancel={endRotate}
          onLostPointerCapture={clearRotateSessionIfPointer}
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-current"
            aria-hidden
          >
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v5h-5" />
          </svg>
        </div>
        <div
          role="slider"
          aria-label={`Scale ${flowerLabel}`}
          aria-valuemin={30}
          aria-valuenow={Math.round(scale * 100)}
          className={`${toolBtn} cursor-nwse-resize`}
          title="Drag toward or away from the bloom to resize"
          onPointerDown={onCornerPointerDown}
          onPointerMove={onCornerPointerMove}
          onPointerUp={endScale}
          onPointerCancel={endScale}
          onLostPointerCapture={clearScaleSessionIfPointer}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-current"
            />
          </svg>
        </div>
      </div>
    </>
  )
}

/** Selection UI above wrapper front so handles stay visible over the paper mask. */
function BloomSelectionOverlay({
  heroRef,
  bouquet,
  selectedInstanceId,
  bloomContentRefs,
  onScaleBloom,
  onRotateBloom,
  onRemoveBloom,
  onTransformDraggingChange,
}: {
  heroRef: MutableRefObject<HTMLDivElement | null>
  bouquet: PlacedFlower[]
  selectedInstanceId?: string | null
  bloomContentRefs: MutableRefObject<Map<string, HTMLDivElement>>
  onScaleBloom?: (instanceId: string, scale: number) => void
  onRotateBloom?: (instanceId: string, rotation: number) => void
  onRemoveBloom?: (instanceId: string) => void
  onTransformDraggingChange: (active: boolean) => void
}) {
  const [box, setBox] = useState<{
    left: number
    top: number
    width: number
    height: number
  } | null>(null)

  const placed = selectedInstanceId
    ? bouquet.find((b) => b.instanceId === selectedInstanceId)
    : undefined
  const meta = placed ? FLOWERS_BY_ID[placed.flowerId] : undefined

  const measure = useCallback(() => {
    const hero = heroRef.current
    if (!hero || !selectedInstanceId) {
      setBox(null)
      return
    }
    const inner = bloomContentRefs.current.get(selectedInstanceId)
    if (!inner) {
      setBox(null)
      return
    }
    const hr = hero.getBoundingClientRect()
    const r = inner.getBoundingClientRect()
    setBox({
      left: r.left - hr.left,
      top: r.top - hr.top,
      width: r.width,
      height: r.height,
    })
  }, [heroRef, selectedInstanceId, bloomContentRefs])

  useLayoutEffect(() => {
    let ro: ResizeObserver | null = null
    let raf = 0

    const tick = () => {
      measure()
    }

    raf = requestAnimationFrame(() => {
      tick()
      if (!selectedInstanceId) return
      const inner = bloomContentRefs.current.get(selectedInstanceId)
      if (!inner) {
        requestAnimationFrame(tick)
        return
      }
      ro = new ResizeObserver(() => tick())
      ro.observe(inner)
    })
    window.addEventListener('resize', tick)
    return () => {
      cancelAnimationFrame(raf)
      ro?.disconnect()
      window.removeEventListener('resize', tick)
    }
  }, [measure, selectedInstanceId, bouquet, bloomContentRefs])

  if (
    !selectedInstanceId ||
    !placed ||
    !meta ||
    !box ||
    !onScaleBloom ||
    !onRotateBloom ||
    !onRemoveBloom
  ) {
    return null
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[24] overflow-visible"
      aria-hidden={false}
    >
      <div
        className="pointer-events-none absolute"
        style={{
          left: box.left,
          top: box.top,
          width: box.width,
          height: box.height,
        }}
      >
        <BloomTransformHandles
          instanceId={placed.instanceId}
          scale={placed.scale}
          rotation={placed.rotation}
          getContainerEl={() =>
            bloomContentRefs.current.get(placed.instanceId) ?? null
          }
          onScaleChange={onScaleBloom}
          onRotateChange={onRotateBloom}
          onRemove={onRemoveBloom}
          onTransformActiveChange={onTransformDraggingChange}
          flowerLabel={meta.name}
        />
      </div>
    </div>
  )
}

/** Full-hero overlay: blooms sit between wrapper back and front; only blooms capture pointers. */
function BouquetLayer({
  bouquet,
  placementSurfaceRef,
  bloomContentRefs,
  selectedInstanceId,
  transformDraggingId,
  onSelectBloom,
  onMoveBloom,
  onScaleBloom,
}: {
  bouquet: PlacedFlower[]
  placementSurfaceRef: MutableRefObject<HTMLDivElement | null>
  bloomContentRefs: MutableRefObject<Map<string, HTMLDivElement>>
  selectedInstanceId?: string | null
  transformDraggingId: string | null
  onSelectBloom?: (instanceId: string | null) => void
  onMoveBloom?: (instanceId: string, xPct: number, yPct: number) => void
  onScaleBloom?: (instanceId: string, scale: number) => void
}) {
  const dragSessionRef = useRef<DragSession | null>(null)
  const [draggingInstanceId, setDraggingInstanceId] = useState<string | null>(
    null,
  )

  useEffect(() => {
    function clearDrag() {
      dragSessionRef.current = null
      setDraggingInstanceId(null)
    }
    window.addEventListener('blur', clearDrag)
    return () => window.removeEventListener('blur', clearDrag)
  }, [])

  function handleBloomPointerDown(
    e: ReactPointerEvent<HTMLDivElement>,
    p: PlacedFlower,
  ) {
    if (e.button !== 0) return
    e.stopPropagation()
    if (e.pointerType === 'touch') {
      e.preventDefault()
    }
    onSelectBloom?.(p.instanceId)
    dragSessionRef.current = {
      pointerId: e.pointerId,
      instanceId: p.instanceId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      originXPct: p.xPct,
      originYPct: p.yPct,
    }
    setDraggingInstanceId(p.instanceId)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handleBloomPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const session = dragSessionRef.current
    if (!session || e.pointerId !== session.pointerId) {
      return
    }
    const rect = placementSurfaceRef.current?.getBoundingClientRect()
    if (!rect || !onMoveBloom) return

    const dxPct =
      ((e.clientX - session.startClientX) / Math.max(rect.width, 1)) * 100
    const dyPct =
      ((e.clientY - session.startClientY) / Math.max(rect.height, 1)) * 100

    const { xPct, yPct } = clampPlacementPercent(
      session.originXPct + dxPct,
      session.originYPct + dyPct,
    )
    onMoveBloom(session.instanceId, xPct, yPct)
  }

  function endBloomDrag(e: ReactPointerEvent<HTMLDivElement>) {
    const session = dragSessionRef.current
    if (session && e.pointerId === session.pointerId) {
      dragSessionRef.current = null
      setDraggingInstanceId(null)
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* already released */
      }
    }
  }

  function handleBloomWheel(e: ReactWheelEvent<HTMLDivElement>, p: PlacedFlower) {
    if (!e.shiftKey || selectedInstanceId !== p.instanceId || !onScaleBloom) return
    e.preventDefault()
    const dir = e.deltaY > 0 ? -1 : 1
    const next = Math.max(SCALE_MIN, p.scale + dir * SCALE_WHEEL_STEP)
    onScaleBloom(p.instanceId, next)
  }

  return (
    <div
      data-bloom-placement-layer
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10"
    >
      {bouquet.map((p, index) => {
        const meta = FLOWERS_BY_ID[p.flowerId]
        if (!meta) return null
        const dragging = draggingInstanceId === p.instanceId
        const isSelected = selectedInstanceId === p.instanceId

        const baseDropShadow =
          'drop-shadow(0 5px 7px rgba(42,34,27,0.12)) drop-shadow(0 1px 1px rgba(42,34,27,0.08))'
        const selectionGlow =
          'drop-shadow(0 0 6px rgba(42,34,27,0.06))'

        return (
          <motion.div
            key={p.instanceId}
            data-placed-bloom
            role="button"
            tabIndex={-1}
            aria-label={`Position ${meta.name} in bouquet`}
            initial={{
              x: '-50%',
              y: '-50%',
              scale: 0.5,
              rotate: p.rotation * 0.4,
              opacity: 0,
            }}
            animate={{
              x: '-50%',
              y: '-50%',
              scale: p.scale,
              rotate: p.rotation,
              opacity: 1,
            }}
            transition={
              dragging || transformDraggingId === p.instanceId
                ? { duration: 0 }
                : {
                    type: 'spring',
                    stiffness: 360,
                    damping: 14,
                    mass: 0.7,
                  }
            }
            onPointerDown={(e) => handleBloomPointerDown(e, p)}
            onPointerMove={handleBloomPointerMove}
            onPointerUp={endBloomDrag}
            onPointerCancel={endBloomDrag}
            onLostPointerCapture={() => {
              dragSessionRef.current = null
              setDraggingInstanceId(null)
            }}
            onWheel={(e) => handleBloomWheel(e, p)}
            className="pointer-events-auto absolute inline-flex max-w-fit touch-none cursor-grab select-none items-center justify-center rounded-sm active:cursor-grabbing outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/30"
            style={{
              left: `${p.xPct}%`,
              top: `${p.yPct}%`,
              marginTop: 2,
              padding: '2px',
              transformOrigin: '50% 50%',
              filter: isSelected ? `${baseDropShadow} ${selectionGlow}` : baseDropShadow,
              zIndex: 20 + index,
            }}
          >
            <motion.div
              ref={(el) => {
                if (el) bloomContentRefs.current.set(p.instanceId, el)
                else bloomContentRefs.current.delete(p.instanceId)
              }}
              className="relative inline-flex items-center justify-center rounded-sm"
              style={{ transformOrigin: '50% 50%' }}
              animate={{ scale: isSelected ? 1.02 : 1 }}
              transition={
                dragging || transformDraggingId === p.instanceId
                  ? { duration: 0 }
                  : {
                      type: 'spring',
                      stiffness: 420,
                      damping: 26,
                    }
              }
            >
              <TrimmedFlowerImage
                key={p.instanceId}
                src={meta.imagePath}
                alt={meta.name}
                displayHeightPx={88}
                fallbackImgClassName="relative z-0 h-[88px] w-auto object-contain"
                wrapperClassName="rounded-sm relative z-0"
              />
            </motion.div>
          </motion.div>
        )
      })}
    </div>
  )
}
