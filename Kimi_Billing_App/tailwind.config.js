/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          deep: '#050505',
          surface: '#0E0E10',
          elevated: '#16161A',
        },
        brand: {
          red: '#B31B1B',
          redDim: '#7C1313',
          gold: '#D4AF37',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#A1A1AA',
          dim: '#52525B',
        }
      },
      borderRadius: {
        '4xl': '32px',
        '5xl': '40px',
        '6xl': '48px',
      },
      animation: {
        'reveal': 'reveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'glow-pulse': 'glowPulse 3s infinite',
      },
      keyframes: {
        reveal: {
          '0%': { opacity: '0', transform: 'translateY(20px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 0 rgba(179, 27, 27, 0)' },
          '50%': { boxShadow: '0 0 20px rgba(179, 27, 27, 0.2)' },
        }
      }
    },
  },
  plugins: [],
}
