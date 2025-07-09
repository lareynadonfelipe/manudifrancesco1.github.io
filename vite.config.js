import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // 1) USAR RUTAS RELATIVAS
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  build: {
    // 2) SALIDA en docs/
    outDir: 'docs',
    // 3) LIMPIAR docs/ antes de build
    emptyOutDir: true,
    // 4) opcional: no crear docs/assets, vuela TODO a root de docs/
    assetsDir: ''
  },
  plugins: [react()]
})
