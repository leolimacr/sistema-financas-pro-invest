import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AdminUsersModal } from '../AdminUsersModal';
import * as adminUsersService from '../../../services/adminUsersService';

vi.mock('../../../services/adminUsersService');

describe('AdminUsersModal (Painel Soberano de Usuários & Abandono)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não renderiza nada quando isOpen for false', () => {
    const { container } = render(
      <AdminUsersModal isOpen={false} onClose={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza título soberano e métricas quando aberto', async () => {
    vi.mocked(adminUsersService.fetchAdminUsers).mockResolvedValue({
      success: true,
      summary: {
        totalUsers: 3,
        byTier: { free: 1, pro: 1, premium: 1 },
        activeUsers: 2,
        inactiveUsers: 1,
        abandonedCount: 1,
        averageAbandonmentScore: 2.3,
      },
      users: [
        {
          uid: 'u_pleno',
          email: 'pleno@teste.com',
          displayName: 'Carlos Pleno',
          tier: 'premium',
          billingStatus: 'active',
          billingCycle: 'monthly',
          planName: 'Plano Premium',
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
          daysSinceLastActive: 0,
          launchCount: 42,
          hasFinancialProfile: true,
          onboardingCompleted: true,
          abandonmentScore: 0,
          abandonmentLabel: 'Usuário Pleno',
          isActive: true,
        },
        {
          uid: 'u_abandonado',
          email: 'abandonado@teste.com',
          displayName: 'Antônio Inativo',
          tier: 'free',
          billingStatus: null,
          billingCycle: null,
          planName: 'Gratuito',
          createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          lastActiveAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
          daysSinceLastActive: 35,
          launchCount: 1,
          hasFinancialProfile: false,
          onboardingCompleted: false,
          abandonmentScore: 6,
          abandonmentLabel: 'Abandono Pleno (30d+)',
          isActive: false,
        },
      ],
    });

    render(<AdminUsersModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByText(/Painel Soberano de Usuários/i)).toBeInTheDocument();
    expect(screen.getByText(/Exclusivo Leo/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Carlos Pleno')).toBeInTheDocument();
      expect(screen.getByText('pleno@teste.com')).toBeInTheDocument();
      expect(screen.getByText(/Grau 0 • Usuário Pleno/i)).toBeInTheDocument();
      expect(screen.getByText('Antônio Inativo')).toBeInTheDocument();
      expect(screen.getByText(/Grau 6 • Abandono Pleno/i)).toBeInTheDocument();

      // Validação do cabeçalho estático (sticky top-0)
      const tableHead = screen.getByText('Usuário').closest('thead');
      expect(tableHead).toHaveClass('sticky');
      expect(tableHead).toHaveClass('top-0');
    });
  });
});
