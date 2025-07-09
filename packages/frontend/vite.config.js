import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  base: '/agent/', // Set this to your repo name for GitHub Pages
  plugins: [react()],
  
  // Security configurations
  server: {
    https: false, // Set to true in production with proper SSL certificates
    host: '127.0.0.1', // More secure than 0.0.0.0
    port: 5173,
    strictPort: true,
    cors: {
      origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true
    },
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  },
  
  // Build configurations
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable in production for security
    minify: 'esbuild',
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'utils': ['lodash', 'date-fns'],
          'ml': ['@tensorflow/tfjs'],
          'charts': ['chart.js', 'recharts'],
          'security': ['crypto-js', 'dompurify']
        }
      }
    },
    // Security: prevent code injection
    chunkSizeWarningLimit: 1000,
    assetsInlineLimit: 4096
  },
  
  // Resolve configurations
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@lib': resolve(__dirname, 'src/lib'),
      '@assets': resolve(__dirname, 'src/assets')
    }
  },
  
  // Define global constants securely
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '2.0.0'),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    __DEV__: process.env.NODE_ENV === 'development'
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tensorflow/tfjs',
      'chart.js',
      'crypto-js'
    ],
    exclude: ['@tensorflow/tfjs-node'] // Exclude Node.js specific packages
  },
  
  // CSS configurations
  css: {
    devSourcemap: false, // Disable CSS source maps in production
    postcss: {
      plugins: []
    }
  },
  
  // Preview configurations for production testing
  preview: {
    port: 4173,
    host: '127.0.0.1',
    strictPort: true,
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self'"
    }
  },
  
  // Environment variables prefix for security
  envPrefix: ['VITE_', 'REACT_APP_'],
  
  // Worker configurations
  worker: {
    format: 'es',
    plugins: [react()]
  }
});