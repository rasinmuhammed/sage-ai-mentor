import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Premium color palette
        primary: {
          DEFAULT: '#933DC9', // Orchid
          dark: '#53118F',    // Violet
          light: '#C488F8',   // Light purple
        },
        surface: {
          DEFAULT: '#242424', // Raisin Black
          dark: '#000000',    // Pure Black
        },
        text: {
          DEFAULT: '#FBFAEE', // Floral White
        }
      },
      animation: {
        'shimmer': 'shimmer 2s infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-glow': {
          '0%, 100%': { 
            opacity: '1',
            boxShadow: '0 0 20px rgba(147, 61, 201, 0.5)'
          },
          '50%': { 
            opacity: '0.8',
            boxShadow: '0 0 30px rgba(147, 61, 201, 0.8)'
          },
        },
      },
    },
  },
  plugins: [],
}
export default config