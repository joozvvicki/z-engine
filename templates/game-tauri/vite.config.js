import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@engine': resolve(__dirname, 'node_modules/@z-engine/core/dist')
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true
  },
  envPrefix: ['VITE_', 'TAURI_']
})
