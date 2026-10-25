import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  // Per reactivar el botó flotant de Vue DevTools: afegir vueDevTools() als
  // plugins (import vueDevTools from 'vite-plugin-vue-devtools').
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // changeOrigin: false conserva el Host original (la forma curta
      // '/api': 'http://backend:3000' el reescriu a backend:3000). L'anti-CSRF del
      // backend el compara amb l'Origin quan el navegador no envia Sec-Fetch-Site,
      // com passa en HTTP des del mòbil per la LAN.
      '/api': { target: 'http://backend:3000', changeOrigin: false },
    },
  },
})
