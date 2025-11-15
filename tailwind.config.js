/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Enable dark mode with class strategy
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        finixar: {
          // Primary Brand
          'deep-blue': '#0f172a',      // Sidebar, headers, main navigation
          'brand-blue': '#3b82f6',     // Primary CTAs, active states
          'brand-blue-hover': '#2563eb', // Darker blue for hover

          // Quick Action Buttons
          'action-create': '#10b981',  // Create/Add buttons
          'action-create-hover': '#059669', // Hover state
          'action-view': '#3b82f6',    // View/Details buttons
          'action-view-hover': '#2563eb',
          'action-edit': '#f59e0b',    // Edit/Modify buttons
          'action-edit-hover': '#d97706',
          'action-process': '#3b82f6', // Process/Execute buttons (changed to blue)
          'action-process-hover': '#2563eb', // Changed to blue hover
          'action-delete': '#ef4444',  // Delete/Critical buttons
          'action-delete-hover': '#dc2626',

          // Status Indicators
          'status-active': '#10b981',  // Active/Paid
          'status-pending': '#f59e0b', // Pending/Awaiting
          'status-overdue': '#ef4444', // Overdue/Expired
          'status-inactive': '#6b7280', // Draft/Inactive

          // UI Structure
          'bg-dark': '#0f172a',        // Sidebar/navigation
          'bg-light': '#ffffff',       // Main content area
          'bg-card': '#f8fafc',        // Dashboard cards/widgets
          'border': '#e2e8f0',         // Separators, card borders
          'hover': '#f1f5f9',          // Interactive hover effects

          // Dark Mode Colors
          'dark-bg': '#0a0f1e',        // Dark mode background
          'dark-card': '#1e293b',      // Dark mode cards
          'dark-border': '#334155',    // Dark mode borders
          'dark-hover': '#334155',     // Dark mode hover

          // Text Hierarchy
          'text-primary': '#0f172a',   // Headings, important data
          'text-secondary': '#64748b', // Labels, descriptions
          'text-muted': '#94a3b8',     // Timestamps, helper text
          'dark-text-primary': '#f1f5f9',   // Dark mode headings
          'dark-text-secondary': '#94a3b8', // Dark mode labels
          'dark-text-muted': '#64748b',     // Dark mode helper text

          // Data Visualization
          'chart-blue': '#3b82f6',
          'chart-teal': '#06b6d4',
          'chart-green': '#10b981',
          'chart-orange': '#f59e0b',

          // Backwards compatibility mappings
          sidebar: '#0f172a',          // Maps to deep-blue
          navy: '#0f172a',            // Maps to deep-blue
          cta: '#3b82f6',             // Maps to brand-blue
          'cta-hover': '#2563eb',     // Maps to brand-blue-hover
          teal: '#3b82f6',            // Maps to brand-blue
          'teal-hover': '#2563eb',    // Maps to brand-blue-hover
          green: '#10b981',           // Maps to action-create
          amber: '#f59e0b',           // Maps to action-edit
          red: '#ef4444',             // Maps to action-delete
          purple: '#3b82f6',          // Maps to brand-blue (removed purple)
          'purple-hover': '#2563eb',  // Maps to brand-blue-hover
          background: '#f9fafb',      // Light background
          text: '#0f172a',            // Maps to text-primary
          charcoal: '#0f172a',        // Maps to text-primary
          gray: '#64748b',            // Maps to text-secondary
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-out-right': {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'slide-out-right': 'slide-out-right 0.3s ease-in',
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-out': 'fade-out 0.2s ease-in',
      },
    },
  },
  plugins: [],
};
