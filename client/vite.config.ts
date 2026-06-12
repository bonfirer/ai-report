import { defineConfig, createLogger } from 'vite'
import react from '@vitejs/plugin-react'

const logger = createLogger()
const originalWarn = logger.warn.bind(logger)
const originalError = logger.error.bind(logger)
logger.warn = (msg, options) => {
  if (msg.includes('EPIPE') || msg.includes('ws proxy')) return
  originalWarn(msg, options)
}
logger.error = (msg, options) => {
  if (msg.includes('EPIPE') || msg.includes('ws proxy')) return
  originalError(msg, options)
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  customLogger: logger,
  build: {
    chunkSizeWarningLimit: 600,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        ws: true,
      },
    },
  },
})
