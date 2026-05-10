import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Production asset base path.
 *
 * - **Default `/`** — correct for Vercel, Netlify, `*.github.io` user sites, and most hosts.
 * - **GitHub *project* Pages** (`https://user.github.io/RepoName/`) — set at build time:
 *   `VITE_BASE_PATH=/RepoName/ npm run build` (see `npm run build:gh-pages`).
 *
 * @see https://vite.dev/guide/build.html#public-base-path
 */
function deployBase(): string {
  const raw = process.env.VITE_BASE_PATH?.trim()
  if (raw && raw.length > 0) {
    return raw.endsWith('/') ? raw : `${raw}/`
  }
  return '/'
}

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  // Dev server always uses `/`. Production uses `deployBase()` (`/` unless `VITE_BASE_PATH` is set).
  base: command === 'serve' && !isPreview ? '/' : deployBase(),
  plugins: [react(), tailwindcss()],
}))
