import type { NexusInsight } from './nexusInsightEngine';
import { getPersonaVoice } from './personaService';
import type { Archetype } from '../types';

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

function interpolate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
  }
  return result;
}

const CURRENCY_VARS = ['value', 'diff', 'jump', 'amount', 'newSaldo', 'previousSaldo', 'remainingAmount'];
// Vars textuais (nomes, datas como cardName/dueDate): repassadas sem formatação.

export function prepareEventInsight(
  raw: NexusInsight,
  templateVars: Record<string, number | string>,
  archetype: Archetype = 'guardian',
): NexusInsight {
  const voice = getPersonaVoice(archetype);

  const formatted: Record<string, string> = {};
  for (const [key, val] of Object.entries(templateVars)) {
    if (CURRENCY_VARS.includes(key) && typeof val === 'number') {
      formatted[key] = fmt(val);
    } else {
      formatted[key] = String(val);
    }
  }
  formatted.prefix = voice.prefix;

  return {
    ...raw,
    message: {
      ...raw.message,
      body: interpolate(raw.message.body, formatted),
    },
    style: { brandColor: voice.color },
  };
}
