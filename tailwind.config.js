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
        canvas: '#f8fafc',
        void: '#f1f5f9',
        surface: {
          DEFAULT: '#ffffff',
          card: '#ffffff',
          elevated: '#f1f5f9',
          hover: '#e2e8f0',
          border: '#e2e8f0',
          subtle: '#cbd5e1',
        },
        accent: {
          violet: '#6d28d9',
          'violet-hover': '#5b21b6',
          'violet-muted': '#7c3aed',
          cyan: '#0891b2',
          'cyan-muted': '#0e7490',
        },
        threat: {
          critical: '#be123c',
          high: '#e11d48',
          suspicious: '#b45309',
          low: '#0369a1',
          safe: '#047857',
        },
        ai: {
          local: '#059669',
          cloud: '#6d28d9',
          hybrid: '#0891b2',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
