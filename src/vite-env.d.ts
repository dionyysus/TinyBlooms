/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Public URL of the deployed app (no trailing slash), e.g. `https://my-app.vercel.app`
   * or `https://user.github.io/TinyBlooms`. Set in Vercel env and/or `.env.local` so
   * “Copy link” works while running `npm run dev` (otherwise links use `127.0.0.1`).
   */
  readonly VITE_PUBLIC_SITE_URL?: string
}
