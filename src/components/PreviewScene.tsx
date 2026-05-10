import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState, type RefObject } from 'react'
import { FLOWERS_BY_ID } from '../data/flowers'
import type { PlacedFlower, WrapperId } from '../types/bouquet'
import { BOUQUET_SCENE_H, WRAPPER_H } from '../utils/bouquetSceneSize'
import { wrapperDisplayWidthPx } from '../utils/wrapperSvg'
import { Envelope } from './Envelope'
import { TrimmedFlowerImage } from './TrimmedFlowerImage'
import { WrapperRender } from './WrapperRender'

type Props = {
  wrapperId: WrapperId
  bouquet: PlacedFlower[]
  letterText: string
  letterCardColor: string
  onEditMessage: () => void
  onEditBouquet: () => void
  /** Captures soft backdrop + envelope + bouquet as PNG. Omit in viewer/embed mode. */
  bouquetCaptureRef?: RefObject<HTMLDivElement | null>
  /** While true, switches to a download-only side-by-side layout and captures. */
  isCapturingPreview?: boolean
  onDownloadImage: () => void
  onCopyShareLink: () => void | Promise<void>
  /** Viewer share links: hide action row and extra chrome; only bouquet + envelope. */
  embedded?: boolean
}

/** how many px of the envelope peek below the bouquet (stacked preview only) */
const CARD_PEEK = 72

/** Match wrapper art width + room for blooms; keeps download row tight and centered. */
function downloadBouquetColumnWidthPx(): number {
  const w = Math.round(wrapperDisplayWidthPx(WRAPPER_H) + 96)
  return Math.min(360, Math.max(268, w))
}

function BouquetOnlyStack({
  wrapperId,
  bouquet,
  layoutInstant = false,
  prioritizeFlowers = false,
}: {
  wrapperId: WrapperId
  bouquet: PlacedFlower[]
  layoutInstant?: boolean
  /** Shared viewer: fetch key blooms sooner for faster LCP. */
  prioritizeFlowers?: boolean
}) {
  const atRest = { opacity: 1, y: 0, scale: 1 }
  const enter = layoutInstant ? atRest : { opacity: 0, y: 8, scale: 0.97 }
  const exit = layoutInstant ? atRest : { opacity: 0, y: -6, scale: 0.98 }
  const transition = layoutInstant
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 320, damping: 28 }

  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-[2] flex flex-col items-center justify-end">
        <AnimatePresence mode="wait">
          <motion.div
            key={wrapperId}
            initial={enter}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={exit}
            transition={transition}
          >
            <WrapperRender layer="back" wrapperId={wrapperId} height={WRAPPER_H} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="pointer-events-none absolute inset-0 z-[10]">
        {bouquet.map((p, i) => {
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
              <TrimmedFlowerImage
                key={meta.imagePath}
                src={meta.imagePath}
                alt={meta.name}
                displayHeightPx={88}
                fallbackImgClassName="h-[88px] w-auto object-contain"
                fetchPriority={
                  prioritizeFlowers && i < 4 ? 'high' : undefined
                }
              />
            </div>
          )
        })}
      </div>

      <div className="pointer-events-none absolute inset-0 z-[20] flex flex-col items-center justify-end">
        <AnimatePresence mode="wait">
          <motion.div
            key={wrapperId}
            initial={enter}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={exit}
            transition={transition}
          >
            <WrapperRender layer="front" wrapperId={wrapperId} height={WRAPPER_H} />
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  )
}

/**
 * Preview step — stacked layout: envelope peeks under bouquet (interactive).
 * Download: temporary side-by-side artboard (open envelope beside bouquet).
 */
