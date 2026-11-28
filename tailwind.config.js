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
        canvas: '#fafafa',
        void: '#f4f4f5',
        surface: {
          DEFAULT: '#ffffff',
          card: '#ffffff',
          elevated: '#f4f4f5',
          hover: '#e4e4e7',
          border: '#e4e4e7',
          subtle: '#d4d4d8',
        },
        accent: {
          violet: '#ea580c',
          'violet-hover': '#c2410c',
          'violet-muted': '#f59e0b',
          cyan: '#d97706',
          'cyan-muted': '#b45309',
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
