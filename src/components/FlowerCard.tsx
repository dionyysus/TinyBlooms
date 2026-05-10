import { useDraggable } from '@dnd-kit/core'
import { motion } from 'framer-motion'
import type { Flower } from '../types/bouquet'

type Props = {
  flower: Flower
  /** When true: DragOverlay styling — larger image, no dnd refs. */
  preview?: boolean
}

/** Image draggable token for the shelf rail. */
export function FlowerCard({ flower, preview = false }: Props) {
  const draggable = useDraggable({
    id: `flower-${flower.id}`,
    data: { kind: 'flower', flowerId: flower.id },
    disabled: preview,
  })
  const isDragging = !preview && draggable.isDragging

  return (
    <motion.div
      ref={preview ? undefined : draggable.setNodeRef}
      {...(preview ? {} : draggable.listeners)}
      {...(preview ? {} : draggable.attributes)}
      whileHover={preview ? undefined : { y: -2 }}
      whileTap={preview ? undefined : { scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 460, damping: 28 }}
      role={preview ? undefined : 'button'}
      tabIndex={preview ? undefined : 0}
      aria-label={`${flower.name} flower — drag to bouquet`}
      className={[
        'select-none',
        preview
          ? [
              'flex cursor-grabbing items-center justify-center rounded-2xl p-6',
              'ring-1 ring-cream-200/60',
              'shadow-[0_14px_36px_-12px_rgba(42,34,27,0.2)]',
            ].join(' ')
          : [
              'flex cursor-grab items-center justify-center rounded-full outline-none ring-ink-900/0 transition-[box-shadow,transform]',
              'h-20 w-20 active:cursor-grabbing sm:h-[5.5rem] sm:w-[5.5rem]',
              'hover:shadow-[0_4px_14px_-6px_rgba(42,34,27,0.12)] focus-visible:ring-1 focus-visible:ring-ink-400/40',
              isDragging ? 'opacity-35' : '',
            ].join(' '),
      ].join(' ')}
    >
      <img
        src={flower.imagePath}
        alt={flower.name}
        className={preview ? 'h-20 w-auto object-contain drop-shadow-sm' : 'h-16 w-auto object-contain drop-shadow-sm sm:h-[4.5rem]'}
        draggable={false}
      />
    </motion.div>
  )
}
