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
        // Backgrounds
        background: {
          DEFAULT: '#000000',
          card: '#0a0a0a',
          secondary: '#111111',
          tertiary: '#1a1a1a',
        },
        // Text
        foreground: {
          DEFAULT: '#ededed',
          secondary: '#888888',
          tertiary: '#555555',
          muted: '#666666',
        },
        // Borders
        border: {
          DEFAULT: '#1a1a1a',
          hover: '#252525',
        },
        // Status colors
        status: {
          critical: '#ff4444',
          'critical-muted': '#441111',
          warning: '#f5a623',
          'warning-muted': '#3d2e0a',
          success: '#50e3c2',
          'success-muted': '#0d3d2e',
          info: '#0070f3',
          'info-muted': '#001a3d',
        },
        // Role colors
        purple: {
          DEFAULT: '#a78bfa',
          muted: '#1a1030',
        },
        // NexFlow AI accent
        nf: {
          DEFAULT: '#d4a574',
          muted: '#2a1f14',
        },
        // Accent (CTAs)
        accent: {
          DEFAULT: '#ffffff',
          hover: '#d9d9d9',
        },
        // Card
        card: '#0a0a0a',
      },
      borderRadius: {
        DEFAULT: '6px',
        card: '6px',
        button: '6px',
        input: '6px',
        pill: '9999px',
      },
      boxShadow: {
        card: 'none',
        'card-glow-critical': '0 0 20px rgba(255, 68, 68, 0.15)',
        'card-glow-warning': '0 0 20px rgba(245, 166, 35, 0.15)',
        'card-glow-success': '0 0 20px rgba(80, 227, 194, 0.15)',
        'card-glow-info': '0 0 20px rgba(0, 112, 243, 0.15)',
        'card-glow-purple': '0 0 20px rgba(167, 139, 250, 0.15)',
        'card-glow-nf': '0 0 20px rgba(212, 165, 116, 0.15)',
      },
      fontFamily: {
        sans: ['Geist', 'Satoshi', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'SF Mono', 'JetBrains Mono', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }], // 10px
        xs: ['0.6875rem', { lineHeight: '1rem' }],       // 11px
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],    // 13px
        base: ['0.875rem', { lineHeight: '1.5rem' }],    // 14px
        lg: ['1rem', { lineHeight: '1.5rem' }],          // 16px
        xl: ['1.25rem', { lineHeight: '1.75rem' }],      // 20px
        '2xl': ['1.5rem', { lineHeight: '2rem' }],       // 24px
        '3xl': ['2rem', { lineHeight: '2.5rem' }],       // 32px
        '4xl': ['2.5rem', { lineHeight: '3rem' }],       // 40px
      },
      letterSpacing: {
        tighter: '-0.5px',
        label: '0.5px',
      },
      spacing: {
        '13': '3.25rem', // 52px for top bar
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.35s ease-out forwards',
        'slide-up': 'slideUp 0.3s ease-out forwards',
        'slide-down': 'slideDown 0.3s ease-out forwards',
        'scale-in': 'scaleIn 0.2s ease-out forwards',
        'breathing': 'breathing 2s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite',
        'modal': 'modalSlideUp 0.3s ease-out forwards',
        'tab-in': 'tabSlideIn 0.25s ease-out forwards',
        'progress-fill': 'progressFill 0.8s ease-out forwards',
        'spin': 'spin 1s linear infinite',
        'count': 'countUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
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
        breathing: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '0.8' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        modalSlideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        tabSlideIn: {
          '0%': { opacity: '0', transform: 'translateX(6px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        progressFill: {
          '0%': { width: '0%' },
        },
        countUp: {
          '0%': { opacity: '0.5' },
          '100%': { opacity: '1' },
        },
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
