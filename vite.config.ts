import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Public base path must match the deployed URL (GitHub Project Pages).
 * @see https://vite.dev/guide/build.html#public-base-path
 * @see https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages#types-of-github-pages-sites
 *
 * Override for forks: `VITE_BASE_PATH=/OtherRepo/ npm run build`
 */
function deployBase(): string {
  const raw = process.env.VITE_BASE_PATH?.trim()
  const path = raw && raw.length > 0 ? raw : '/TinyBlooms/'
  return path.endsWith('/') ? path : `${path}/`
}

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  // Dev uses `/` so `/src/main.tsx` resolves; build and `vite preview` use the subpath.
  base: command === 'serve' && !isPreview ? '/' : deployBase(),
  plugins: [react(), tailwindcss()],
}))
