import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ExplorarHub } from '../ExplorarHub';
import { TOOL_ROUTES } from '../../hooks/useNavigation';

vi.mock('../../services/newsService', () => ({
  getLatestNews: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../services/marketService', () => ({
  fetchMarketQuotes: vi.fn(() => Promise.resolve({ quotes: [] })),
}));

vi.mock('../Home/HomeConteudo', () => ({
  HomeConteudo: () => <div data-testid="home-conteudo" />,
}));

vi.mock('../Home/HomeTerminalMercado', () => ({
  HomeTerminalMercado: () => <div data-testid="home-terminal-mercado" />,
}));

vi.mock('../Public/MarketComponents', () => ({
  InfiniteTicker: () => <div data-testid="infinite-ticker" />,
}));

vi.mock('../Public/HomeModals', () => ({
  AssetModal: () => <div data-testid="asset-modal" />,
}));

const TOOL_IDS = Object.keys(TOOL_ROUTES).filter((id) => id.startsWith('tool-'));

function toolSectionButtons() {
  const heading = screen.getByText('Ferramentas de Apoio');
  const section = heading.closest('section') as HTMLElement;
  return within(section).getAllByRole('button');
}

describe('ExplorarHub (Etapa 6 — E6-02 contrato tool-*)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('seção de ferramentas tem exatamente uma entrada por rota tool- de TOOL_ROUTES', () => {
    render(<ExplorarHub onNavigate={vi.fn()} routerNavigate={vi.fn()} />);
    expect(TOOL_IDS.length).toBeGreaterThan(0);
    expect(toolSectionButtons()).toHaveLength(TOOL_IDS.length);
  });

  it('cada botão navega com o id exato da rota (cobertura total, sem sobras)', () => {
    const onNavigate = vi.fn();
    render(<ExplorarHub onNavigate={onNavigate} routerNavigate={vi.fn()} />);
    for (const btn of toolSectionButtons()) {
      fireEvent.click(btn);
    }
    const calledIds = onNavigate.mock.calls.map(([id]) => id as string);
    expect([...calledIds].sort()).toEqual([...TOOL_IDS].sort());
  });
});

describe('ExplorarHub (Etapa 6 — E6-06 sem barra fixa)', () => {
  it('não registra listener de scroll na window', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    render(<ExplorarHub onNavigate={vi.fn()} routerNavigate={vi.fn()} />);
    expect(addSpy.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(0);
    addSpy.mockRestore();
  });
});

describe('ExplorarHub (Fase 5 — F5.2.2 Filtros Rápidos)', () => {
  it('filtra seções ao clicar nos chips de categoria', () => {
    render(<ExplorarHub onNavigate={vi.fn()} routerNavigate={vi.fn()} />);

    // Inicialmente no modo "Todos": ferramentas, educação e inteligência de mercado estão presentes
    expect(screen.getByText('Ferramentas de Apoio')).toBeInTheDocument();
    expect(screen.getByText('Educação e Estratégia')).toBeInTheDocument();
    expect(screen.getByText('Inteligência de Mercado')).toBeInTheDocument();

    // Clica no filtro "Ferramentas de Decisão"
    const ferramentasTab = screen.getByRole('tab', { name: /Ferramentas de Decisão/i });
    fireEvent.click(ferramentasTab);

    expect(screen.getByText('Ferramentas de Apoio')).toBeInTheDocument();
    expect(screen.queryByText('Educação e Estratégia')).toBeNull();
    expect(screen.queryByText('Inteligência de Mercado')).toBeNull();

    // Clica no filtro "Formação & Cursos"
    const cursosTab = screen.getByRole('tab', { name: /Formação & Cursos/i });
    fireEvent.click(cursosTab);

    expect(screen.queryByText('Ferramentas de Apoio')).toBeNull();
    expect(screen.getByText('Educação e Estratégia')).toBeInTheDocument();
    expect(screen.queryByText('Inteligência de Mercado')).toBeNull();

    // Retorna para "Todos"
    const todosTab = screen.getByRole('tab', { name: /^Todos/i });
    fireEvent.click(todosTab);

    expect(screen.getByText('Ferramentas de Apoio')).toBeInTheDocument();
    expect(screen.getByText('Educação e Estratégia')).toBeInTheDocument();
    expect(screen.getByText('Inteligência de Mercado')).toBeInTheDocument();
  });
});

