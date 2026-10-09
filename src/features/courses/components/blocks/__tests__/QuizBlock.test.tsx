import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuizBlock from '../QuizBlock';

describe('QuizBlock — UX e Aprendizado Educativo', () => {
  const defaultProps = {
    question: 'Qual é o melhor investimento quando se tem dívidas no rotativo?',
    options: [
      'Comprar ações de empresas arriscadas',
      'Estancar e quitar a dívida do rotativo',
      'Manter o dinheiro na poupança',
    ],
    correctIndex: 1,
    feedbackCorrect: 'Correto! A dívida do rotativo destrói patrimônio.',
    feedbackIncorrect: 'Incorreto. Quitar juros altos sempre antecede qualquer aporte.',
  };

  it('permite responder corretamente e chama onCompleted', () => {
    const onCompleted = vi.fn();
    render(<QuizBlock {...defaultProps} onCompleted={onCompleted} />);

    const correctButton = screen.getByRole('button', { name: /Estancar e quitar a dívida/i });
    fireEvent.click(correctButton);

    expect(screen.getByText(/✓ Resposta Correta!/i)).toBeInTheDocument();
    expect(screen.getByText(defaultProps.feedbackCorrect)).toBeInTheDocument();
    expect(onCompleted).toHaveBeenCalledTimes(1);
  });

  it('exibe botão Tentar de Novo ao errar e não trava o usuário', () => {
    const onCompleted = vi.fn();
    render(<QuizBlock {...defaultProps} onCompleted={onCompleted} />);

    // Clica na opção errada
    const wrongButton = screen.getByRole('button', { name: /Comprar ações de empresas arriscadas/i });
    fireEvent.click(wrongButton);

    // Verifica feedback de erro e presença do botão de retry
    expect(screen.getByText(/✗ Quase lá.../i)).toBeInTheDocument();
    expect(screen.getByText(defaultProps.feedbackIncorrect)).toBeInTheDocument();
    expect(onCompleted).not.toHaveBeenCalled();

    const retryButton = screen.getByRole('button', { name: /Tentar de novo/i });
    expect(retryButton).toBeInTheDocument();

    // Clica em tentar de novo
    fireEvent.click(retryButton);

    // As opções voltam a ficar habilitadas
    const correctButton = screen.getByRole('button', { name: /Estancar e quitar a dívida/i });
    expect(correctButton).not.toBeDisabled();

    // Responde agora a certa
    fireEvent.click(correctButton);
    expect(screen.getByText(/✓ Resposta Correta!/i)).toBeInTheDocument();
    expect(onCompleted).toHaveBeenCalledTimes(1);
  });
});
