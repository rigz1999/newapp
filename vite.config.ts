import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react', 'jspdf', 'jspdf-autotable', 'exceljs'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI libraries
          'vendor-ui': ['lucide-react'],
          // Supabase
          'vendor-supabase': ['@supabase/supabase-js'],
          // Sentry monitoring
          'vendor-sentry': ['@sentry/react'],
          // Utilities
          'vendor-utils': ['decimal.js', 'dompurify'],
          // Note: jspdf, jspdf-autotable, pdfjs-dist, and exceljs are now lazy-loaded
          // via dynamic imports in ExportModal.tsx for better performance
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
