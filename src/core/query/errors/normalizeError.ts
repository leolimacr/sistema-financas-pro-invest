import { AppError } from './AppError';

export const normalizeError = (error: unknown, domain: string): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  // Normalização específica para Firebase, se necessário
  const message = error instanceof Error ? error.message : 'Ocorreu um erro inesperado';
  
  return new AppError(
    'UNKNOWN_ERROR',
    message,
    domain,
    false,
    error
  );
};
