/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#4C2A85',
        mid: '#7B5EA7',
        lavender: '#EDE7F6',
        paper: '#FAF9FC',
        gold: '#E8C547',
        good: '#2E7D32',
        ember: '#C0532F'
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif'
        ]
      }
    }
  },
  plugins: []
};
