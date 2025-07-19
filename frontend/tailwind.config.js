/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        'darkest': '#084459',
        'darke': '#1f6a84',
        'lite': '#bae8f8ff',
        'litest': '#e9f3f7ff',
        'black': '#06080bff',
        'white': '#ffffffff',
        'gray': '#9d9f9fff',
        'life': '#22ad45ff',
        'blau': '#69b5f3ff',
        'pastelblau': '#a0cae4ff',
      },
      fontFamily: {
        sans: ['Tektur', 'sans-serif'],
      },
      keyframes: {
        'slide-in': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(12, 154, 248, 0.7)' },
          '50%': { boxShadow: '0 0 20px rgba(198, 226, 255, 1)' },
        },
      },
      animation: {
        glow: 'glow 2s ease-in-out infinite',
        'slide-in': 'slide-in 0.3s ease-out',
      }
    },
  },
  plugins: [],
}