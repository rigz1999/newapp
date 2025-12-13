import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['jspdf', 'jspdf-autotable'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI libraries
          'vendor-ui': ['lucide-react'],
          // PDF generation
          'vendor-pdf': ['jspdf', 'jspdf-autotable', 'pdfjs-dist'],
          // Excel export
          'vendor-excel': ['exceljs'],
          // Supabase
          'vendor-supabase': ['@supabase/supabase-js'],
          // Sentry monitoring
          'vendor-sentry': ['@sentry/react'],
          // Utilities
          'vendor-utils': ['decimal.js', 'dompurify'],
        },
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Disable source maps in production for security (use 'hidden' for error tracking)
    sourcemap: process.env.NODE_ENV === 'development' ? true : 'hidden',
  },
  // Performance optimizations
  server: {
    hmr: {
      overlay: true,
    },
  },
});
