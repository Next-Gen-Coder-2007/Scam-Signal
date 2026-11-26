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
        canvas: '#090d16',
        surface: {
          DEFAULT: '#0f172a',
          card: '#0f172a',
          hover: '#1e293b',
          border: '#1e293b',
          subtle: '#334155',
        },
        threat: {
          critical: '#f43f5e',
          high: '#fb7185',
          suspicious: '#f59e0b',
          low: '#38bdf8',
          safe: '#10b981',
        },
        ai: {
          local: '#10b981',
          cloud: '#6366f1',
          hybrid: '#06b6d4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
