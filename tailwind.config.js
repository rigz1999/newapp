/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        finixar: {
          background: '#F9FAFB',
          sidebar: '#0A1929', // Midnight blue
          cta: '#00B894',
          text: '#2E2E2E',
          accent: '#2EC4B6',
          'cta-hover': '#00A080', // Darker teal for hover
          'accent-hover': '#26B3A6', // Darker turquoise for hover
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
