/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#101411',
        panel: '#171c18',
        line: '#2b332d',
        signal: '#b9f27c',
        muted: '#89938b',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 36px rgba(185, 242, 124, 0.12)',
      },
    },
  },
  plugins: [],
};
