/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        finixar: {
          // Primary Colors
          navy: '#1e3a5f',        // Deep Navy Blue - Main brand, sidebar
          white: '#ffffff',        // Crisp White

          // Accent Colors
          teal: '#0891b2',         // Professional Teal - CTAs, links
          'teal-hover': '#0e7490', // Darker teal for hover
          green: '#10b981',        // Success Green - Completed payments
          amber: '#f59e0b',        // Warning Amber - Pending actions
          red: '#ef4444',          // Alert Red - Overdue, critical

          // Neutral Grays
          charcoal: '#1f2937',     // Primary text
          gray: '#6b7280',         // Secondary text
          'gray-light': '#f3f4f6', // Borders, dividers
          background: '#f9fafb',   // Page backgrounds

          // Optional Accent
          purple: '#8b5cf6',       // Premium features
          'purple-hover': '#7c3aed', // Darker purple for hover

          // Backwards compatibility mappings
          sidebar: '#1e3a5f',      // Maps to navy
          cta: '#0891b2',          // Maps to teal
          'cta-hover': '#0e7490',  // Maps to teal-hover
          accent: '#8b5cf6',       // Maps to purple for highlights
          'accent-hover': '#7c3aed', // Maps to purple-hover
          text: '#1f2937',         // Maps to charcoal
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
