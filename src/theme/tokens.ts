/**
 * Design System Tokens - Finanças Pro Invest
 * ⚠️ FONTE ÚNICA DE VERDADE — tailwind.config.js deve espelhar estes valores.
 * Altere apenas aqui; depois execute `npm run check:tokens` para validar.
 */

export const COLORS = {
  brand: {
    primary: '#10b981',       // emerald-500 — identidade visual, bg decorativo
    primaryCta: '#059669',    // emerald-600 — CTAs, botões, links (contraste ≥ 3.5:1)
    secondary: '#0ea5e9',     // sky-500
    accent: '#f59e0b',        // amber-500
    technical: '#6366f1',     // Indigo
  },
  status: {
    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
  },
  surface: {
    primary: '#ffffff',
    secondary: '#f8fafc',     // slate-50 — áreas claras legadas
    elevated: '#f1f5f9',      // slate-100 — hover, sub-containers
    subtle: '#eef2f7',        // subcard/itens internos sobre painel branco
    canvas: '#dbe3ed',        // canvas das telas Central/Controla/Explorar — atrás dos painéis brancos
    // dark tokens removed — LIGHT/CLEAR is the canonical theme
    glass: 'rgba(255, 255, 255, 0.8)',
    metallic: 'linear-gradient(135deg, #f8f9fb 0%, #e2e8f0 100%)',
  },
  border: {
    subtle: '#e2e8f0',        // slate-200 — borda padrão de card principal
    strong: '#cbd5e1',        // slate-300 — borda de ênfase/estados (nunca como texto)
  },
  action: {
    sky: '#0284c7',           // sky-600 — fundo p/ texto branco pequeno (substitui sky-500)
    skyDark: '#0369a1',       // sky-700 — hover/focus do sky
    amber: '#b45309',         // amber-700 — texto pequeno sobre claro / fundo p/ texto branco pequeno
    primaryDark: '#047857',   // emerald-700 — texto pequeno sobre claro (substitui emerald-500)
    dangerDark: '#be123c',    // rose-700 — texto pequeno sobre claro (substitui red/rose-500)
  },
  focus: {
    ring: '#0284c7',          // sky-600 — anel focus-visible global
    ringSoft: 'rgba(2, 132, 199, 0.35)',
  },
  text: {
    primary: '#0f172a',       // slate-900 — headings, hero
    secondary: '#475569',     // slate-600 — corpo, descrições (6.1:1 ✅)
    support: '#334155',       // slate-700 — texto secundário denso (tabelas, filtros)
    muted: '#64748b',         // slate-500 — labels, metadata (4.62:1 ✅)
    placeholder: '#64748b',   // slate-500 — placeholders SEMPRE visíveis (nunca slate-300)
    onBrand: '#ffffff',
    metallic: 'linear-gradient(to bottom right, #0f172a 30%, #475569 100%)',
    silver: 'linear-gradient(to bottom right, #94a3b8 0%, #cbd5e1 100%)',
  }
} as const;

export const SHADOWS = {
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
  card: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03)',
  // Fase 1.5 — escala de 3 níveis p/ Central/Controla/Explorar: panel (painel A/B), raise (destaque), flat = sem sombra (seção C/D e itens)
  panel: '0 1px 2px 0 rgba(15, 23, 42, 0.07), 0 12px 32px -12px rgba(15, 23, 42, 0.22)',
  floating: '0 30px 60px -12px rgba(0, 0, 0, 0.12), 0 18px 36px -18px rgba(0, 0, 0, 0.15)',
  glow: '0 0 20px rgba(16, 185, 129, 0.15)',
  technical: '0 20px 25px -5px rgba(0, 0, 0, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.5)',
} as const;

export const GRADIENTS = {
  brand: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  metallic: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
  silver: 'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)',
  glass: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 100%)',
} as const;


export const TYPOGRAPHY = {
  label: 'text-xxs font-black uppercase tracking-[0.2em]',
  title: 'text-4xl font-black tracking-[-0.03em] leading-tight',
  subtitle: 'text-sm font-medium text-slate-500 leading-relaxed',
} as const;

export const RADIUS = {
  button: 'rounded-xl',        // 12px
  card: 'rounded-2xl',         // 16px
  elevated: 'rounded-[2rem]',  // 32px
  hero: 'rounded-[2.5rem]',    // 40px
  // Fase 1.5 — 3 níveis p/ Central/Controla/Explorar
  panel: 'rounded-3xl',        // 24px — painel principal (Nível A/B)
  section: 'rounded-2xl',      // 16px — seção e card complementar (Nível B/C)
  item: 'rounded-xl',          // 12px — subcard, linha interna, chip auxiliar
} as const;

