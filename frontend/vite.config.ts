import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'
import { compression } from 'vite-plugin-compression2'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Pre-compresses every build output above 1KB to `<file>.gz` alongside
    // the original. `nginx.conf`'s `gzip_static on` serves these directly
    // instead of gzipping on every request — origin CPU stays flat under
    // load. Brotli is deliberately not generated here: the stock
    // `nginx:alpine` image (Dockerfile) has no brotli module, and the CDN
    // fronting this origin (docs/Deployment.md §9, Architecture.md §6) is
    // expected to do edge-side brotli itself.
    compression({
      algorithms: ['gzip'],
      include: /\.(js|mjs|css|html|svg|json)$/i,
      threshold: 1024,
      deleteOriginalAssets: false,
    }),
    // Installable-PWA readiness: a real manifest + icons (generated from the
    // brand mark, `public/favicon.svg`) and a narrowly-scoped service worker
    // that precaches only the static app shell (JS/CSS/fonts/icons) for
    // instant repeat loads. It deliberately does NOT cache `/api/` responses
    // or attempt full offline data access — this is a live exam-prep
    // platform (CLAUDE.md: never use dummy data), so serving stale
    // questions/analytics offline would be actively misleading rather than
    // helpful. Offline visitors get the cached app shell, which then shows
    // this app's own real loading/error states once network calls fail.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Nalanda TNPSC',
        short_name: 'Nalanda',
        description:
          'AI-powered TNPSC exam preparation platform for Tamil Nadu — Group 1/2/2A/4, VAO, Police, Forest, TRB.',
        theme_color: '#4a3fbf',
        background_color: '#4a3fbf',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'en',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2,png,ico}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Defensive/explicit even though the real API lives on a
            // separate origin (api.<domain>, docs/Deployment.md §5) and so
            // is never intercepted by this same-origin service worker by
            // default — guards the case of a future same-origin `/api`
            // reverse-proxy path.
            urlPattern: /^\/api\//,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: { enabled: false },
    }),
    // `npm run build -- --mode analyze` writes frontend/stats.html (gitignored,
    // not part of `dist/`) — a treemap of what's actually in each chunk.
    process.env.ANALYZE === 'true' &&
      visualizer({
        filename: 'stats.html',
        gzipSize: true,
        brotliSize: false,
        template: 'treemap',
      }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // No source maps in the production artifact — CLAUDE.md's production-
    // ready bar plus not exposing original source/structure publicly.
    // Re-enable per-build (`--sourcemap`) if a real error-tracking pipeline
    // (Sentry etc.) needs to upload them privately later.
    sourcemap: false,
    rollupOptions: {
      output: {
        // Splits large, slow-changing third-party libraries into their own
        // long-lived chunks (separate content hash from app code), so a
        // routine app deploy doesn't force returning visitors to
        // re-download React/Firebase/Recharts/etc. that didn't change.
        // Without this, Rollup's default heuristics were pulling most of
        // these into whichever page first imported them (e.g. `recharts`
        // — 357KB — landed entirely inside the Analytics page chunk).
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('firebase')) return 'vendor-firebase'
          if (id.includes('recharts') || id.includes('/d3-')) return 'vendor-charts'
          if (id.includes('framer-motion')) return 'vendor-motion'
          if (id.includes('react-router')) return 'vendor-router'
          if (id.includes('react-dom') || /node_modules\/react\//.test(id))
            return 'vendor-react'
          if (id.includes('@tanstack')) return 'vendor-query'
          if (
            id.includes('radix-ui') ||
            id.includes('cmdk') ||
            id.includes('vaul') ||
            id.includes('input-otp')
          )
            return 'vendor-radix'
          if (id.includes('i18next')) return 'vendor-i18n'
          if (
            id.includes('react-hook-form') ||
            id.includes('@hookform') ||
            id.includes('/zod/')
          )
            return 'vendor-forms'
          return 'vendor'
        },
      },
    },
  },
})
