/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        trump: {
          gold: '#FFD700',
          emerald: '#046307',
          dark: '#011a02'
        }
      }
    },
  },
  plugins: [],
}



