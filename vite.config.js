import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// A tiny dev proxy so we can fetch the IPTV playlists without CORS headaches.
export default defineConfig({
  plugins: [react()],
  // Unit tests live next to the code; tests/ holds the Playwright e2e suite.
  test: { include: ['src/**/*.test.js'] },
  server: {
    proxy: {
      '/iptv': {
        target: 'https://iptv-org.github.io',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/iptv/, '/iptv'),
      },
    },
  },
})
