/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#04080f',
        surface: {
          DEFAULT: '#0a1018',
          elevated: '#0f1623'
        },
        border: {
          DEFAULT: '#1a2a3a',
          active: '#2a4060'
        },
        accent: {
          blue: '#3b82f6',
          'blue-2': '#60a5fa',
          cyan: '#22d3ee'
        },
        positive: '#22c55e',
        negative: '#ef4444',
        warning: '#f59e0b',
        muted: '#64748b',
        text: {
          primary: '#e2e8f0',
          secondary: '#94a3b8',
          muted: '#475569'
        }
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', '"JetBrains Mono"', 'ui-monospace', 'monospace']
      },
      transitionDuration: {
        DEFAULT: '200ms'
      },
      boxShadow: {
        'glow-cyan': '0 0 24px -4px rgba(34, 211, 238, 0.45)',
        'glow-blue': '0 0 24px -4px rgba(59, 130, 246, 0.45)'
      },
      backgroundImage: {
        // Subtle carbon-fiber weave via repeating gradients
        carbon:
          'repeating-linear-gradient(45deg, rgba(255,255,255,0.012) 0 2px, transparent 2px 4px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.012) 0 2px, transparent 2px 4px)'
      }
    }
  },
  plugins: []
}
