
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#2E90FF', light: '#EAF3FF', dark: '#1B6ED6' },
        accent: { DEFAULT: '#FFC857', dark: '#E0A826' }
      },
      borderRadius: { xl: '14px', '2xl': '20px' },
      boxShadow: {
        soft: '0 8px 24px rgba(46,144,255,0.12)',
        card: '0 10px 30px rgba(0,0,0,0.06)'
      }
    }
  },
  plugins: []
}
