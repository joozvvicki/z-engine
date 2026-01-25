import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    root: resolve('src/ui'),
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/ui/index.html')
        }
      }
    },
    resolve: {
      alias: {
        '@ui': resolve('src/ui/src'),
        '@engine': resolve('src/ui/engine')
      }
    },
    plugins: [vue(), tailwindcss()]
  }
})
