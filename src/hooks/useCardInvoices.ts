import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../core/query/queryKeys';
import { getInvoicesByCard, getAllInvoices } from '../services/invoiceService';
import type { CardInvoice } from '../types';

export const useCardInvoices = (userId: string | undefined, cardId: string | undefined) => {
  const key = queryKeys.invoices.byCard(userId || 'anonymous', cardId || 'none');

  const { data: invoices = [], isLoading, error } = useQuery<CardInvoice[], Error>({
    queryKey: key,
    queryFn: () => (userId && cardId) ? getInvoicesByCard(userId, cardId) : Promise.resolve([]),
    enabled: !!userId && !!cardId,
    staleTime: 1000 * 60 * 2,
  });

  return {
    invoices,
    isLoading,
    error,
  };
};

export const useInvoicesByUser = (userId: string | undefined) => {
  const key = queryKeys.invoices.byUser(userId || 'anonymous');

  const { data: invoices = [], isLoading } = useQuery<CardInvoice[], Error>({
    queryKey: key,
    queryFn: () => userId ? getAllInvoices(userId) : Promise.resolve([]),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });

  return {
    invoices,
    isLoading,
  };
};
