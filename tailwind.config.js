/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#EAE8DF',
        ink: '#111111',
        'ink-light': '#333333',
        'ink-muted': '#888888',
      },
      fontFamily: {
        serif: ['Gloock', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
