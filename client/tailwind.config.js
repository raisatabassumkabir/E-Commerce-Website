/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          950: '#0F0E0D',
          900: '#1A1918',
          800: '#2A2928',
        },
        accent: {
          500: '#121212',
          600: '#2A2928',
        },
        nude: {
          50: '#FDFBF9',
          100: '#F7F4EF',
          200: '#F5F0E6',
          300: '#E5E0D8',
        },
        line: {
          DEFAULT: '#E5E0D8',
        },
        dark: {
          900: '#1A1918', // mapped to charcoal instead of black
          800: '#2A2928',
          700: '#3A3938',
          600: '#4A4948',
          500: '#5A5958',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        shimmer: 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideInRight: { '0%': { opacity: '0', transform: 'translateX(100%)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        scaleIn: { '0%': { opacity: '0', transform: 'scale(0.95)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      backdropBlur: { xs: '2px' },
      boxShadow: {
        elegant: '0 4px 20px rgba(26, 25, 24, 0.05)',
        'elegant-lg': '0 10px 40px rgba(26, 25, 24, 0.08)',
        subtle: '0 2px 10px rgba(0, 0, 0, 0.02), 0 0 1px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
};
