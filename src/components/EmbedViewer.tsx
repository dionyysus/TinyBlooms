import { lazy, Suspense, useEffect, useMemo } from 'react'
import { deserializeShareState } from '../utils/shareState'
import { getSharePayloadFromLocation } from '../utils/shareUrlParams'

const PreviewScene = lazy(async () => {
  const m = await import('./PreviewScene')
  return { default: m.PreviewScene }
})

export function EmbedViewer() {
  const shared = useMemo(() => {
    const raw = getSharePayloadFromLocation()
    return raw ? deserializeShareState(raw) : null
  }, [])

  useEffect(() => {
    const prev = document.title
    document.title = 'Tiny Blooms'
    return () => {
      document.title = prev
    }
  }, [])

  if (!shared) {
    return (
      <main className="flex min-h-screen w-full flex-col items-center justify-center bg-cream-50 px-6 py-10 text-center text-[13px] text-ink-500">
        <p className="max-w-sm leading-relaxed">
          This bouquet link is missing or invalid. Ask the sender for a new link.
        </p>
      </main>
    )
  }

  const { wrapperId, bouquet, letterText, letterCardColor } = shared

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden overflow-y-auto bg-cream-50 px-4 py-8 sm:px-6 sm:py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(56%_42%_at_50%_12%,rgba(243,182,169,0.07),transparent_72%),radial-gradient(48%_40%_at_88%_78%,rgba(184,197,172,0.07),transparent_72%)]"
      />
      <Suspense
        fallback={
          <div
            className="relative z-10 min-h-[20rem] w-full max-w-[min(792px,100%)] rounded-md bg-cream-100/50"
            aria-hidden
          />
        }
      >
        <div className="relative z-10 w-full max-w-[min(792px,100%)]">
          <PreviewScene
            embedded
            wrapperId={wrapperId}
            bouquet={bouquet}
            letterText={letterText}
            letterCardColor={letterCardColor}
            onEditMessage={() => {}}
            onEditBouquet={() => {}}
            onDownloadImage={() => {}}
            onCopyShareLink={() => {}}
          />
        </div>
      </Suspense>
    </main>
  )
}
