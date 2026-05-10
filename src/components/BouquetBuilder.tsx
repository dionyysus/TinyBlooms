import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  useDndMonitor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { getEventCoordinates } from '@dnd-kit/utilities'
import { AnimatePresence, motion } from 'framer-motion'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { FLOWERS_BY_ID } from '../data/flowers'
import { WRAPPERS } from '../data/wrappers'
import type {
  FlowerId,
  PlacedFlower,
  ShelfTab,
  Step,
  WrapperId,
} from '../types/bouquet'
import { FloatingCTA } from './FloatingCTA'
import { FlowerCard } from './FlowerCard'
import { LETTER_PAPER_PRESETS } from '../data/letterPaperPresets'
import { ShelfPanel } from './ShelfPanel'
import {
  clampPlacementPercent,
  clientToClampedPlacementPercent,
} from '../utils/dropPosition'
import {
  buildShareUrl,
  deserializeShareState,
  getSharePayloadFromLocation,
  serializeShareState,
} from '../utils/shareState'
import { VASE_DROP_ID, VaseCanvas } from './VaseCanvas'

const LetterCard = lazy(async () => {
  const m = await import('./LetterCard')
  return { default: m.LetterCard }
})

const PreviewScene = lazy(async () => {
  const m = await import('./PreviewScene')
  return { default: m.PreviewScene }
})

