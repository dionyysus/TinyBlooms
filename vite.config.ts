import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * GitHub Project Pages serves the app under `https://<user>.github.io/<repo>/`.
 * `base` must be `/<repo>/` (trailing slash) or the browser requests `/assets/...`
 * from the site root and gets 404s — the app stays blank (white screen).
 * For a user/org site (`<user>.github.io` with no repo path), use `base: '/'`.
 *
 * Override path: `VITE_BASE_PATH=/my-repo/ npm run build`
 * In GitHub Actions, `GITHUB_REPOSITORY` is set as `owner/repo` and used automatically.
 *
 * Fallback matches this repo's GitHub slug (see remote); forks should set `VITE_BASE_PATH`.
 */
function resolveBaseForDeploy(): string {
  const explicit = process.env.VITE_BASE_PATH
  if (explicit) {
    return explicit.endsWith('/') ? explicit : `${explicit}/`
  }
  const repo = process.env.GITHUB_REPOSITORY?.split('/')[1]
  if (repo) {
    return `/${repo}/`
  }
  return '/TinyBlooms/'
}

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  // Dev uses `/` so `/src/main.tsx` resolves; deploy build and `vite preview` use the subpath.
  base: command === 'serve' && !isPreview ? '/' : resolveBaseForDeploy(),
  plugins: [react(), tailwindcss()],
}))
