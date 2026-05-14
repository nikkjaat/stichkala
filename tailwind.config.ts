import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-poppins)', 'sans-serif'],
        serif: ['var(--font-playfair)', 'serif'],
      },
      colors: {
        blush: '#FFE4E1',
        lavender: '#E6E6FA',
        beige: '#F5F5DC',
        rose: '#FFB6C1',
        /** Slightly deeper pink for hovers (not red). */
        'rose-dark': '#e8a0b0',
        cream: '#FDFBF9',
        'text-dark': '#4A4A4A',
        'text-light': '#8B8B8B',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-soft': 'linear-gradient(135deg, #FFE4E1 0%, #E6E6FA 100%)',
      },
    },
  },
  plugins: [],
};
export default config;
