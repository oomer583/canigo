import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      workbox: {
        globIgnores: ['packs/**'],
        runtimeCaching: [
          {
            // City packs: keep a copy for offline use, refresh it in the background.
            urlPattern: ({ url }) => url.pathname.startsWith('/packs/'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'city-packs', expiration: { maxEntries: 10 } }
          }
        ]
      },
      manifest: {
        name: 'CanIGo',
        short_name: 'CanIGo',
        description: 'Know if you can get in, before you go.',
        theme_color: '#0b3d2e',
        background_color: '#f6f4ef',
        display: 'standalone',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }]
      }
    })
  ],
  test: { environment: 'node' }
})
