import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  getDocs,
  Timestamp,
  orderBy,
  limit,
} from 'firebase/firestore';
import { firestore } from '../firebase';

export type Frequencia = 'semanal' | 'quinzenal' | 'mensal' | 'personalizado';

export interface Goal {
  id?: string;
  userId: string;
  nome?: string;
  title?: string; // Título da meta
  targetDate?: Timestamp | string | null; // Data alvo
  targetAmount?: number; // Valor alvo total
  currentAmount?: number; // Valor atual acumulado
  valor: number; // valor do aporte
  frequencia: Frequencia;
  diasPersonalizado?: number; // se frequencia = personalizado
  dataInicio: Timestamp; // data de início da meta (primeiro aporte)
  dataFim?: Timestamp; // opcional, para meta com data final
  ativa: boolean;
  type?: 'nexus_reserve' | 'custom';
  lembretes: {
    cincoDias: boolean;
    vespera: boolean;
    dia: boolean;
    canal: 'email' | 'push' | 'ambos';
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Criar uma nova meta
export const createGoal = async (userId: string, goalData: Omit<Goal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
  try {
    const now = Timestamp.now();
    const goalRef = collection(firestore, `users/${userId}/metas`);

    // Remove campos undefined para evitar erro no Firestore
    const cleanedData = Object.fromEntries(
      Object.entries(goalData).filter(([_, v]) => v !== undefined)
    );

    const newGoal = {
      ...cleanedData,
      userId,
      createdAt: now,
      updatedAt: now,
    };
    const docRef = await addDoc(goalRef, newGoal);
    return { id: docRef.id, ...newGoal };
  } catch (error) {
    console.error('Erro ao criar meta:', error);
    throw error;
  }
};

// Atualizar uma meta existente
export const updateGoal = async (userId: string, goalId: string, updates: Partial<Goal>) => {
  try {
    const goalRef = doc(firestore, `users/${userId}/metas`, goalId);

    // Remove campos undefined para evitar erro no Firestore
    const cleanedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await updateDoc(goalRef, {
      ...cleanedUpdates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Erro ao atualizar meta:', error);
    throw error;
  }
};
// Excluir uma meta
export const deleteGoal = async (userId: string, goalId: string) => {
  try {
    const goalRef = doc(firestore, `users/${userId}/metas`, goalId);
    await deleteDoc(goalRef);
  } catch (error) {
    console.error('Erro ao excluir meta:', error);
    throw error;
  }
};

// Buscar todas as metas de um usuário
export const fetchGoals = async (userId: string): Promise<Goal[]> => {
  try {
    const goalsRef = collection(firestore, `users/${userId}/metas`);
    const q = query(goalsRef, orderBy('createdAt', 'desc'), limit(100));
    const querySnapshot = await getDocs(q);
    const goals: Goal[] = [];
    querySnapshot.forEach((doc) => {
      goals.push({ id: doc.id, ...doc.data() } as Goal);
    });
    return goals;
  } catch (error) {
    console.error('Erro ao buscar metas:', error);
    throw error;
  }
};

// Buscar apenas metas ativas
export const fetchActiveGoals = async (userId: string): Promise<Goal[]> => {
  try {
    const goalsRef = collection(firestore, `users/${userId}/metas`);
    const q = query(goalsRef, where('ativa', '==', true), orderBy('createdAt', 'desc'), limit(100));
    const querySnapshot = await getDocs(q);
    const goals: Goal[] = [];
    querySnapshot.forEach((doc) => {
      goals.push({ id: doc.id, ...doc.data() } as Goal);
    });
    return goals;
  } catch (error) {
    console.error('Erro ao buscar metas ativas:', error);
    throw error;
  }
};

export const createNexusReserve = async (
  userId: string,
  title: string,
  amount: number,
  dueDate: string
): Promise<any> => {
  return createGoal(userId, {
    title: `Reserva: ${title}`,
    targetAmount: amount,
    targetDate: dueDate,
    valor: amount,
    frequencia: 'mensal',
    ativa: true,
    type: 'nexus_reserve',
    dataInicio: Timestamp.now(),
    lembretes: {
      cincoDias: false,
      vespera: true,
      dia: true,
      canal: 'push',
    },
  });
};