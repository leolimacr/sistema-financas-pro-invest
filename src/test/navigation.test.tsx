import { render, screen, fireEvent } from './test-utils';
import { describe, it, expect } from 'vitest';
import React from 'react';
import { useNavigation } from '../hooks/useNavigation';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const NavigationTester = () => {
  const { handleNavigate } = useNavigation();
  return (
    <div>
      <button onClick={() => handleNavigate('manager')}>Ir para Controla</button>
      <Routes>
        <Route path="/app/central" element={<div>Central Page</div>} />
        <Route path="/app/controla" element={<div>Controla Dashboard</div>} />
      </Routes>
    </div>
  );
};

describe('Navegação (T6)', () => {
  it('navega para a rota correta ao chamar handleNavigate', () => {
    render(
      <MemoryRouter initialEntries={['/app/central']}>
        <NavigationTester />
      </MemoryRouter>
    );

    expect(screen.getByText('Central Page')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Ir para Controla'));
    
    expect(screen.getByText('Controla Dashboard')).toBeInTheDocument();
  });
});
