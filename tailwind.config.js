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
          50: '#eef6ff',
          100: '#d9eaff',
          200: '#bcdbff',
          300: '#8ec4ff',
          400: '#59a3fe',
          500: '#3280f6',
          600: '#1e61ea',
          700: '#174bd6',
          800: '#193eac',
          900: '#1a3788',
          950: '#112253',
        },
      },
    },
  },
  plugins: [],
}
