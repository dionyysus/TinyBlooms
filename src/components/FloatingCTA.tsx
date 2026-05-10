import { AnimatePresence, motion } from 'framer-motion'

type Props = {
  visible: boolean
  onNext?: () => void
  /** `inset`: bottom-right inside nearest `relative` parent (e.g. hero). `viewport`: fixed to window. */
  position?: 'viewport' | 'inset'
}

export function FloatingCTA({ visible, onNext, position = 'viewport' }: Props) {
  const positionClasses =
    position === 'inset'
      ? 'absolute bottom-4 right-4 z-30 sm:bottom-5 sm:right-5'
      : 'fixed bottom-7 right-7 z-50 md:bottom-9 md:right-9'

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="next-cta"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className={['pointer-events-none', positionClasses].join(' ')}
        >
          <button
            type="button"
            onClick={onNext}
            className="group pointer-events-auto inline-flex items-center gap-3 border-0 bg-transparent px-0 py-1 text-[13px] font-medium text-ink-500 transition-colors hover:text-ink-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
          >
            <span className="tracking-wide">Continue</span>
            <span
              aria-hidden
              className="h-3 w-px shrink-0 bg-cream-300/70"
            />
            <span aria-hidden className="text-ink-500 transition-colors group-hover:text-ink-900">
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
                <path
                  d="M5 4 L11 8 L5 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
