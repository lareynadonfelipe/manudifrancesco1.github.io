// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: '/gestion-campo/',       // tu subruta en GitHub Pages
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  build: {
    outDir: 'docs',              // <- aquí va a salir el sitio compilado
    emptyOutDir: true            // limpia /docs antes de cada build
  }
})
