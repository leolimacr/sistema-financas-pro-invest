/** @type {import('tailwindcss').Config} */
/* ⚠️ MANTENHA SINCRONIZADO com src/theme/tokens.ts — altere apenas lá e valide com npm run check:tokens */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  safelist: [
    'bg-amber-50',
    'bg-emerald-50',
    'bg-sky-50',
    'bg-purple-50',
    'border-amber-300',
    'border-emerald-300',
    'border-sky-300',
    'border-purple-300',
    'hover:border-amber-400',
    'hover:border-emerald-400',
    'hover:border-sky-400',
    'hover:border-purple-400',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          primary: '#10b981',
          primaryCta: '#059669',
          secondary: '#0ea5e9',
          accent: '#f59e0b',
          technical: '#6366f1',
        },
        status: {
          success: '#10b981',
          danger: '#ef4444',
          warning: '#f59e0b',
          info: '#3b82f6',
        },
        surface: {
          primary: '#ffffff',
          secondary: '#f8fafc',
          elevated: '#f1f5f9',
          subtle: '#eef2f7',
          canvas: '#dbe3ed',
          // dark tokens removed — LIGHT/CLEAR canonical theme
          glass: 'rgba(255, 255, 255, 0.8)',
        },
        border: {
          subtle: '#e2e8f0',
          strong: '#cbd5e1',
        },
        action: {
          sky: '#0284c7',
          skyDark: '#0369a1',
          amber: '#b45309',
          primaryDark: '#047857',
          dangerDark: '#be123c',
        },
        focus: {
          ring: '#0284c7',
          ringSoft: 'rgba(2, 132, 199, 0.35)',
        },
        text: {
          primary: '#0f172a',
          secondary: '#475569',
          support: '#334155',
          muted: '#64748b',
          placeholder: '#64748b',
          onBrand: '#ffffff',
          technical: '#64748b',
        }
      },
      borderRadius: {
        'button': '0.75rem',
        'card': '1rem',
        'elevated': '2rem',
        'hero': '2.5rem',
        'panel': '1.5rem',
        'section': '1rem',
        'item': '0.75rem',
      },
      boxShadow: {
        'sm': '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        'card': '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03)',
        'soft': '0 1px 2px 0 rgba(15, 23, 42, 0.06), 0 4px 12px -2px rgba(15, 23, 42, 0.08)',
        'panel': '0 1px 2px 0 rgba(15, 23, 42, 0.07), 0 12px 32px -12px rgba(15, 23, 42, 0.22)',
        'floating': '0 30px 60px -12px rgba(0, 0, 0, 0.12), 0 18px 36px -18px rgba(0, 0, 0, 0.15)',
        'brand-glow': '0 10px 15px -3px rgba(16, 185, 129, 0.1)',
      },
      letterSpacing: {
        'ultra-wide': '0.2em',
      },
      fontSize: {
        'xxs': ['0.625rem', { lineHeight: '1rem' }],
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(to bottom right, #10b981, #059669)',
        'gradient-dark': 'linear-gradient(to bottom right, #020617, #1e293b)',
        'gradient-info': 'linear-gradient(to bottom right, #38bdf8, #0284c7)',
      }
    },
  },
  plugins: [],
}
