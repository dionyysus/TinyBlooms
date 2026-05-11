import { AnimatePresence, motion } from 'framer-motion'
import { FLOWERS } from '../data/flowers'
import { WRAPPERS } from '../data/wrappers'
import type { ShelfTab, WrapperId } from '../types/bouquet'
import { FlowerCard } from './FlowerCard'
import { WrapperCard } from './WrapperCard'

type Props = {
  tab: ShelfTab
  onTabChange: (tab: ShelfTab) => void
  selectedWrapperId: WrapperId
  onSelectWrapper: (id: WrapperId) => void
}

const TABS: { id: ShelfTab; label: string }[] = [
  { id: 'flowers', label: 'Flowers' },
  { id: 'wrappers', label: 'Wrappers' },
]

/**
 * Single-column studio shelf: tabs → divider → token grid beneath the bouquet hero.
 */
export function ShelfPanel({
  tab,
  onTabChange,
  selectedWrapperId,
  onSelectWrapper,
}: Props) {
  return (
    <div className="flex w-full shrink-0 flex-col border-t border-cream-200/35 bg-transparent">
      <div
        role="tablist"
        aria-label="Shelf categories"
        className="flex shrink-0 justify-center bg-cream-50/92 px-5 pb-4 pt-5 backdrop-blur-[2px] sm:px-7 sm:pb-5 sm:pt-6"
      >
        <div className="flex items-end gap-10 sm:gap-14">
          {TABS.map((t) => {
            const active = t.id === tab
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTabChange(t.id)}
                className={[
                  'relative pb-2.5 text-[11px] font-medium tracking-[0.14em] uppercase transition-colors',
                  active
                    ? 'text-ink-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-ink-900/75'
                    : 'text-ink-500 hover:text-ink-900',
                ].join(' ')}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      <div
        aria-hidden
        className="mx-auto h-px w-[min(420px,calc(100%-2.5rem))] bg-gradient-to-r from-transparent via-cream-200/55 to-transparent"
      />

      <div className="px-5 py-5 sm:px-7 sm:py-7">
        <AnimatePresence mode="wait">
          {tab === 'flowers' ? (
            <motion.div
              key="flowers"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="flex flex-wrap justify-center gap-x-4 gap-y-5 sm:gap-x-6 sm:gap-y-6"
            >
              {FLOWERS.map((flower, i) => (
                <motion.div
                  key={flower.id}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: i * 0.03,
                    type: 'spring',
                    stiffness: 420,
                    damping: 28,
                  }}
                  className="flex justify-center"
                >
                  <FlowerCard
                    flower={flower}
                    fetchPriority={i < 4 ? 'high' : undefined}
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="wrappers"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="flex flex-wrap justify-center gap-x-6 gap-y-6 sm:gap-x-8"
            >
              {WRAPPERS.map((wrapper, i) => (
                <motion.div
                  key={wrapper.id}
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: i * 0.04,
                    type: 'spring',
                    stiffness: 420,
                    damping: 28,
                  }}
                  className="flex justify-center"
                >
                  <WrapperCard
                    wrapper={wrapper}
                    selected={selectedWrapperId === wrapper.id}
                    onSelect={onSelectWrapper}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
