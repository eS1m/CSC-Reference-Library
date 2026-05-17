import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react() // Standard, stable React plugin
  ],
  preview: {
    allowedHosts: [
      'ccs-reference-library-staging-vtmh4.ondigitalocean.app'
    ]
  }
})