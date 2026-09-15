import type {
    DocumentData,
    CollectionReference} from 'firebase/firestore';
import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc
  } from 'firebase/firestore';
  import { firestore } from '../firebase';
  import { queryClient } from '../core/query/queryClient';
  import { queryKeys } from '../core/query/queryKeys';
  import type { CreditCard } from '../types';
  
  const getCardsCollection = (userId: string): CollectionReference<DocumentData> => {
    return collection(firestore, `users/${userId}/cartoes`);
  };
  
  /**
   * Adiciona um novo cartão nominal para o usuário.
   */
  export const addCard = async (
    userId: string,
    name: string,
    closingDay?: number,
    dueDay?: number,
    limit?: number,
    taxaJuros?: number,
    cardType?: string,
    voucherBalance?: number,
    voucherType?: string
  ): Promise<string> => {
    const data: Record<string, any> = { 
      name, 
      isActive: true,
      type: cardType || 'credit',
    };
    if (closingDay !== undefined) data.closingDay = closingDay;
    if (dueDay !== undefined) data.dueDay = dueDay;
    if (limit !== undefined) data.limit = limit || 0;
    if (taxaJuros !== undefined) data.taxaJuros = taxaJuros;
    if (voucherBalance !== undefined) data.voucherBalance = voucherBalance;
    if (voucherType !== undefined) data.voucherType = voucherType;
    if (cardType === 'voucher' && voucherBalance !== undefined) data.saldoUtilizadoTotal = 0;
    const docRef = await addDoc(getCardsCollection(userId), data);
    queryClient.invalidateQueries({ queryKey: queryKeys.cards.byUser(userId) });
    return docRef.id;
  };
  
  /**
   * Recupera a lista de cartões cadastrados pelo usuário.
   */
  export const getCards = async (userId: string): Promise<CreditCard[]> => {
    const querySnapshot = await getDocs(getCardsCollection(userId));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CreditCard[];
  };

  /**
   * Atualiza as informações de um cartão.
   */
  export const updateCard = async (userId: string, cardId: string, data: Partial<CreditCard>): Promise<void> => {
    const cardRef = doc(firestore, `users/${userId}/cartoes`, cardId);
    await updateDoc(cardRef, data);
    queryClient.invalidateQueries({ queryKey: queryKeys.cards.byUser(userId) });
  };

  /**
   * Remove um cartão.
   */
  export const deleteCard = async (userId: string, cardId: string): Promise<void> => {
    const cardRef = doc(firestore, `users/${userId}/cartoes`, cardId);
    await deleteDoc(cardRef);
    queryClient.invalidateQueries({ queryKey: queryKeys.cards.byUser(userId) });
  };
