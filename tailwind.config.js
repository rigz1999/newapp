/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        finixar: {
          background: '#F9FAFB',
          sidebar: '#0B1F3A',
          cta: '#00B894',
          text: '#2E2E2E',
          accent: '#2EC4B6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
