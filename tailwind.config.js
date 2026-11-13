/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7ff',
          100: '#ebf0fe',
          200: '#dbe3fd',
          300: '#c0cdfb',
          400: '#9eaef7',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        navy: {
          950: '#070a12',
          900: '#0b0f19',
          850: '#0f1626',
          800: '#141d30',
          750: '#1a263e',
          700: '#223252',
          600: '#2e436d',
        },
      },
      boxShadow: {
        'premium': '0 4px 20px -2px rgba(0, 0, 0, 0.4), 0 2px 6px -1px rgba(0, 0, 0, 0.3)',
        'premium-hover': '0 10px 30px -4px rgba(0, 0, 0, 0.5), 0 4px 12px -2px rgba(99, 102, 241, 0.12)',
      },
    },
  },
  plugins: [],
}
