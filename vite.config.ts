import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Vite dev proxies /api and /socket.io to the Express backend so the browser
// sees same-origin requests (no CORS preflight, refresh-token flow stays clean).
// In production the frontend talks to VITE_API_BASE_URL and the proxy is unused.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_DEV_PROXY_TARGET || 'http://localhost:4000';

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        // Don't ship the service worker in dev — it caches aggressively and
        // breaks HMR. Toggle to true if you specifically want to test the
        // install flow locally.
        devOptions: { enabled: false },
        includeAssets: ['favicon.svg', 'pwa-icon.svg'],
        manifest: {
          id: '/',
          name: 'DUCHEXiGAMES',
          short_name: 'DuchexiGames',
          description: 'Premium crypto casino + virtual sportsbook.',
          theme_color: '#00ff88',
          background_color: '#0a0c10',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          categories: ['games', 'entertainment', 'finance'],
          icons: [
            { src: '/pwa-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
            { src: '/pwa-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
          ],
          shortcuts: [
            { name: 'Crash',         short_name: 'Crash',  url: '/crash' },
            { name: 'Virtual Sports', short_name: 'Sports', url: '/virtual' },
            { name: 'Bet History',   short_name: 'History', url: '/bet-history' },
          ],
        },
        workbox: {
          // Cache the application shell + fonts/images for offline-tolerant
          // navigation. Bumped limit because the MUI bundle is ~1MB and
          // would otherwise be skipped.
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,woff,woff2}'],
          // Network-first for the API — never serve stale balance / bets.
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
              handler: 'NetworkOnly',
            },
            {
              urlPattern: ({ request }) => request.destination === 'image',
              handler: 'CacheFirst',
              options: {
                cacheName: 'duchex-images',
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
    ],
    server: {
      port: 5173,
      proxy: {
        '/api':       { target: apiTarget, changeOrigin: true },
        '/socket.io': { target: apiTarget, ws: true, changeOrigin: true },
      },
    },
  };
});
