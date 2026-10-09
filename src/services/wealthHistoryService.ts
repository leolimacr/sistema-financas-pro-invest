import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  where, 
  limit, 
  Timestamp,
  serverTimestamp,
  doc,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { firestore } from '../firebase';
import { getLocalDateString } from '../utils/dateHelpers';

export interface WealthSnapshot {
  id?: string;
  userId: string;
  totalNetWorth: number;
  totalAssets: number;
  totalInvestments: number; // Apenas Financeiro
  totalProperty: number;    // Apenas Bens
  totalDebts: number;
  timestamp: any;
  date: string; // YYYY-MM-DD for easy grouping
  isReal: boolean;
  validatedModules?: {
    investments?: boolean;
    property?: boolean;
    debts?: boolean;
  };
}

/**
 * Salva ou atualiza um snapshot do patrimônio para o dia atual.
 */
export const saveWealthSnapshot = async (userId: string, data: {
  totalNetWorth: number;
  totalAssets: number;
  totalInvestments: number;
  totalProperty: number;
  totalDebts: number;
  module?: 'investments' | 'property' | 'debts';
}) => {
  const date = getLocalDateString();
  const snapshotsRef = collection(firestore, `users/${userId}/patrimonio_historico`);
  
  // Verifica se já existe um snapshot para hoje
  const q = query(snapshotsRef, where('date', '==', date), limit(1));
  const querySnapshot = await getDocs(q);

  const { module, ...wealthData } = data;
  const validatedModules = module ? { [module]: true } : {};

  if (!querySnapshot.empty) {
    // Atualiza o existente
    const existingDoc = querySnapshot.docs[0];
    const docRef = doc(firestore, `users/${userId}/patrimonio_historico`, existingDoc.id);
    const existingData = existingDoc.data() as WealthSnapshot;
    
    return await setDoc(docRef, {
      ...wealthData,
      timestamp: serverTimestamp(),
      date,
      isReal: true,
      validatedModules: {
        ...(existingData.validatedModules || {}),
        ...validatedModules
      }
    }, { merge: true });
  }

  // Cria um novo
  return await addDoc(snapshotsRef, {
    userId,
    ...wealthData,
    timestamp: serverTimestamp(),
    date,
    isReal: true,
    validatedModules
  });
};

/**
 * Busca o histórico de snapshots.
 */
export const getWealthHistory = async (userId: string, limitCount = 12): Promise<WealthSnapshot[]> => {
  const snapshotsRef = collection(firestore, `users/${userId}/patrimonio_historico`);
  const q = query(snapshotsRef, orderBy('date', 'desc'), limit(limitCount));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as WealthSnapshot)).reverse(); // Retorna em ordem cronológica
};

/**
 * Busca o último snapshot realizado.
 */
export const getLastSnapshot = async (userId: string): Promise<WealthSnapshot | null> => {
  const snapshotsRef = collection(firestore, `users/${userId}/patrimonio_historico`);
  const q = query(snapshotsRef, orderBy('date', 'desc'), limit(1));
  
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  
  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data()
  } as WealthSnapshot;
};
