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
        includeAssets: ['assets/logo.png'],
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
          // PNG only — `sizes: 'any'` tells the OS to scale to whatever it needs
          // for the home-screen icon, splash screen and task switcher.
          icons: [
            { src: '/assets/logo.png', sizes: 'any', type: 'image/png', purpose: 'any' },
            { src: '/assets/logo.png', sizes: 'any', type: 'image/png', purpose: 'maskable' },
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

          // CRITICAL — without these, a previous deploy's HTML stays cached
          // pointing to JS asset hashes that no longer exist after the next
          // deploy, and Service Worker–enabled (i.e. HTTPS) clients keep
          // loading a 404'd bundle → white screen. HTTP clients have no SW
          // so they always pull the fresh HTML and work fine. This was the
          // mismatch the user reported.
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,

          // SPA navigation fallback so React Router routes resolve even if
          // the network is flaky. Excludes API + Socket.IO + files with
          // extensions so they keep going to the network.
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/socket\.io/, /\.\w{2,4}$/],

          // Network-only for the API — never serve a stale balance or bet
          // record from cache.
          runtimeCaching: [
            { urlPattern: ({ url }) => url.pathname.startsWith('/api/'),       handler: 'NetworkOnly' },
            { urlPattern: ({ url }) => url.pathname.startsWith('/socket.io'),  handler: 'NetworkOnly' },
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
