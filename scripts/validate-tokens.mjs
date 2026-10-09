/**
 * validate-tokens.mjs
 * Compara valores de tokens entre tokens.ts e tailwind.config.js.
 * Falha se houver divergência em qualquer chave sobreposta.
 * Uso: node scripts/validate-tokens.mjs
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function read(path) {
  return readFileSync(resolve(ROOT, path), 'utf-8');
}

const tokensRaw = read('src/theme/tokens.ts');
const tailwindRaw = read('tailwind.config.js');

// Mapa de valores esperados: os valores CORRETOS que ambos devem ter
// Formato: [path amigável, tokens.ts regex pattern, tailwind.config.js regex pattern, valor esperado]
const CHECKS = [
  // Brand
  ['brand.primary',      /primary:\s*'(\#10b981)/,      /primary:\s*'(\#10b981)/,      '#10b981'],
  ['brand.primaryCta',   /primaryCta:\s*'(\#059669)/,   /primaryCta:\s*'(\#059669)/,   '#059669'],
  ['brand.secondary',    /secondary:\s*'(\#0ea5e9)/,    /secondary:\s*'(\#0ea5e9)/,    '#0ea5e9'],
  ['brand.accent',       /accent:\s*'(\#f59e0b)/,       /accent:\s*'(\#f59e0b)/,       '#f59e0b'],
  ['brand.technical',    /technical:\s*'(\#6366f1)/,    /technical:\s*'(\#6366f1)/,    '#6366f1'],

  // Status
  ['status.success',     /success:\s*'(\#10b981)/,       /success:\s*'(\#10b981)/,       '#10b981'],
  ['status.danger',      /danger:\s*'(\#ef4444)/,        /danger:\s*'(\#ef4444)/,        '#ef4444'],
  ['status.warning',     /warning:\s*'(\#f59e0b)/,       /warning:\s*'(\#f59e0b)/,       '#f59e0b'],
  ['status.info',        /info:\s*'(\#3b82f6)/,          /info:\s*'(\#3b82f6)/,          '#3b82f6'],

  // Surface (LIGHT/CLEAR é o tema canônico — sem tokens dark)
  ['surface.primary',    /primary:\s*'(\#ffffff)/,       /primary:\s*'(\#ffffff)/,       '#ffffff'],
  ['surface.secondary',  /secondary:\s*'(\#f8fafc)/,    /secondary:\s*'(\#f8fafc)/,    '#f8fafc'],
  ['surface.elevated',   /elevated:\s*'(\#f1f5f9)/,     /elevated:\s*'(\#f1f5f9)/,     '#f1f5f9'],
  ['surface.subtle',     /subtle:\s*'(\#eef2f7)/,       /subtle:\s*'(\#eef2f7)/,       '#eef2f7'],
  ['surface.canvas',     /canvas:\s*'(\#dbe3ed)/,       /canvas:\s*'(\#dbe3ed)/,       '#dbe3ed'],

  // Border
  ['border.subtle',      /subtle:\s*'(\#e2e8f0)/,        /subtle:\s*'(\#e2e8f0)/,        '#e2e8f0'],
  ['border.strong',      /strong:\s*'(\#cbd5e1)/,        /strong:\s*'(\#cbd5e1)/,        '#cbd5e1'],

  // Action (fundos/textos com contraste p/ texto pequeno e branco)
  ['action.sky',         /sky:\s*'(\#0284c7)/,           /sky:\s*'(\#0284c7)/,           '#0284c7'],
  ['action.amber',       /amber:\s*'(\#b45309)/,         /amber:\s*'(\#b45309)/,         '#b45309'],
  ['action.primaryDark', /primaryDark:\s*'(\#047857)/,   /primaryDark:\s*'(\#047857)/,   '#047857'],
  ['action.dangerDark',  /dangerDark:\s*'(\#be123c)/,    /dangerDark:\s*'(\#be123c)/,    '#be123c'],

  // Text
  ['text.primary',       /primary:\s*'(\#0f172a)/,       /primary:\s*'(\#0f172a)/,       '#0f172a'],
  ['text.secondary',     /secondary:\s*'(\#475569)/,     /secondary:\s*'(\#475569)/,     '#475569'],
  ['text.support',       /support:\s*'(\#334155)/,       /support:\s*'(\#334155)/,       '#334155'],
  ['text.muted',         /muted:\s*'(\#64748b)/,         /muted:\s*'(\#64748b)/,         '#64748b'],
  ['text.placeholder',   /placeholder:\s*'(\#64748b)/,   /placeholder:\s*'(\#64748b)/,   '#64748b'],
  ['text.onBrand',       /onBrand:\s*'(\#ffffff)/,       /onBrand:\s*'(\#ffffff)/,       '#ffffff'],
];

let hasError = false;
const errors = [];

for (const [path, tokenPattern, twPattern, expected] of CHECKS) {
  const tokenMatch = tokensRaw.match(tokenPattern);
  const twMatch = tailwindRaw.match(twPattern);

  if (!tokenMatch) {
    errors.push(`  ❌ ${path}: não encontrado em tokens.ts`);
    hasError = true;
    continue;
  }

  if (!twMatch) {
    errors.push(`  ❌ ${path}: não encontrado em tailwind.config.js`);
    hasError = true;
    continue;
  }

  const tokenVal = tokenMatch[1].toLowerCase();
  const twVal = twMatch[1].toLowerCase();
  const expectedVal = expected.toLowerCase();

  if (tokenVal !== expectedVal) {
    errors.push(`  ❌ ${path}: tokens.ts = ${tokenMatch[1]}, esperado = ${expected}`);
    hasError = true;
  }

  if (twVal !== expectedVal) {
    errors.push(`  ❌ ${path}: tailwind.config.js = ${twMatch[1]}, esperado = ${expected}`);
    hasError = true;
  }
}

// Verifica glass (rgba — regex diferente)
const glassTokenMatch = tokensRaw.match(/glass:\s*'(rgba\([^)]+\))'/);
const glassTwMatch = tailwindRaw.match(/glass:\s*'(rgba\([^)]+\))'/);
if (glassTokenMatch && glassTwMatch) {
  if (glassTokenMatch[1] !== glassTwMatch[1]) {
    errors.push(`  ❌ surface.glass: tokens.ts = ${glassTokenMatch[1]}, tailwind.config.js = ${glassTwMatch[1]}`);
    hasError = true;
  }
} else {
  if (!glassTokenMatch) errors.push('  ❌ surface.glass: não encontrado em tokens.ts');
  if (!glassTwMatch) errors.push('  ❌ surface.glass: não encontrado em tailwind.config.js');
  hasError = true;
}

if (hasError) {
  console.error('\n⚠️  TOKEN DIVERGENCE DETECTED:\n');
  errors.forEach(e => console.error(e));
  console.error('\nCorrija os valores em tokens.ts, depois espelhe em tailwind.config.js.\n');
  process.exit(1);
} else {
  console.log('✅ All token values match between tokens.ts and tailwind.config.js');
}
