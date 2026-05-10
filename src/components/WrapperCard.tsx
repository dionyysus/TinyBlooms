import { motion } from 'framer-motion'
import type { Wrapper } from '../types/bouquet'

type Props = {
  wrapper: Wrapper
  selected: boolean
  onSelect: (id: Wrapper['id']) => void
}

/** Compact wrapper picker — small preview + soft ring when selected. */
export function WrapperCard({ wrapper, selected, onSelect }: Props) {
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(wrapper.id)}
      aria-label={wrapper.name}
      aria-pressed={selected}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 460, damping: 28 }}
      className={[
        'flex h-20 w-20 shrink-0 items-end justify-center rounded-xl p-1.5 outline-none sm:h-[88px] sm:w-[88px]',
        'border border-transparent transition-[box-shadow,transform,border-color]',
        selected
          ? 'border-cream-200/80 shadow-[0_6px_18px_-10px_rgba(42,34,27,0.12)] ring-1 ring-ink-300/35'
          : 'hover:border-cream-200/55 hover:shadow-[0_4px_14px_-8px_rgba(42,34,27,0.08)] focus-visible:ring-1 focus-visible:ring-ink-400/35',
      ].join(' ')}
    >
      <span aria-hidden className="-mb-px flex items-end justify-center">
        <img
          src={wrapper.imagePath}
          alt=""
          draggable={false}
          className="h-16 w-auto object-contain"
        />
      </span>
    </motion.button>
  )
}
