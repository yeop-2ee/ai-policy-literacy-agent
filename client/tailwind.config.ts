import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand:   '#16A34A',       // green-600
        'brand-light': '#F0FDF4', // green-50
        'brand-dark':  '#15803D', // green-700
        ink: {
          900: '#0F172A', // slate-900
          700: '#334155', // slate-700
          500: '#64748B', // slate-500
          300: '#CBD5E1', // slate-300
          100: '#F1F5F9', // slate-100
        },
        surface: '#F8FAFC', // slate-50
      },
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['10px', '14px'],
        xs:    ['12px', '16px'],
        sm:    ['13px', '18px'],
        base:  ['14px', '20px'],
        md:    ['15px', '22px'],
        lg:    ['17px', '24px'],
        xl:    ['20px', '28px'],
        '2xl': ['24px', '32px'],
        '3xl': ['28px', '36px'],
      },
      borderRadius: {
        DEFAULT: '8px',
        md:  '10px',
        lg:  '14px',
        xl:  '18px',
        '2xl': '22px',
        full: '9999px',
      },
      boxShadow: {
        xs:    '0 1px 2px rgba(0,0,0,.06)',
        sm:    '0 1px 2px rgba(0,0,0,.06)',
        md:    '0 1px 2px rgba(0,0,0,.06)',
        lg:    '0 1px 2px rgba(0,0,0,.06)',
        brand: '0 4px 14px rgba(22,163,74,.28)',
      },
    },
  },
  plugins: [],
}
export default config
