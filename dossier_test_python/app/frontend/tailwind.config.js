/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        bg2: 'var(--color-bg2)',
        bg3: 'var(--color-bg3)',
        surface: 'var(--color-surface)',
        surface2: 'var(--color-surface2)',
        border: 'var(--color-border)',
        border2: 'var(--color-border2)',
        accent: 'var(--color-accent)',
        accent2: 'var(--color-accent2)',
        success: 'var(--color-success)',
        warn: 'var(--color-warn)',
        danger: 'var(--color-danger)',
        text: 'var(--color-text)',
        text2: 'var(--color-text2)',
        text3: 'var(--color-text3)',
      },
      fontFamily: {
        inter: ['Inter', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
        jetbrains: ['JetBrains Mono', 'Consolas', 'Courier New', 'monospace'],
      },
      borderRadius: {
        radius: '12px',
        'radius-lg': '20px',
      },
      boxShadow: {
        custom: '0 8px 32px rgba(0,0,0,0.4)',
        glow: '0 0 30px rgba(108, 143, 255, 0.15)',
      }
    },
  },
  plugins: [],
}
