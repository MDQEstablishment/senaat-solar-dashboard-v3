/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: {
        navy:   { 900: '#0B2545', 800: '#13315C', 700: '#1B4378', 600: '#2A5A9A', 50: '#E6EDF7' },
        gold:   { DEFAULT: '#B8860B', 600: '#A0750A', 400: '#D4A52A' },
        ind:    { red: '#C8102E' },
        ink:    { 900: '#0F172A', 700: '#475569', 500: '#94A3B8', 200: '#E2E8F0', 100: '#F1F5F9', 50: '#F8FAFC' },
        ok:     '#16A34A',
        warn:   '#EAB308',
        danger: '#DC2626',
        info:   '#0284C7',
      },
      boxShadow: {
        card: '0 1px 0 rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)',
        pop:  '0 8px 24px rgba(15,23,42,0.12), 0 2px 6px rgba(15,23,42,0.06)',
      },
      gridTemplateColumns: {
        13: 'repeat(13, minmax(0, 1fr))',
      },
    },
  },
  plugins: [],
};
