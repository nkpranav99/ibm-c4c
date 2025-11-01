/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#34592E',
          50: '#eef2ec',
          100: '#dde4da',
          200: '#c1d0bd',
          300: '#96A694',
          400: '#6f8d69',
          500: '#577353',
          600: '#34592E',
          700: '#2b4725',
          800: '#20351c',
          900: '#152412',
        },
        secondary: {
          DEFAULT: '#F0F2B3',
          50: '#f9faf5',
          100: '#F2F2F2',
          200: '#F1F2D0',
          300: '#F0F2B3',
          400: '#F0F2A0',
          500: '#d8dc7c',
          600: '#c0c46a',
          700: '#a0a552',
          800: '#7a7d3d',
          900: '#575829',
        },
        accent: {
          DEFAULT: '#96A694',
          50: '#f1f4f0',
          100: '#e3e9e0',
          200: '#c7d4c4',
          300: '#a9bca4',
          400: '#96A694',
          500: '#7c8b7b',
          600: '#647161',
          700: '#4d5649',
          800: '#343b31',
          900: '#1d221c',
        },
      },
    },
  },
  plugins: [],
}

