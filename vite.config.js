import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // rutas relativas: busca CSS, assets y scripts en la misma carpeta de index.html
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: 'docs',
    // vuela tus assets (css, imágenes) al root de docs/
    assetsDir: '',
    // limpia docs/ antes de generar
    emptyOutDir: true
  },
  plugins: [react()]
})
