import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon-16.png', 'favicon-32.png', 'favicon-48.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Mess — menu & nutrition',
        short_name: 'Mess',
        description: 'Today’s mess menu and your nutrition, in one place.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell only. Firestore data is cached by the Firestore SDK (IndexedDB), never by the
        // service worker, so a cached menu can't override what an admin published.
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        // The UI is English: only the Latin font subsets are worth caching offline.
        globIgnores: ['**/inter-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*.woff2'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/__\//],
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
  build: {
    // The Firebase SDK alone is ~660 kB (≈200 kB gzipped); it is split out and cached separately.
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      output: {
        // Firebase changes less often than app code; a separate chunk stays cached across deploys.
        codeSplitting: {
          groups: [
            { name: 'firebase', test: /node_modules[\\/](@firebase|firebase)[\\/]/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
});
