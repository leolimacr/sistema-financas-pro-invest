/**
 * Script de migração para adicionar adjustmentConfig às dívidas existentes
 * 
 * CONVERTE dívidas legadas (parcela fixa) para o novo schema:
 * - adjustmentConfig.type = 'fixed'
 * - adjustmentConfig.series = [série única com parcelas restantes]
 * - adjustmentConfig.frequency = 'monthly'
 * - currentSeriesIndex = 0
 * - nextAdjustmentDate = null
 * 
 * IDEMPOTENTE: pula dívidas que já têm adjustmentConfig
 * 
 * Execute no console do navegador (devtools) após login:
 * 
 * import { migrateDebtAdjustment } from './scripts/migrate-debt-adjustment';
 * await migrateDebtAdjustment();
 * 
 * Ou execute via Node.js com Firebase Admin SDK
 */

import { getDocs, collection, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { firestore } from '../firebase';
import { getAuth } from 'firebase/auth';

interface DebtLegacy {
  id: string;
  nome: string;
  saldoDevedor: number;
  parcelasRestantes: number;
  valorParcela: number;
  originType?: string;
  totalParcelas?: number;
  parcelasPagas?: number;
  adjustmentConfig?: any;
}

export async function migrateDebtAdjustment(userId?: string): Promise<void> {
  const auth = getAuth();
  const currentUser = userId || auth.currentUser?.uid;
  
  if (!currentUser) {
    console.error('Usuário não autenticado. Faça login primeiro.');
    return;
  }

  console.log('Iniciando migração de adjustmentConfig para:', currentUser);
  
  const debtsCol = collection(firestore, 'users', currentUser, 'dividas');
  const snapshot = await getDocs(debtsCol);
  
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  const batch = writeBatch(firestore);
  let batchCount = 0;

  for (const debtDoc of snapshot.docs) {
    const data = debtDoc.data() as DebtLegacy;
    
    // IDÊNCIA: Pular se já tem adjustmentConfig
    if (data.adjustmentConfig !== undefined) {
      console.log(`[SKIP] ${data.nome || debtDoc.id} - já migrado (tem adjustmentConfig)`);
      skipped++;
      continue;
    }

    // Pular dívidas rotativas (não usam parcelas fixas/séries)
    if (data.originType === 'rotativo_cartao') {
      console.log(`[SKIP] ${data.nome || debtDoc.id} - dívida rotativa`);
      skipped++;
      continue;
    }

    // Verificar se tem campos mínimos
    if (!data.valorParcela || !data.parcelasRestantes) {
      console.log(`[SKIP] ${data.nome || debtDoc.id} - campos insuficientes`);
      skipped++;
      continue;
    }

    const totalParcelas = data.totalParcelas ?? data.parcelasRestantes + (data.parcelasPagas ?? 0);
    const parcelasPagas = data.parcelasPagas ?? 0;

    try {
      const debtRef = doc(firestore, 'users', currentUser, 'dividas', debtDoc.id);
      
      const adjustmentConfig = {
        type: 'fixed' as const,
        series: [{
          id: `${debtDoc.id}-series-1`,
          year: new Date().getFullYear(),
          startMonth: 1,
          installmentsCount: data.parcelasRestantes,
          installmentValue: data.valorParcela,
        }],
        frequency: 'monthly' as const,
      };

      batch.update(debtRef, {
        totalParcelas,
        parcelasPagas,
        adjustmentConfig,
        currentSeriesIndex: 0,
        nextAdjustmentDate: null,
        historicoPagamentos: data.historicoPagamentos || [],
        updatedAt: new Date(),
      });
      
      batchCount++;
      console.log(`[QUEUED] ${data.nome || debtDoc.id} - ${data.parcelasRestantes} parcelas de R$ ${data.valorParcela.toFixed(2)}`);

      // Commit batch a cada 400 operações (limite do Firestore)
      if (batchCount >= 400) {
        await batch.commit();
        updated += batchCount;
        batchCount = 0;
        console.log(`  → Batch commitado (${updated} até agora)`);
      }
    } catch (error) {
      console.error(`[ERRO] ${data.nome || debtDoc.id}:`, error);
      errors++;
    }
  }

  // Commit final do batch restante
  if (batchCount > 0) {
    await batch.commit();
    updated += batchCount;
  }

  console.log('\n=== Resumo da Migração ===');
  console.log(`Atualizadas: ${updated}`);
  console.log(`Ignoradas: ${skipped}`);
  console.log(`Erros: ${errors}`);
  console.log(`Total processado: ${snapshot.docs.length}`);
}

// Auto-executar se chamado diretamente no console
if (typeof window !== 'undefined') {
  (window as any).migrateDebtAdjustment = migrateDebtAdjustment;
  console.log('Função migrateDebtAdjustment disponível no window. Execute: migrateDebtAdjustment()');
}

export default migrateDebtAdjustment;