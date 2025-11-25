/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      animation: {
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      boxShadow: {
        'neu': '12px 12px 24px rgba(166, 180, 200, 0.4), -12px -12px 24px rgba(255, 255, 255, 0.8)',
        'neu-sm': '6px 6px 12px rgba(166, 180, 200, 0.4), -6px -6px 12px rgba(255, 255, 255, 0.8)',
        'neu-inset': 'inset 5px 5px 10px rgba(166, 180, 200, 0.4), inset -5px -5px 10px rgba(255, 255, 255, 0.8)',
        'neu-hover': '8px 8px 16px rgba(166, 180, 200, 0.5), -8px -8px 16px rgba(255, 255, 255, 0.9)',
      },
    },
  },
  plugins: [],
}
