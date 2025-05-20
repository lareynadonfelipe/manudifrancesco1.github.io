import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: '/gestion-campo/',      // your GitHub Pages sub-path
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  build: {
    outDir: 'docs',             // <-- build into docs/
    emptyOutDir: true
  }
})