export function PreviewScene({
  wrapperId,
  bouquet,
  letterText,
  letterCardColor,
  onEditMessage,
  onEditBouquet,
  bouquetCaptureRef,
  isCapturingPreview = false,
  onDownloadImage,
  onCopyShareLink,
  embedded = false,
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
    <div
      className={
        embedded
          ? 'flex w-full max-w-[min(792px,100%)] shrink-0 flex-col px-3 py-6 sm:px-4 sm:py-8'
          : 'flex w-full shrink-0 flex-col px-6 py-10 sm:px-8 sm:py-12'
      }
    >
      <motion.div
        ref={bouquetCaptureRef ?? undefined}
        data-preview-bouquet-capture=""
        className="relative mx-auto w-full min-w-0 overflow-hidden rounded-[var(--radius-card)] shadow-[0_20px_50px_-24px_rgba(42,34,27,0.18)]"
        animate={
          isCapturingPreview
            ? {
                boxShadow: [
                  '0 20px 50px -24px rgba(42,34,27,0.18)',
                  '0 24px 60px -20px rgba(42,34,27,0.22), 0 0 0 1px rgba(243,182,169,0.35)',
                  '0 20px 50px -24px rgba(42,34,27,0.18)',
                ],
              }
            : { boxShadow: '0 20px 50px -24px rgba(42,34,27,0.18)' }
        }
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        style={{
          padding: 'clamp(20px, 5vw, 36px) clamp(16px, 4vw, 28px)',
          background:
            'linear-gradient(168deg, #fff9f6 0%, #f8eee6 38%, #eef3ea 72%, #f3e8e2 100%)',
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_72%_48%_at_50%_18%,rgba(255,255,255,0.72),transparent_58%),radial-gradient(ellipse_50%_40%_at_88%_88%,rgba(243,182,169,0.12),transparent_55%),radial-gradient(ellipse_45%_35%_at_12%_75%,rgba(184,197,172,0.14),transparent_50%)]"
        />

        {isCapturingPreview ? (
          /* Download-only: tight centered group — bouquet width tracks wrapper, not full bleed */
          <div className="relative flex w-full justify-center py-2">
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-0 left-1/2 z-0 h-8 w-[min(92%,420px)] max-w-[420px] -translate-x-1/2 translate-y-[35%] rounded-[50%] bg-ink-900 opacity-[0.09] blur-2xl"
            />
            <div className="relative z-[1] mx-auto flex max-w-full flex-row flex-wrap items-end justify-center gap-5 sm:gap-6 md:gap-7">
              <div
                className="relative shrink-0"
                style={{
                  width: downloadBouquetColumnWidthPx(),
                  height: BOUQUET_SCENE_H,
                }}
              >
                <BouquetOnlyStack
                  wrapperId={wrapperId}
                  bouquet={bouquet}
                  layoutInstant
                />
              </div>
              <div className="relative z-[1] flex shrink-0 flex-col items-center justify-end pb-0.5 pt-3 sm:pt-0">
                <div className="pointer-events-none [&_button]:cursor-default">
                  <motion.div
                    initial={false}
                    animate={{ scale: 0.9, rotate: -2 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                    style={{ transformOrigin: 'bottom center' }}
                  >
                    <Envelope
                      letterText={letterText}
                      paperColor={letterCardColor}
                      open
                    />
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Interactive preview: envelope tucked under bouquet */
          <div
            className="relative w-full min-w-0"
            style={{
              height: BOUQUET_SCENE_H + CARD_PEEK,
            }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-0 left-1/2 z-0 h-6 w-[80%] -translate-x-1/2 translate-y-[25%] rounded-[50%] bg-ink-900 opacity-10 blur-2xl"
            />

            <div
              className="absolute"
              style={{
                bottom: 85,
                left: '50%',
                transform: 'translateX(calc(-50% + 25px))',
                zIndex: letterOpen ? 30 : 1,
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

            <div
              className="absolute left-0 right-0 top-0"
              style={{ height: BOUQUET_SCENE_H }}
            >
              <BouquetOnlyStack
                wrapperId={wrapperId}
                bouquet={bouquet}
                prioritizeFlowers={embedded}
              />
            </div>
          </div>
        )}
      </motion.div>

      {embedded ? null : (
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
            disabled={isCapturingPreview}
            onClick={onDownloadImage}
            className="border-0 bg-transparent px-0 py-1 text-[13px] font-medium text-ink-500 underline decoration-cream-300/90 underline-offset-4 transition-colors hover:text-ink-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 disabled:cursor-wait disabled:opacity-60"
          >
            {isCapturingPreview ? 'Saving…' : 'Download image'}
          </button>
          <button
            type="button"
            onClick={() => void onCopyShareLink()}
            className="border-0 bg-transparent px-0 py-1 text-[13px] font-medium text-ink-500 underline decoration-cream-300/90 underline-offset-4 transition-colors hover:text-ink-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
          >
            Copy link
          </button>
        </div>
      )}
    </div>
  )
}
