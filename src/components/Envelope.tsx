import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

const ENV_W = 280
const ENV_H = 188
const FLAP_H = 96
const POCKET_TOP = 84
const POCKET_H = ENV_H - POCKET_TOP
const LETTER_W = 252
const LETTER_H = ENV_H
const LETTER_OPEN_Y = -78
const CONTAINER_H = ENV_H + Math.abs(LETTER_OPEN_Y)

const SHELL = '#efe8d8'
const SHELL_EDGE = '#d8cdb4'
const FLAP_LIGHT = '#f4ecd9'

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const n = hex.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]{6}$/.test(n)) return null
  return {
    r: Number.parseInt(n.slice(0, 2), 16),
    g: Number.parseInt(n.slice(2, 4), 16),
    b: Number.parseInt(n.slice(4, 6), 16),
  }
}

/** Mirrors LetterCard ruled lines so the inner paper visually matches the user's note. */
function ruledLineStops(bg: string): { line: string; opacity: number } {
  const rgb = hexToRgb(bg)
  if (!rgb) return { line: '122, 110, 96', opacity: 0.055 }
  const lum = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255
  if (lum < 0.42) return { line: '255, 255, 255', opacity: 0.09 }
  const boost = lum < 0.7 ? 0 : Math.min(0.05, (lum - 0.7) * 0.2)
  return { line: '122, 110, 96', opacity: 0.055 + boost }
}

type Props = {
  letterText: string
  paperColor: string
  /** When provided the envelope is fully controlled by the parent. */
  open?: boolean
  className?: string
}

/**
 * Closed/open envelope with a "flip flop" flap and a letter that slides up
 * out of the body. Used in the preview step on top of the wrapped bouquet.
 *
 * Pass `open` to put the component in controlled mode — the parent drives all
 * open/close transitions and click handling.
 */
export function Envelope({ letterText, paperColor, open: openProp, className = '' }: Props) {
  const [openState, setOpenState] = useState(false)
  // In controlled mode (openProp provided) the parent drives open/close state.
  const isOpen = openProp ?? openState
  const { line, opacity } = ruledLineStops(paperColor)

  // Escape key only applies in uncontrolled mode; parent handles it otherwise.
  useEffect(() => {
    if (openProp !== undefined) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenState(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openProp])

  const flapTop = CONTAINER_H - ENV_H

  return (
    <button
      type="button"
      onClick={openProp !== undefined ? undefined : () => setOpenState((o) => !o)}
      aria-expanded={isOpen}
      aria-label={isOpen ? 'Close card' : 'Open card'}
      className={[
        'group perspective-1000 relative block cursor-pointer border-0 bg-transparent p-0 text-left',
        'focus-visible:outline-none',
        className,
      ].join(' ')}
      style={{ width: ENV_W, height: CONTAINER_H }}
    >
      {/* Soft ground shadow under envelope */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 z-0 h-5 w-[78%] -translate-x-1/2 rounded-[50%] bg-ink-900/30 blur-xl"
        style={{ bottom: -8 }}
      />

      {/* Back panel — gives the envelope its silhouette */}
      <span
        aria-hidden
        className="absolute left-0 right-0 z-[1] rounded-[6px]"
        style={{
          height: ENV_H,
          bottom: 0,
          backgroundColor: SHELL,
          border: `1px solid ${SHELL_EDGE}`,
          boxShadow:
            '0 10px 26px -14px rgba(42,34,27,0.32), 0 2px 4px -2px rgba(42,34,27,0.14)',
        }}
      />

      {/* Letter — slides up out of the body. Sits behind the front pocket so
          the bottom appears tucked in; the top portion emerges above the
          envelope mouth where the flap used to be. */}
      <motion.span
        aria-hidden
        initial={false}
        animate={{ y: isOpen ? LETTER_OPEN_Y : 0 }}
        transition={{
          type: 'spring',
          stiffness: 220,
          damping: 26,
          delay: isOpen ? 0.18 : 0,
        }}
        className="absolute z-[2] overflow-hidden rounded-[3px]"
        style={{
          width: LETTER_W,
          height: LETTER_H,
          left: (ENV_W - LETTER_W) / 2,
          bottom: 0,
          backgroundColor: paperColor,
          backgroundImage: `repeating-linear-gradient(
            transparent,
            transparent 18px,
            rgba(${line}, ${opacity}) 18px,
            rgba(${line}, ${opacity}) 19px
          )`,
          backgroundPosition: '0 14px',
          boxShadow:
            '0 4px 12px -6px rgba(42,34,27,0.22), 0 1px 2px rgba(42,34,27,0.08)',
        }}
      >
        <span
          className="block whitespace-pre-wrap break-words px-4 pt-[14px] text-[12px] leading-[19px] text-ink-900"
        >
          {letterText.trim() ? (
            letterText
          ) : (
            <span className="italic text-ink-400/80">A note for you…</span>
          )}
        </span>
      </motion.span>

      {/* Front pocket — covers bottom half of envelope, with a subtle V notch
          at the top so the closed envelope reads as a real card holder. */}
      <span
        aria-hidden
        className="absolute left-0 right-0 z-[3] rounded-b-[6px]"
        style={{
          height: POCKET_H,
          bottom: 0,
          backgroundColor: SHELL,
          clipPath: 'polygon(0 0, 50% 14%, 100% 0, 100% 100%, 0 100%)',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.5), 0 2px 6px -3px rgba(42,34,27,0.16)',
          borderRight: `1px solid ${SHELL_EDGE}`,
          borderLeft: `1px solid ${SHELL_EDGE}`,
          borderBottom: `1px solid ${SHELL_EDGE}`,
        }}
      />

      {/* Flap — rotates around its top edge from 0 → 180deg.
          With backface-visibility hidden it disappears past 90deg, revealing
          the letter behind. Stays at z=5 so it covers the front pocket when
          closed but is "above" only visually until it flips away. */}
      <motion.span
        aria-hidden
        initial={false}
        animate={{ rotateX: isOpen ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        className="absolute left-0 right-0 z-[5]"
        style={{
          height: FLAP_H,
          top: flapTop,
          backgroundColor: FLAP_LIGHT,
          clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
          transformOrigin: 'top',
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
          filter:
            'drop-shadow(0 2px 1px rgba(42,34,27,0.06)) drop-shadow(0 1px 0 rgba(42,34,27,0.05))',
        }}
      >
        {/* Tiny "T" monogram dot — Tiny Blooms flavor, only visible when closed */}
        <span
          aria-hidden
          className="absolute left-1/2 top-[42%] flex h-[14px] w-[14px] -translate-x-1/2 items-center justify-center rounded-full font-serif text-[8px] font-semibold tracking-tight text-cream-50/95"
          style={{
            backgroundColor: '#c25e4f',
            boxShadow:
              'inset 0 1px 1px rgba(255,255,255,0.25), 0 1px 1px rgba(42,34,27,0.18)',
          }}
        >
          T
        </span>
      </motion.span>

      {/* Focus ring — sits over envelope only, not the slid-out letter area */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 right-0 z-[8] rounded-[8px] ring-0 ring-offset-2 ring-offset-cream-50 transition-shadow group-focus-visible:ring-2 group-focus-visible:ring-ink-400/45"
        style={{ bottom: 0, height: ENV_H }}
      />
    </button>
  )
}
