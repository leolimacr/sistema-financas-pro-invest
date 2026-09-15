import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { courseRoutes } from '../../../routes/courseRoutes';

describe('Course Routing & Lesson Launching', () => {
  it('renderiza o curso Investidor Soberano quando o slug é investidor-iniciante', () => {
    render(
      <MemoryRouter initialEntries={['/curso/investidor-iniciante']}>
        <Routes>
          <Route path="/curso/*" element={<Routes>{courseRoutes}</Routes>} />
        </Routes>
      </MemoryRouter>
    );

    expect(
      screen.getByRole('heading', { name: /Investidor Soberano/i })
    ).toBeInTheDocument();
    expect(screen.queryByText(/Plano Realista para Sair das Dívidas/i)).not.toBeInTheDocument();
  });

  it('renderiza o curso de Dívidas quando o slug é dividas', () => {
    render(
      <MemoryRouter initialEntries={['/curso/dividas']}>
        <Routes>
          <Route path="/curso/*" element={<Routes>{courseRoutes}</Routes>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Plano Realista para Sair das Dívidas/i)).toBeInTheDocument();
    expect(screen.queryByText(/Investidor Soberano/i)).not.toBeInTheDocument();
  });

  it('inicia e renderiza com sucesso uma aula específica em LessonPage', () => {
    render(
      <MemoryRouter
        initialEntries={[
          '/curso/investidor-iniciante/modulo/o-pre-requisito-sagrado-dividas-zero/aula/a-matematica-inegociavel-por-que-e-proibido-investir-devendo',
        ]}
      >
        <Routes>
          <Route path="/curso/*" element={<Routes>{courseRoutes}</Routes>} />
        </Routes>
      </MemoryRouter>
    );

    // Deve exibir o título da aula e seu conteúdo
    expect(
      screen.getByRole('heading', {
        name: /A Matemática Inegociável: Por Que É Proibido Investir Devendo/i,
      })
    ).toBeInTheDocument();

    // Deve exibir os blocos ricos pedagógicos (Princípio e Estudo de Caso)
    expect(screen.getByText(/A Ordem dos Fatores Financeiros/i)).toBeInTheDocument();
    expect(screen.getByText(/O Investidor Iludido vs. O Estrategista Soberano/i)).toBeInTheDocument();
  });
});
