/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: '#0a0a0c',
        surface: {
          DEFAULT: '#111115',
          card: '#111115',
          elevated: '#18181d',
          hover: '#1c1c22',
          border: '#23232a',
          subtle: '#2e2e38',
        },
        accent: {
          violet: '#7c3aed',
          'violet-hover': '#6d28d9',
          'violet-muted': '#8b5cf6',
          cyan: '#06b6d4',
          'cyan-muted': '#22d3ee',
        },
        threat: {
          critical: '#e11d48',
          high: '#f43f5e',
          suspicious: '#d97706',
          low: '#0284c7',
          safe: '#059669',
        },
        ai: {
          local: '#10b981',
          cloud: '#8b5cf6',
          hybrid: '#06b6d4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
