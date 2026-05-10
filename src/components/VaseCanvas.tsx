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
import { BOUQUET_SCENE_H, BOUQUET_SCENE_W, WRAPPER_H } from '../utils/bouquetSceneSize'
import { WrapperRender } from './WrapperRender'

export const VASE_DROP_ID = 'vase-canvas'

const SCALE_MIN = 0.3
const SCALE_WHEEL_STEP = 0.06

type Props = {
  wrapperId: WrapperId
  bouquet: PlacedFlower[]
  /** Bloom % coords share this DOM rect — same box as droppable hero (hero above shelf). */
  onBloomPlacementRef?: (el: HTMLDivElement | null) => void
  selectedInstanceId?: string | null
  onSelectBloom?: (instanceId: string | null) => void
  onMoveBloom?: (instanceId: string, xPct: number, yPct: number) => void
  onScaleBloom?: (instanceId: string, scale: number) => void
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
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: VASE_DROP_ID })

  const placementSurfaceRef = useRef<HTMLDivElement | null>(null)

  const setHeroSurfaceRef = useCallback(
    (el: HTMLDivElement | null) => {
      placementSurfaceRef.current = el
      setNodeRef(el)
      onBloomPlacementRef?.(el)
    },
    [onBloomPlacementRef, setNodeRef],
  )

  return (
    <div className="flex w-full shrink-0 justify-center px-6 py-8 sm:px-8 sm:py-10">
      <div
        ref={setHeroSurfaceRef}
        role="region"
        aria-label="Bouquet wrapper — drop flowers here"
        className="relative flex flex-col"
        style={{ width: BOUQUET_SCENE_W, height: BOUQUET_SCENE_H }}
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

/** Full-hero overlay: blooms sit between wrapper back and front; only blooms capture pointers. */
function BouquetLayer({
  bouquet,
  placementSurfaceRef,
  selectedInstanceId,
  onSelectBloom,
  onMoveBloom,
  onScaleBloom,
}: {
  bouquet: PlacedFlower[]
  placementSurfaceRef: MutableRefObject<HTMLDivElement | null>
  selectedInstanceId?: string | null
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
        const selected = selectedInstanceId === p.instanceId
        const dragging = draggingInstanceId === p.instanceId

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
              dragging
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
            className={`pointer-events-auto absolute cursor-grab select-none active:cursor-grabbing ${
              selected
                ? 'rounded-full ring-1 ring-ink-400/45 ring-offset-2 ring-offset-transparent'
                : ''
            }`}
            style={{
              left: `${p.xPct}%`,
              top: `${p.yPct}%`,
              marginTop: 2,
              padding: '6px',
              transformOrigin: '50% 50%',
              filter:
                'drop-shadow(0 5px 7px rgba(42,34,27,0.12)) drop-shadow(0 1px 1px rgba(42,34,27,0.08))',
              zIndex: 20 + index,
            }}
          >
            <img
              src={meta.imagePath}
              alt={meta.name}
              className="h-[88px] w-auto object-contain"
              draggable={false}
            />
          </motion.div>
        )
      })}
    </div>
  )
}
