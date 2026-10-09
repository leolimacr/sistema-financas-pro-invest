/**
 * Script de migração para adicionar campos de progresso às dívidas existentes
 * 
 * Execute no console do navegador (devtools) após login:
 * 
 * import { migrateDebtProgress } from './scripts/migrate-debt-progress';
 * await migrateDebtProgress();
 * 
 * Ou execute via Node.js com Firebase Admin SDK
 */

import { getDocs, collection, doc, updateDoc } from 'firebase/firestore';
import { firestore } from '../firebase';
import { getAuth } from 'firebase/auth';

interface DebtLegacy {
  id: string;
  saldoDevedor: number;
  parcelasRestantes: number;
  valorParcela: number;
  originType?: string;
}

export async function migrateDebtProgress(userId?: string): Promise<void> {
  const auth = getAuth();
  const currentUser = userId || auth.currentUser?.uid;
  
  if (!currentUser) {
    console.error('Usuário não autenticado. Faça login primeiro.');
    return;
  }

  console.log('Iniciando migração de progresso de dívidas para:', currentUser);
  
  const debtsCol = collection(firestore, 'users', currentUser, 'dividas');
  const snapshot = await getDocs(debtsCol);
  
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const debtDoc of snapshot.docs) {
    const data = debtDoc.data() as DebtLegacy;
    
    // Pular se já tem os novos campos
    if (data.totalParcelas !== undefined && data.parcelasPagas !== undefined) {
      console.log(`[SKIP] ${data.nome || debtDoc.id} - já migrado`);
      skipped++;
      continue;
    }

    // Pular dívidas rotativas (não usam parcelas fixas)
    if (data.originType === 'rotativo_cartao') {
      console.log(`[SKIP] ${data.nome || debtDoc.id} - dívida rotativa`);
      skipped++;
      continue;
    }

    const totalParcelas = data.parcelasRestantes; // Assumindo que nenhuma foi paga ainda
    const parcelasPagas = 0;

    try {
      const debtRef = doc(firestore, 'users', currentUser, 'dividas', debtDoc.id);
      await updateDoc(debtRef, {
        totalParcelas,
        parcelasPagas,
        historicoPagamentos: [],
      });
      
      console.log(`[OK] ${data.nome || debtDoc.id} - totalParcelas: ${totalParcelas}, parcelasPagas: ${parcelasPagas}`);
      updated++;
    } catch (error) {
      console.error(`[ERRO] ${data.nome || debtDoc.id}:`, error);
      errors++;
    }
  }

  console.log('\n=== Resumo da Migração ===');
  console.log(`Atualizadas: ${updated}`);
  console.log(`Ignoradas: ${skipped}`);
  console.log(`Erros: ${errors}`);
  console.log(`Total: ${snapshot.docs.length}`);
}

// Auto-executar se chamado diretamente no console
if (typeof window !== 'undefined') {
  (window as any).migrateDebtProgress = migrateDebtProgress;
  console.log('Função migrateDebtProgress disponível no window. Execute: migrateDebtProgress()');
}

export default migrateDebtProgress;