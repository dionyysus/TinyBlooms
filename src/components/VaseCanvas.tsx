import { useDroppable } from '@dnd-kit/core'
import { AnimatePresence, motion } from 'framer-motion'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
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
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: VASE_DROP_ID })

  const placementSurfaceRef = useRef<HTMLDivElement | null>(null)

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
        className="relative w-full min-w-0"
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
        selectedInstanceId={selectedInstanceId}
        onSelectBloom={onSelectBloom}
        onMoveBloom={onMoveBloom}
        onScaleBloom={onScaleBloom}
        onRotateBloom={onRotateBloom}
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

/** Dotted frame + corner scale + rotation handle for the selected bloom (pointer-driven, no deps). */
function BloomTransformHandles({
  instanceId,
  scale,
  rotation,
  getContainerEl,
  onScaleChange,
  onRotateChange,
  onTransformActiveChange,
  flowerLabel,
}: {
  instanceId: string
  scale: number
  rotation: number
  getContainerEl: () => HTMLDivElement | null
  onScaleChange: (instanceId: string, scale: number) => void
  onRotateChange: (instanceId: string, rotationDeg: number) => void
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

  const handleCls =
    'pointer-events-auto touch-none select-none rounded-full border border-ink-900/30 bg-cream-50 shadow-soft h-3 w-3'
  const rotateCls =
    'pointer-events-auto touch-none select-none h-4 w-4 rounded-full border border-amber-400/55 bg-amber-200/90 shadow-soft'

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] rounded-sm border border-dashed border-ink-900/25"
      />
      {/* Corners — uniform scale via distance ratio from bloom center */}
      <div
        role="slider"
        aria-label={`Scale ${flowerLabel}`}
        aria-valuemin={30}
        aria-valuenow={Math.round(scale * 100)}
        className={`${handleCls} absolute left-0 top-0 z-[2] -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize`}
        onPointerDown={onCornerPointerDown}
        onPointerMove={onCornerPointerMove}
        onPointerUp={endScale}
        onPointerCancel={endScale}
        onLostPointerCapture={clearScaleSessionIfPointer}
      />
      <div
        aria-hidden
        className={`${handleCls} absolute right-0 top-0 z-[2] translate-x-1/2 -translate-y-1/2 cursor-nesw-resize`}
        onPointerDown={onCornerPointerDown}
        onPointerMove={onCornerPointerMove}
        onPointerUp={endScale}
        onPointerCancel={endScale}
        onLostPointerCapture={clearScaleSessionIfPointer}
      />
      <div
        aria-hidden
        className={`${handleCls} absolute bottom-0 left-0 z-[2] -translate-x-1/2 translate-y-1/2 cursor-nesw-resize`}
        onPointerDown={onCornerPointerDown}
        onPointerMove={onCornerPointerMove}
        onPointerUp={endScale}
        onPointerCancel={endScale}
        onLostPointerCapture={clearScaleSessionIfPointer}
      />
      <div
        aria-hidden
        className={`${handleCls} absolute bottom-0 right-0 z-[2] translate-x-1/2 translate-y-1/2 cursor-nwse-resize`}
        onPointerDown={onCornerPointerDown}
        onPointerMove={onCornerPointerMove}
        onPointerUp={endScale}
        onPointerCancel={endScale}
        onLostPointerCapture={clearScaleSessionIfPointer}
      />
      {/* Rotation — incremental atan2 delta */}
      <div
        role="slider"
        aria-label={`Rotate ${flowerLabel}`}
        aria-valuenow={Math.round(rotation)}
        className={`${rotateCls} absolute left-1/2 top-0 z-[2] -translate-x-1/2 -translate-y-[calc(100%+10px)] cursor-grab active:cursor-grabbing`}
        onPointerDown={onRotatePointerDown}
        onPointerMove={onRotatePointerMove}
        onPointerUp={endRotate}
        onPointerCancel={endRotate}
        onLostPointerCapture={clearRotateSessionIfPointer}
      />
    </>
  )
}

/** Full-hero overlay: blooms sit between wrapper back and front; only blooms capture pointers. */
function BouquetLayer({
  bouquet,
  placementSurfaceRef,
  selectedInstanceId,
  onSelectBloom,
  onMoveBloom,
  onScaleBloom,
  onRotateBloom,
}: {
  bouquet: PlacedFlower[]
  placementSurfaceRef: MutableRefObject<HTMLDivElement | null>
  selectedInstanceId?: string | null
  onSelectBloom?: (instanceId: string | null) => void
  onMoveBloom?: (instanceId: string, xPct: number, yPct: number) => void
  onScaleBloom?: (instanceId: string, scale: number) => void
  onRotateBloom?: (instanceId: string, rotation: number) => void
}) {
  const dragSessionRef = useRef<DragSession | null>(null)
  const [draggingInstanceId, setDraggingInstanceId] = useState<string | null>(
    null,
  )
  const [transformDraggingId, setTransformDraggingId] = useState<string | null>(
    null,
  )
  const bloomContentRefs = useRef<Map<string, HTMLDivElement>>(new Map())

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
          'drop-shadow(0 0 12px rgba(212, 165, 116, 0.4))'

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
              animate={{ scale: isSelected ? 1.05 : 1 }}
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
              {isSelected && onScaleBloom && onRotateBloom ? (
                <BloomTransformHandles
                  instanceId={p.instanceId}
                  scale={p.scale}
                  rotation={p.rotation}
                  getContainerEl={() =>
                    bloomContentRefs.current.get(p.instanceId) ?? null
                  }
                  onScaleChange={onScaleBloom}
                  onRotateChange={onRotateBloom}
                  onTransformActiveChange={(active) =>
                    setTransformDraggingId(active ? p.instanceId : null)
                  }
                  flowerLabel={meta.name}
                />
              ) : null}
              <TrimmedFlowerImage
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
