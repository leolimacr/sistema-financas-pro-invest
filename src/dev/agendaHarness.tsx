import { createRoot } from 'react-dom/client';
import { useMemo, useState, useEffect } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { AgendaCommitment } from '../services/agendaService';
import { AgendaHub } from '../components/AgendaHub';
import { AuthContext } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import { shiftMonth } from '../agenda/monthMath';
import '../index.css';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// Seed determinístico: um "selo" com o nome do mês em cada mês do intervalo,
// para que qualquer extensão da DOM seja visível pelos marcadores. Span amplo
// (-10..+10 meses) para sustentar flushes longos sem esgotar os dados.
function buildSeed(): AgendaCommitment[] {
  const out: AgendaCommitment[] = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let offset = -10; offset <= 10; offset++) {
    const { year, month } = shiftMonth(today.getFullYear(), today.getMonth(), offset);
    const marker = `${MONTHS[month]} ${year}`;
    out.push({
      id: `seed-${year}-${month}-a`,
      date: Timestamp.fromDate(new Date(year, month, 5)),
      title: `Selo ${marker} · marco A (dia 5)`,
      time: '09:00',
      completed: false,
    });
    out.push({
      id: `seed-${year}-${month}-b`,
      date: Timestamp.fromDate(new Date(year, month, 18)),
      title: `Selo ${marker} · marco B (dia 18)`,
      time: '14:30',
      completed: false,
    });
  }
  const longDate = new Date(today.getFullYear(), today.getMonth() + 1, 12);
  out.push({
    id: 'seed-multiline',
    date: Timestamp.fromDate(longDate),
    title: 'Compromisso multilinha de validação — título deliberadamente longo o bastante para quebrar em mais de uma faixa ' +
      'e exercitar a medição de linhas com a régua fixa da agenda, confirmando o comportamento do caderno pautado.',
    time: '18:00',
    completed: false,
  });
  // Cluster de mesmo dia (hoje): vários compromissos sem horário para exercitar
  // a reordenação manual (setas ▲/▼) — o segundo adicionado não pode virar o
  // primeiro; o fallback legado ordena por createdAt antes da 1ª reordenação.
  const clusterDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  out.push({
    id: 'seed-cluster-1',
    date: Timestamp.fromDate(clusterDay),
    title: 'Cluster mesmo dia — primeiro (mais antigo)',
    completed: false,
  });
  out.push({
    id: 'seed-cluster-2',
    date: Timestamp.fromDate(clusterDay),
    title: 'Cluster mesmo dia — segundo (deve vir depois)',
    completed: false,
  });
  out.push({
    id: 'seed-cluster-3',
    date: Timestamp.fromDate(clusterDay),
    title: 'Cluster mesmo dia — terceiro',
    time: '17:00',
    completed: false,
  });
  return out;
}

const authValue = {
  user: { uid: 'dev-harness' } as unknown as User,
  userMeta: null,
  userMetaLoading: false,
  isAuthenticated: true,
  loading: false,
  logout: async () => {},
};

// HUD de observação: contagem de seções mensais na DOM + mês ativo no cabeçalho.
// Só existe nesta página de desenvolvimento (nunca entra no build de produção).
function StatusPanel() {
  const [stats, setStats] = useState({ sections: 0, active: '' });
  useEffect(() => {
    const refresh = () => {
      const sections = document.querySelectorAll('[data-month-section]').length;
      const label = document.querySelector('[data-testid="agenda-month-label"]');
      setStats({ sections, active: label?.textContent?.trim() ?? '' });
    };
    refresh();
    const id = window.setInterval(refresh, 400);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div
      style={{
        position: 'fixed', right: 12, bottom: 12, zIndex: 9999,
        background: '#0f172a', color: '#e2e8f0', borderRadius: 8,
        padding: '8px 10px', fontFamily: 'ui-monospace, monospace',
        fontSize: 12, lineHeight: 1.6,
      }}
    >
      <div>Meses na DOM: {stats.sections}</div>
      <div>Mês ativo: {stats.active || '—'}</div>
    </div>
  );
}

function Harness() {
  const seed = useMemo(() => buildSeed(), []);
  return (
    <AuthContext.Provider value={authValue}>
      <ToastProvider>
        <MemoryRouter>
          <div className="min-h-screen bg-slate-100">
            <div
              className="h-16 bg-white border-b border-slate-200 flex items-center px-4"
              style={{ position: 'sticky', top: 0, zIndex: 100 }}
            >
              <span className="text-sm font-black uppercase tracking-tight text-slate-900">
                dev-agenda · AgendaHub
              </span>
              <span className="ml-3 text-[11px] text-slate-500">
                seed em memória · sem Firebase
              </span>
            </div>
            <AgendaHub seedCommitments={seed} />
          </div>
          <StatusPanel />
        </MemoryRouter>
      </ToastProvider>
    </AuthContext.Provider>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(<Harness />);
