/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F8FAFC',
        navy: {
          900: '#111827',
          DEFAULT: '#1B254B',
          800: '#1E2958',
          700: '#283670',
        },
        coral: {
          50: '#FFF5F1',
          100: '#FFE6DC',
          500: '#F26430',
          600: '#D94D1B',
        },
        category: {
          kids: '#F26430',
          children: '#16A34A',
          subjunior: '#2563EB',
          junior: '#7C3AED',
          teens: '#0D9488',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        malayalam: ['"Noto Sans Malayalam"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
