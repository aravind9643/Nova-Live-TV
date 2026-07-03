import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// A tiny dev proxy so we can fetch the IPTV playlists without CORS headaches.
export default defineConfig({
  plugins: [react()],
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
