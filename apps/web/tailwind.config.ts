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
        // Background - Vercel dark theme
        background: {
          DEFAULT: '#000000',
          secondary: '#111111',
          tertiary: '#1A1A1A',
        },
        // Text - white with clear hierarchy
        foreground: {
          DEFAULT: '#EDEDED',
          secondary: '#A1A1A1',
          muted: '#666666',
        },
        // Accent - white for CTAs (Vercel dark style)
        accent: {
          DEFAULT: '#FFFFFF',
          hover: '#D9D9D9',
          light: '#1A1A1A',
        },
        // Status colors - vibrant on dark
        status: {
          critical: '#E5484D',
          'critical-light': '#2D1515',
          warning: '#FF9500',
          'warning-light': '#2D2010',
          healthy: '#3ECF8E',
          'healthy-light': '#152D1F',
        },
        // Border - subtle on dark
        border: {
          DEFAULT: '#262626',
          hover: '#404040',
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