/** Prevents mobile browsers from scrolling the page while a shelf flower is on the drag overlay. */
function DndMobileScrollLock() {
  const saved = useRef<{
    bodyOverflow: string
    bodyTouchAction: string
    htmlOverscroll: string
  } | null>(null)

  const unlock = () => {
    if (!saved.current) return
    document.body.style.overflow = saved.current.bodyOverflow
    document.body.style.touchAction = saved.current.bodyTouchAction
    document.documentElement.style.overscrollBehaviorY =
      saved.current.htmlOverscroll
    saved.current = null
  }

  useDndMonitor({
    onDragStart() {
      if (!saved.current) {
        saved.current = {
          bodyOverflow: document.body.style.overflow,
          bodyTouchAction: document.body.style.touchAction,
          htmlOverscroll: document.documentElement.style.overscrollBehaviorY,
        }
      }
      document.documentElement.style.overscrollBehaviorY = 'none'
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
    },
    onDragEnd: unlock,
    onDragCancel: unlock,
  })

  return null
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

const BLOOM_SCALE_MIN = 0.3
const BLOOM_ROTATE_STEP = 15

/** Mild variation; scale stays ~1 with slight shrink when the bouquet is crowded. */
function variationFromDrop(existingCount: number): {
  rotation: number
  scale: number
} {
  const rotation = clamp((Math.random() - 0.5) * 8, -5, 5)
  const crowd = Math.min(0.1, existingCount * 0.02)
  const base = 1 - crowd
  const jitter = (Math.random() - 0.5) * 0.1
  const scale = clamp(base + jitter, 0.9, 1.1)
  return { rotation, scale }
}

export function BouquetBuilder() {
  const sharedFromUrl = useMemo(() => {
    if (typeof window === 'undefined') return null
    const raw = getSharePayloadFromLocation()
    return raw ? deserializeShareState(raw) : null
  }, [])

  const [tab, setTab] = useState<ShelfTab>('flowers')
  const [wrapperId, setWrapperId] = useState<WrapperId>(
    () => sharedFromUrl?.wrapperId ?? 'paper',
  )
  const [bouquet, setBouquet] = useState<PlacedFlower[]>(
    () => sharedFromUrl?.bouquet ?? [],
  )
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(
    null,
  )
  const [activeFlowerId, setActiveFlowerId] = useState<FlowerId | null>(null)
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null)
  const bloomPlacementElRef = useRef<HTMLElement | null>(null)
  const previewBouquetCaptureRef = useRef<HTMLDivElement | null>(null)

  const [step, setStep] = useState<Step>(() =>
    sharedFromUrl ? 'preview' : 'studio',
  )
  const [letterText, setLetterText] = useState(
    () => sharedFromUrl?.letterText ?? '',
  )
  const [letterCardColor, setLetterCardColor] = useState<string>(
    () => sharedFromUrl?.letterCardColor ?? LETTER_PAPER_PRESETS[0].color,
  )

  const [isCapturingPreview, setIsCapturingPreview] = useState(false)

  const activeFlower = useMemo(
    () => (activeFlowerId ? FLOWERS_BY_ID[activeFlowerId] : null),
    [activeFlowerId],
  )

  const selectedWrapper = useMemo(
    () => WRAPPERS.find((w) => w.id === wrapperId) ?? WRAPPERS[0],
    [wrapperId],
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 10 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 120,
        tolerance: 8,
      },
    }),
  )

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSelectedInstanceId(null)
        return
      }
      if (e.key === '[' || e.key === ']') {
        setSelectedInstanceId((id) => {
          if (!id) return id
          const dir = e.key === '[' ? -1 : 1
          setBouquet((prev) =>
            prev.map((p) =>
              p.instanceId === id
                ? { ...p, rotation: p.rotation + dir * BLOOM_ROTATE_STEP }
                : p,
            ),
          )
          return id
        })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function handleMoveBloom(instanceId: string, xPct: number, yPct: number) {
    const c = clampPlacementPercent(xPct, yPct)
    setBouquet((prev) =>
      prev.map((p) =>
        p.instanceId === instanceId ? { ...p, xPct: c.xPct, yPct: c.yPct } : p,
      ),
    )
  }

  function handleScaleBloom(instanceId: string, scale: number) {
    const s = Math.max(BLOOM_SCALE_MIN, scale)
    setBouquet((prev) =>
      prev.map((p) => (p.instanceId === instanceId ? { ...p, scale: s } : p)),
    )
  }

  function handleRemoveBloom(instanceId: string) {
    setBouquet((prev) => prev.filter((b) => b.instanceId !== instanceId))
    setSelectedInstanceId((id) => (id === instanceId ? null : id))
  }

  function handleRotateBloom(instanceId: string, rotation: number) {
    setBouquet((prev) =>
      prev.map((p) => (p.instanceId === instanceId ? { ...p, rotation } : p)),
    )
  }

  function handleDragStart(event: DragStartEvent) {
    const flowerId = event.active.data.current?.flowerId as
      | FlowerId
      | undefined
    if (flowerId) setActiveFlowerId(flowerId)
    if (event.activatorEvent) {
      const p = getEventCoordinates(event.activatorEvent)
      if (p) lastPointerRef.current = p
    }
  }

  function handleDragMove(event: DragMoveEvent) {
    const origin = getEventCoordinates(event.activatorEvent)
    if (!origin) return
    lastPointerRef.current = {
      x: origin.x + event.delta.x,
      y: origin.y + event.delta.y,
    }
  }

  function clearDragPointerState() {
    lastPointerRef.current = null
  }

  function handleDragCancel() {
    clearDragPointerState()
    setActiveFlowerId(null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const origin = getEventCoordinates(event.activatorEvent)
    const pointer =
      origin != null
        ? { x: origin.x + event.delta.x, y: origin.y + event.delta.y }
        : lastPointerRef.current
    clearDragPointerState()
    setActiveFlowerId(null)
    const { active, over } = event
    if (over?.id !== VASE_DROP_ID) return
    const flowerId = active.data.current?.flowerId as FlowerId | undefined
    if (!flowerId || !FLOWERS_BY_ID[flowerId]) return

    const placementBox = bloomPlacementElRef.current
    if (!pointer || !placementBox) return

    const { xPct, yPct } = clientToClampedPlacementPercent(
      pointer.x,
      pointer.y,
      placementBox.getBoundingClientRect(),
    )

    setBouquet((prev) => {
      const { rotation, scale } = variationFromDrop(prev.length)
      return [
        ...prev,
        {
          instanceId: crypto.randomUUID(),
          flowerId,
          xPct,
          yPct,
          rotation,
          scale,
        },
      ]
    })
  }

  async function handleDownloadPreviewImage() {
    const node = previewBouquetCaptureRef.current
    if (!node) return
    setIsCapturingPreview(true)
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    /* Let envelope spring open + export frame pulse settle before rasterizing */
    await new Promise((r) => setTimeout(r, 580))
    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(node, {
        pixelRatio: Math.min(2, window.devicePixelRatio || 2),
        cacheBust: true,
      })
      const a = document.createElement('a')
      a.download = 'tiny-blooms.png'
      a.href = dataUrl
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch {
      /* malformed DOM / unsupported: ignore */
    } finally {
      setIsCapturingPreview(false)
    }
  }

  async function handleCopyShareLink() {
    try {
      const payload = serializeShareState({
        wrapperId,
        bouquet,
        letterText,
        letterCardColor,
      })
      const url = buildShareUrl(payload, { embed: true })
      await navigator.clipboard.writeText(url)
    } catch {
      /* clipboard / serialization */
    }
  }

  const crossfade = { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const }

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden overflow-y-auto bg-cream-50 px-6 py-10 text-ink-900 sm:px-10 sm:py-12 md:px-14 md:py-14">
      {/* Subtle ambient warmth so the cream feels lit, never flat */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(56%_42%_at_50%_12%,rgba(243,182,169,0.07),transparent_72%),radial-gradient(48%_40%_at_88%_78%,rgba(184,197,172,0.07),transparent_72%)]"
      />

      <AnimatePresence mode="wait">
        {step === 'studio' && (
          <motion.div
            key="studio"
            className="relative z-10 w-full max-w-[min(792px,100%)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={crossfade}
          >
            <DndContext
              sensors={sensors}
              collisionDetection={pointerWithin}
              autoScroll={false}
              onDragStart={handleDragStart}
              onDragMove={handleDragMove}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <DndMobileScrollLock />
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="grain relative w-full rounded-[var(--radius-card)] border border-cream-200/35 bg-cream-50/92 shadow-soft backdrop-blur-[3px]"
              >
                <div className="border-b border-cream-200/45 px-8 pb-5 pt-7 sm:px-10 sm:pb-6 sm:pt-8">
                  <h1 className="font-serif text-[1.35rem] font-semibold leading-tight tracking-tight text-ink-900 sm:text-[1.5rem]">
                    Tiny Blooms
                  </h1>
                  <p className="mt-2 max-w-md text-[13px] leading-relaxed text-ink-500">
                    Drag blooms onto the wrapper. Tap one to nudge it; × removes
                    it, and the two buttons under the bloom rotate or resize.
                  </p>
                </div>

                <motion.article
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
                  className="relative flex w-full flex-col bg-cream-50/65"
                >
                  <VaseCanvas
                    wrapperId={selectedWrapper.id}
                    bouquet={bouquet}
                    selectedInstanceId={selectedInstanceId}
                    onSelectBloom={setSelectedInstanceId}
                    onMoveBloom={handleMoveBloom}
                    onScaleBloom={handleScaleBloom}
                    onRotateBloom={handleRotateBloom}
                    onRemoveBloom={handleRemoveBloom}
                    onBloomPlacementRef={(el) => {
                      bloomPlacementElRef.current = el
                    }}
                  />

                  <ShelfPanel
                    tab={tab}
                    onTabChange={setTab}
                    selectedWrapperId={selectedWrapper.id}
                    onSelectWrapper={setWrapperId}
                  />

                  <FloatingCTA
                    visible={bouquet.length >= 1}
                    onNext={() => setStep('letter')}
                    position="viewport"
                  />
                </motion.article>
              </motion.div>

              <DragOverlay
                dropAnimation={{
                  duration: 220,
                  easing: 'cubic-bezier(0.22,1,0.36,1)',
                }}
              >
                {activeFlower ? (
                  <FlowerCard flower={activeFlower} preview />
                ) : null}
              </DragOverlay>
            </DndContext>
          </motion.div>
        )}

        {step === 'letter' && (
          <motion.div
            key="letter"
            className="relative z-10 w-full max-w-[min(792px,100%)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={crossfade}
          >
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full rounded-[var(--radius-card)] border border-cream-200/35 bg-cream-50/92 px-8 py-9 shadow-soft backdrop-blur-[3px] sm:px-10 sm:py-11"
            >
              <Suspense fallback={<div className="min-h-[28rem] rounded-md bg-cream-100/40" aria-hidden />}>
                <LetterCard
                  letterText={letterText}
                  onLetterTextChange={setLetterText}
                  onBack={() => setStep('studio')}
                  onDone={() => setStep('preview')}
                  paperColor={letterCardColor}
                  onPaperColorChange={setLetterCardColor}
                />
              </Suspense>
            </motion.div>
          </motion.div>
        )}

        {step === 'preview' && (
          <motion.div
            key="preview"
            className="relative z-10 w-full max-w-[min(792px,100%)]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={crossfade}
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="grain relative w-full rounded-[var(--radius-card)] border border-cream-200/35 bg-cream-50/92 shadow-soft backdrop-blur-[3px]"
            >
              <div className="border-b border-cream-200/45 px-8 pb-5 pt-7 sm:px-10 sm:pb-6 sm:pt-8">
                <h2 className="font-serif text-[1.25rem] font-semibold leading-tight tracking-tight text-ink-900 sm:text-[1.35rem]">
                  All wrapped up
                </h2>
                <p className="mt-2 max-w-md text-[13px] leading-relaxed text-ink-500">
                  Tap the letter card peeking behind your bouquet to read your note.
                </p>
              </div>

              <Suspense fallback={<div className="min-h-[32rem] rounded-md bg-cream-100/40" aria-hidden />}>
                <PreviewScene
                  wrapperId={selectedWrapper.id}
                  bouquet={bouquet}
                  letterText={letterText}
                  letterCardColor={letterCardColor}
                  onEditMessage={() => setStep('letter')}
                  onEditBouquet={() => setStep('studio')}
                  bouquetCaptureRef={previewBouquetCaptureRef}
                  isCapturingPreview={isCapturingPreview}
                  onDownloadImage={() => void handleDownloadPreviewImage()}
                  onCopyShareLink={handleCopyShareLink}
                />
              </Suspense>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
