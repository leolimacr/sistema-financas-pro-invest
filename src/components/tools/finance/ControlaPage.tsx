import React from 'react';
import Dashboard from './Dashboard';
import type { Transaction, Category, UserMeta } from '../../../types';

interface ControlaPageProps {
  transactions: Transaction[];
  categories: Category[];
  isLoading: boolean;
  userMetaLoading?: boolean;
  isSyncing?: boolean;
  isStale?: boolean;
  onDeleteTransaction: (id: string) => void;
  onNavigate: (tool: string) => void;
  onOpenForm: (initialData?: Partial<Transaction>) => void;
  onSaveCategory: (category: any) => void;
  onDeleteCategory: (id: string, usageCount: number) => Promise<void>;
  userMeta: UserMeta | null | undefined;
  isPremium: boolean;
  isPrivacyMode: boolean;
  onTogglePrivacy: () => void;
  onEditTransaction: (t: Transaction) => void;
  fetchMonth?: (year: number, month: number) => Promise<void>;
}

export const ControlaPage: React.FC<ControlaPageProps> = (props) => {
  return <Dashboard {...props} />;
};
