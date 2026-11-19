import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    css: false,
    setupFiles: './src/test/setup.js',
    include: ['src/**/*.test.{js,jsx}'],
  },
  build: {
    rollupOptions: {
      output: {
        // Keep React + the router in one long-lived, separately cached chunk. App code changes on every deploy; React does not, so a
        // returning visitor on a slow network re-downloads only the small app chunks. Everything else (recharts, react-quill,
        // react-phone-number-input, ...) is split automatically by the lazy route imports in src/App.jsx and ends up only in the
        // chunks of the pages that actually use it.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom|@remix-run[\\/]router)[\\/]/.test(id)) {
            return 'vendor-react';
          }
          return undefined;
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
