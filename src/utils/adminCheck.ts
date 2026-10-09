import type { UserMeta } from '../types';

/**
 * Verifica de forma limpa e desacoplada se o usuário atual possui privilégios de administrador,
 * sem expor e-mails ou identidades pessoais no código client-side do aplicativo.
 */
export const isSystemAdmin = (userMeta: UserMeta | null | undefined): boolean => {
  if (!userMeta) return false;
  if (userMeta.isAdmin === true || userMeta.role === 'admin') return true;
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL as string | undefined;
  if (adminEmail && userMeta.email && userMeta.email.toLowerCase().trim() === adminEmail.toLowerCase().trim()) {
    return true;
  }
  return false;
};
