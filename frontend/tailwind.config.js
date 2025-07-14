/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        'darkgreen': '#084459',
        'green': '#1f6a84',
        'litegreen': '#22a4d2',
        'lime': '#8bdbf7',
        'black': '#000000',
        'white': '#ffffff',
        'gray': '#737373',
        'life': '#22ad45ff',
      },
      fontFamily: {
        sans: ['Tektur', 'sans-serif'],
      },
      keyframes: {
        glow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(34,197,94,0.7)' },
          '50%': { boxShadow: '0 0 20px rgba(34,197,94,1)' },
        },
      },
      animation: {
        glow: 'glow 2s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}