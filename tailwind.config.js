/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        brand: {
          purple: '#7F77DD',
          'purple-light': '#EEEDFE',
          'purple-mid': '#AFA9EC',
          'purple-dark': '#3C3489',
        },
        dark: {
          bg: '#0E0E10',
          surface: '#18181b',
          border: '#2a2a2e',
          muted: '#1e1e22',
        },
      },
    },
  },
  plugins: [],
}
