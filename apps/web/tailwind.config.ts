import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Background - pure white hierarchy
        background: {
          DEFAULT: '#FFFFFF',
          secondary: '#FAFAFA',
          tertiary: '#F5F5F5',
        },
        // Text - near black with clear hierarchy
        foreground: {
          DEFAULT: '#000000',
          secondary: '#454545',
          muted: '#888888',
        },
        // Accent - minimal, black for CTAs (Vercel-style)
        accent: {
          DEFAULT: '#000000',
          hover: '#333333',
          light: '#F5F5F5',
        },
        // Status colors - muted, professional
        status: {
          critical: '#E5484D',
          'critical-light': '#FFEFEF',
          warning: '#FF9500',
          'warning-light': '#FFF4E5',
          healthy: '#30A46C',
          'healthy-light': '#E9F9EF',
        },
        // Border - subtle
        border: {
          DEFAULT: '#E3E3E3',
          hover: '#CCCCCC',
        },
      },
      borderRadius: {
        card: '8px',
        button: '6px',
        input: '6px',
      },
      boxShadow: {
        card: 'none',
        'card-hover': 'none',
        dropdown: '0 4px 12px rgba(0, 0, 0, 0.08)',
      },
      fontFamily: {
        sans: ['Satoshi', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        spin: 'spin 1s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
