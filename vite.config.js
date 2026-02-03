import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: '/',
  server: {
    allowedHosts: true
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        simple: resolve(process.cwd(), 'simple/index.html')
      }
    }
  }
})