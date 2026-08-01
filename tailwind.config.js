/** @type {import('tailwindcss').Config} */

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
      serif: ['Gloock'],
      sans: ['Plus Jakarta Sans'],
    },
      colors: {
  cream: 'rgb(var(--color-bg) / <alpha-value>)',
  ink: 'rgb(var(--color-fg) / <alpha-value>)',
  'ink-light': 'rgb(var(--color-fg-light) / <alpha-value>)',
  'ink-muted': 'rgb(var(--color-fg-muted) / <alpha-value>)',
  obsidian: '#111111',
  'obsidian-light': '#333333',
  'obsidian-muted': '#888888',
  paper: '#EAE8DF',
},
    },
  },
  plugins: [],
};