import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState, type RefObject } from 'react'
import { FLOWERS_BY_ID } from '../data/flowers'
import type { PlacedFlower, WrapperId } from '../types/bouquet'
import { BOUQUET_SCENE_H, BOUQUET_SCENE_W, WRAPPER_H } from '../utils/bouquetSceneSize'
import { Envelope } from './Envelope'
import { WrapperRender } from './WrapperRender'

type Props = {
  wrapperId: WrapperId
  bouquet: PlacedFlower[]
  letterText: string
  letterCardColor: string
  onEditMessage: () => void
  onEditBouquet: () => void
  /** Captures wrapper + blooms (read-only bouquet stack) as PNG via html-to-image. */
  bouquetCaptureRef: RefObject<HTMLDivElement | null>
  onDownloadImage: () => void
  onCopyShareLink: () => void | Promise<void>
}

/** how many px of the envelope peek below the bouquet */
const CARD_PEEK = 72

/**
 * Preview step — the real bouquet (wrapper-back → blooms → wrapper-front) is
 * displayed read-only. Wrapper sits at the bottom (z-[2]); blooms float
 * above it (z-[10]), naturally emerging from the wrap opening. The envelope
 * tucks behind (z-[1]) and flips to z-[30] when clicked.
 */
export function PreviewScene({
  wrapperId,
  bouquet,
  letterText,
  letterCardColor,
  onEditMessage,
  onEditBouquet,
  bouquetCaptureRef,
  onDownloadImage,
  onCopyShareLink,
}: Props) {
  const [letterOpen, setLetterOpen] = useState(false)

  useEffect(() => {
    if (!letterOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLetterOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [letterOpen])

  return (
    <div className="flex w-full shrink-0 flex-col items-center px-6 py-10 sm:px-8 sm:py-12">
      {/*
        Cluster: fixed width anchors all children to % offsets — no vw/vh units.
        Total height = SCENE_HEIGHT (bouquet) + CARD_PEEK (visible card strip).
        z-order: letter card z-[1], wrapper z-[2], blooms z-[10], card-open z-[30].
      */}
      <div
        className="relative"
        style={{
          width: BOUQUET_SCENE_W,
          height: BOUQUET_SCENE_H + CARD_PEEK,
        }}
      >
        {/* Ambient ground shadow */}
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-1/2 z-0 h-6 w-[80%] -translate-x-1/2 translate-y-[25%] rounded-[50%] bg-ink-900 opacity-10 blur-2xl"
        />

        {/*
          Envelope — anchored at the very bottom of the cluster (slightly below),
          so it peeks from behind the bouquet's base/stem only, not the middle.
          Outer div: handles left-centering + z-index jump.
          Inner motion.div: animates scale (closed→0.55, open→0.8) with a spring,
          keeping rotate(3deg) and transformOrigin:'bottom center' stable.
          Click: z-index flips to 30 (above wrapper-front) and flap opens in place.
          Click again: flap closes, then z-index drops back to 1 after ~0.3 s.
          Escape key mirrors the second click via the useEffect above.
        */}
        <div
          className="absolute"
          style={{
            bottom: 85,
            left: '50%',
            transform: 'translateX(calc(-50% + 25px))',
            zIndex: letterOpen ? 30 : 1,
            // Delay z-index drop until after the flap-close animation (~0.3 s).
            transition: letterOpen ? 'z-index 0s' : 'z-index 0s 0.3s',
            cursor: 'pointer',
          }}
          onClick={() => setLetterOpen((prev) => !prev)}
        >
          <motion.div
            style={{ transformOrigin: 'bottom center', rotate: 3 }}
            animate={{ scale: letterOpen ? 0.8 : 0.55 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          >
            <Envelope
              letterText={letterText}
              paperColor={letterCardColor}
              open={letterOpen}
            />
          </motion.div>
        </div>

        {/* Bouquet group — wrapper-back / blooms / wrapper-front, read-only */}
        <div
          ref={bouquetCaptureRef}
          className="absolute left-0 right-0 top-0"
          style={{ height: BOUQUET_SCENE_H }}
          data-preview-bouquet-capture=""
        >
          {/* Wrapper back — z-[2] */}
          <div className="pointer-events-none absolute inset-0 z-[2] flex flex-col items-center justify-end">
            <AnimatePresence mode="wait">
              <motion.div
                key={wrapperId}
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              >
                <WrapperRender layer="back" wrapperId={wrapperId} height={WRAPPER_H} />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Blooms — read-only, z-[10] */}
          <div className="pointer-events-none absolute inset-0 z-[10]">
              {bouquet.map((p) => {
              const meta = FLOWERS_BY_ID[p.flowerId]
              if (!meta) return null
              return (
                <div
                  key={p.instanceId}
                  aria-hidden
                  className="absolute select-none"
                  style={{
                    left: `${p.xPct}%`,
                    top: `${p.yPct}%`,
                    padding: '6px',
                    transform: `translate(-50%, -50%) rotate(${p.rotation}deg) scale(${p.scale})`,
                    transformOrigin: '50% 50%',
                    filter:
                      'drop-shadow(0 5px 7px rgba(42,34,27,0.12)) drop-shadow(0 1px 1px rgba(42,34,27,0.08))',
                  }}
                >
                  <img
                    src={meta.imagePath}
                    alt={meta.name}
                    className="h-[88px] w-auto object-contain"
                    draggable={false}
                  />
                </div>
              )
            })}
          </div>

          {/* Wrapper front — gradient mask sits above blooms, hides stems naturally */}
          <div className="pointer-events-none absolute inset-0 z-[20] flex flex-col items-center justify-end">
            <AnimatePresence mode="wait">
              <motion.div
                key={wrapperId}
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              >
                <WrapperRender layer="front" wrapperId={wrapperId} height={WRAPPER_H} />
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </div>

      {/* Minimal text-link edit controls */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        <button
          type="button"
          onClick={onEditMessage}
          className="border-0 bg-transparent px-0 py-1 text-[13px] font-medium text-ink-500 transition-colors hover:text-ink-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
        >
          Edit message
        </button>
        <button
          type="button"
          onClick={onEditBouquet}
          className="border-0 bg-transparent px-0 py-1 text-[13px] font-medium text-ink-500 transition-colors hover:text-ink-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
        >
          Edit bouquet
        </button>
        <button
          type="button"
          onClick={onDownloadImage}
          className="border-0 bg-transparent px-0 py-1 text-[13px] font-medium text-ink-500 underline decoration-cream-300/90 underline-offset-4 transition-colors hover:text-ink-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
        >
          Download image
        </button>
        <button
          type="button"
          onClick={() => void onCopyShareLink()}
          className="border-0 bg-transparent px-0 py-1 text-[13px] font-medium text-ink-500 underline decoration-cream-300/90 underline-offset-4 transition-colors hover:text-ink-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
        >
          Copy link
        </button>
      </div>
    </div>
  )
}
