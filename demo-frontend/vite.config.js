import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Support both VITE_ and REACT_APP_ prefixes for environment variables
  envPrefix: ['VITE_', 'REACT_APP_'],
  
  // Build configuration
  build: {
    outDir: 'build', // Keep 'build' for Netlify compatibility
    sourcemap: false,
    // Optimize chunks for better loading
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          i18n: ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          ui: ['framer-motion']
        }
      }
    }
  },
  
  // Development server configuration
  server: {
    port: 3000,
    open: true,
    host: true // Allow external connections for development
  },
  
  // Static asset handling
  publicDir: 'public'
})

