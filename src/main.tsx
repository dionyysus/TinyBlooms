import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { FLOWERS } from './data/flowers'
import './index.css'
import App from './App'

/** Start fetching PNGs before the shelf mounts so trims unlock right after decode. */
function preloadFlowerAssets() {
  if (typeof document === 'undefined') return
  const prefix = import.meta.env.BASE_URL.replace(/\/$/, '')
  for (const f of FLOWERS) {
    const path = f.imagePath.replace(/^\//, '')
    const href = `${prefix}/${path}`
    const sel = `link[data-flower-preload="${f.id}"]`
    if (document.head.querySelector(sel)) continue
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = href
    link.setAttribute('data-flower-preload', f.id)
    document.head.appendChild(link)
  }
}

preloadFlowerAssets()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
