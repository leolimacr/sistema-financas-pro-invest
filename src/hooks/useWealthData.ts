import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, query, getDocs } from 'firebase/firestore';
import { firestore } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useGoals } from './useGoals';
import { useDebts } from '../services/debt/debt.hooks';
import { queryKeys } from '../core/query/queryKeys';
import type { ActiveAsset, PassiveAsset } from '../types';

const fetchAssets = async (userId: string): Promise<ActiveAsset[]> => {
  const snapshot = await getDocs(query(collection(firestore, `users/${userId}/ativos`)));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActiveAsset));
};

const fetchPassives = async (userId: string): Promise<PassiveAsset[]> => {
  const snapshot = await getDocs(query(collection(firestore, `users/${userId}/passivos`)));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PassiveAsset));
};

export const useWealthData = () => {
  const { user, userMeta } = useAuth();
  const uid = user?.uid;

  const keyAssets = queryKeys.wealth.assetsByUser(uid || 'anonymous');
  const keyPassives = queryKeys.wealth.passivesByUser(uid || 'anonymous');

  const { data: assets = [], isLoading: assetsLoading, isFetching: assetsFetching } = useQuery<ActiveAsset[], Error>({
    queryKey: keyAssets,
    queryFn: () => uid ? fetchAssets(uid) : Promise.resolve([]),
    enabled: !!uid,
    staleTime: 1000 * 60 * 5,
  });

  const { data: passives = [], isLoading: passivesLoading, isFetching: passivesFetching } = useQuery<PassiveAsset[], Error>({
    queryKey: keyPassives,
    queryFn: () => uid ? fetchPassives(uid) : Promise.resolve([]),
    enabled: !!uid,
    staleTime: 1000 * 60 * 5,
  });

  const { goals, loading: goalsLoading } = useGoals(uid);
  const { data: debts = [], isLoading: debtsLoading, isSyncing: debtsSyncing } = useDebts(uid);

  const isSyncing = assetsFetching || passivesFetching || debtsSyncing;
  const loading = assetsLoading || passivesLoading || goalsLoading || debtsLoading;

  // Calcula totais com lógica contábil corrigida
  const totalInvestments = useMemo(() => assets.reduce((sum, asset) => sum + (asset.currentValue || 0), 0), [assets]);
  const totalProperty = useMemo(() => passives.reduce((sum, pass) => sum + (pass.currentValue || 0), 0), [passives]);
  const totalDebts = useMemo(() => debts.reduce((sum, debt) => sum + (debt.saldoDevedor || 0), 0), [debts]);

  // Patrimônio Líquido = (Investimentos + Bens Patrimoniais) - Dívidas
  const totalAssets = totalInvestments + totalProperty;
  const patrimonioLiquido = totalAssets - totalDebts;

  // LÓGICA DE BALDES CFP (Novo)
  const financialProfile = userMeta?.financialProfile;
  const marcoZero = financialProfile?.marcoZero || 0;
  const reserveTarget = financialProfile?.emergencyReserveTarget || 0;
  const reserveCurrent = financialProfile?.emergencyReserveCurrent || 0;
  const colchaoInicialTarget = financialProfile?.colchaoInicialTarget || 0;
  const colchaoCurrent = financialProfile?.colchaoCurrent !== undefined && financialProfile?.colchaoCurrent !== null
    ? financialProfile.colchaoCurrent
    : (colchaoInicialTarget > 0 && marcoZero > colchaoInicialTarget ? colchaoInicialTarget : (marcoZero || colchaoInicialTarget));

  return {
    assets,
    passives,
    goals,
    debts,
    totalAssets,           
    totalInvestments,      
    totalProperty,         
    totalDebts,            
    patrimonioLiquido,
    // Novos campos de Baldes
    colchaoCurrent,
    marcoZero,
    reserveTarget,
    reserveCurrent,
    colchaoInicialTarget,
    financialProfile,
    loading,
    isSyncing,
  };
};