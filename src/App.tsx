import { lazy, Suspense, useMemo } from 'react'
import { getEmbedModeFromLocation } from './utils/shareUrlParams'

const BouquetBuilder = lazy(async () => {
  const m = await import('./components/BouquetBuilder')
  return { default: m.BouquetBuilder }
})

const EmbedViewer = lazy(async () => {
  const m = await import('./components/EmbedViewer')
  return { default: m.EmbedViewer }
})

export default function App() {
  const openEmbedViewer = useMemo(() => {
    if (typeof window === 'undefined') return false
    return getEmbedModeFromLocation()
  }, [])

  return (
    <Suspense fallback={<AppShellFallback />}>
      {openEmbedViewer ? <EmbedViewer /> : <BouquetBuilder />}
    </Suspense>
  )
}

function AppShellFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-50">
      <div
        className="h-9 w-9 animate-pulse rounded-full bg-cream-200/90"
        aria-hidden
      />
      <span className="sr-only">Loading…</span>
    </div>
  )
}
