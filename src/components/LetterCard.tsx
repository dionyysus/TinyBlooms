import { LETTER_PAPER_PRESETS } from '../data/letterPaperPresets'

const TEXTAREA_ID = 'bouquet-letter-message'

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

/** Keeps ruled lines visible on light or dark custom swatches */
function ruledLineStops(backgroundHex: string): { line: string; opacity: number } {
  const rgb = hexToRgb(backgroundHex)
  if (!rgb) return { line: '122, 110, 96', opacity: 0.055 }
  const luminance =
    (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255
  if (luminance < 0.42) {
    return { line: '255, 255, 255', opacity: 0.09 }
  }
  const boost = luminance < 0.7 ? 0 : Math.min(0.05, (luminance - 0.7) * 0.2)
  return { line: '122, 110, 96', opacity: 0.055 + boost }
}

type Props = {
  letterText: string
  onLetterTextChange: (value: string) => void
  onBack: () => void
  onDone: () => void
  paperColor: string
  onPaperColorChange: (color: string) => void
}

export function LetterCard({
  letterText,
  onLetterTextChange,
  onBack,
  onDone,
  paperColor,
  onPaperColorChange,
}: Props) {
  const { line, opacity } = ruledLineStops(paperColor)
  const presetMatch = LETTER_PAPER_PRESETS.some(
    (p) => p.color.toLowerCase() === paperColor.trim().toLowerCase(),
  )

  return (
    <div className="flex w-full flex-col items-stretch">
      <header className="mb-8 text-center sm:mb-10 sm:text-left">
        <h2 className="font-serif text-[1.25rem] font-semibold tracking-tight text-ink-900 sm:text-[1.35rem]">
          Your note
        </h2>
        <p className="mt-2 max-w-md text-[13px] leading-relaxed text-ink-500">
          Add a message to go with your bouquet. You can say anything you like.
        </p>
      </header>

      <div
        className="mb-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start"
        role="group"
        aria-label="Note paper color"
      >
        {LETTER_PAPER_PRESETS.map((p) => {
          const selected =
            p.color.toLowerCase() === paperColor.trim().toLowerCase()
          return (
            <button
              key={p.id}
              type="button"
              aria-label={p.label}
              aria-pressed={selected}
              onClick={() => onPaperColorChange(p.color)}
              className={`h-7 w-7 shrink-0 rounded-full border border-ink-900/10 shadow-sm transition-[box-shadow,transform] hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 ${
                selected
                  ? 'ring-2 ring-ink-500/55 ring-offset-2 ring-offset-cream-50'
                  : ''
              }`}
              style={{ backgroundColor: p.color }}
            />
          )
        })}
        <label className="relative flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-ink-900/10 shadow-sm transition-[box-shadow,transform] hover:scale-105 focus-within:ring-2 focus-within:ring-ink-400/40 focus-within:ring-offset-2 focus-within:ring-offset-cream-50">
          <span className="sr-only">Custom paper color</span>
          <input
            type="color"
            value={
              /^#[0-9a-fA-F]{6}$/.test(paperColor.trim())
                ? letterColorInputValue(paperColor)
                : '#faf7f0'
            }
            onChange={(e) => onPaperColorChange(e.target.value)}
            className="absolute inset-[-30%] h-[160%] w-[160%] cursor-pointer border-0 p-0"
            aria-label="Custom paper color"
          />
          {!presetMatch ? (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-ink-500/55 ring-offset-2 ring-offset-cream-50"
            />
          ) : null}
        </label>
      </div>

      <div
        className="grain-light relative mx-auto w-full max-w-[min(600px,100%)] overflow-hidden rounded-[var(--radius-card)] border border-cream-200/40 shadow-card"
        style={{ backgroundColor: paperColor }}
      >
        <div
          className="relative z-[1] px-7 pb-8 pt-8 sm:px-10 sm:pb-10 sm:pt-9"
          style={{
            backgroundImage: `repeating-linear-gradient(
              transparent,
              transparent 27px,
              rgba(${line}, ${opacity}) 27px,
              rgba(${line}, ${opacity}) 28px
            )`,
            backgroundPosition: '0 12px',
          }}
        >
          <label
            htmlFor={TEXTAREA_ID}
            className="sr-only"
          >
            Message for your bouquet
          </label>
          <textarea
            id={TEXTAREA_ID}
            value={letterText}
            onChange={(e) => onLetterTextChange(e.target.value)}
            placeholder="Write your note…"
            rows={8}
            className="scroll-soft min-h-[200px] w-full resize-y border-0 border-b border-cream-300/35 bg-transparent px-0 py-1 text-[15px] leading-[1.65] text-ink-900 placeholder:text-ink-400/75 focus:border-ink-300/40 focus:outline-none focus:ring-0 sm:text-[15.5px]"
          />
        </div>
      </div>

      <div className="mx-auto mt-8 flex w-full max-w-[min(600px,100%)] flex-wrap items-center justify-center gap-3 sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-cream-200/55 bg-cream-50/90 px-6 text-[13px] font-medium text-ink-700 shadow-soft transition-colors hover:border-cream-300/80 hover:bg-cream-100/90 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400/35 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
        >
          Edit bouquet
        </button>
        <button
          type="button"
          onClick={onDone}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-ink-900/85 bg-ink-900 px-6 text-[13px] font-medium text-cream-50 shadow-soft transition-colors hover:bg-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
        >
          Done
        </button>
      </div>
    </div>
  )
}

/** Normalize 3-digit hex to 6-digit for color input */
function letterColorInputValue(hex: string): string {
  const h = hex.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(h)) return h.toLowerCase()
  return '#faf7f0'
}
