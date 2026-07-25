/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        medilink: {
          50: '#f0f7ff',
          100: '#e0efff',
          200: '#b9dcff',
          300: '#7cc0ff',
          400: '#3b9eff',
          500: '#1d7fe8',
          600: '#1565c7',
          700: '#1352a3',
          800: '#164786',
          900: '#183d6f',
        },
      },
      boxShadow: {
        soft: '0 4px 24px -4px rgba(21, 101, 199, 0.12)',
        card: '0 8px 32px -8px rgba(21, 101, 199, 0.15)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
