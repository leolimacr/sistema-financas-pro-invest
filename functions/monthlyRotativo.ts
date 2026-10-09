import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { computeInterestForDebt } from './rotativoMath';
import { createEvent } from './presenceHelpers';
import { prepareScheduledInterestRecord } from './rotativoInterestHistory';

function formatCompetence(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export const monthlyRotativoInterest = onSchedule(
  {
    schedule: '0 6 1 * *',
    timeZone: 'America/Sao_Paulo',
    timeoutSeconds: 300,
    memory: '256MiB',
  },
  async () => {
    const db = getFirestore();
    const now = new Date();
    const nowMs = now.getTime();
    const competence = formatCompetence(now);
    const startedAt = Timestamp.now();

    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let totalInterestApplied = 0;
    let notifiedUserCount = 0;
    const errors: string[] = [];

    logger.info(`[monthlyRotativoInterest] Iniciando competência ${competence}`);

    const rotativoSnap = await db.collectionGroup('dividas')
      .where('originType', '==', 'rotativo_cartao')
      .get();

    const userDebtsMap = new Map<string, typeof rotativoSnap.docs>();
    rotativoSnap.forEach(doc => {
      const uid = doc.ref.path.split('/')[1];
      if (!userDebtsMap.has(uid)) userDebtsMap.set(uid, []);
      userDebtsMap.get(uid)!.push(doc);
    });

    for (const [uid, debtDocs] of userDebtsMap) {
      let userInterestTotal = 0;
      let userDebtCount = 0;
      let userDebtNames: string[] = [];

      try {
        for (const debtDoc of debtDocs) {
          const data = debtDoc.data();
          const debtId = debtDoc.id;

          const debt = {
            id: debtId,
            originType: data.originType as string | undefined,
            saldoDevedor: (data.saldoDevedor as number) ?? 0,
            taxaMensal: (data.taxaMensal as number) ?? 0,
            lastInterestAppliedAt: data.lastInterestAppliedAt as string | undefined,
          };

          const result = computeInterestForDebt(debt, now);

          if (!result) {
            skippedCount++;
            continue;
          }

          try {
            await db.runTransaction(async (tx) => {
              const ref = db.collection('users').doc(uid).collection('dividas').doc(debtId);
              const snap = await tx.get(ref);

              if (!snap.exists) {
                errors.push(`${uid}/${debtId}: documento não encontrado na transação`);
                errorCount++;
                return;
              }

              const fresh = snap.data()!;
              const freshSaldo = (fresh.saldoDevedor as number) ?? 0;
              const freshTaxa = (fresh.taxaMensal as number) ?? 0;
              const freshLastApplied = fresh.lastInterestAppliedAt as string | undefined;

              if (fresh.originType !== 'rotativo_cartao') {
                skippedCount++;
                return;
              }
              if (freshSaldo <= 0 || freshTaxa <= 0) {
                skippedCount++;
                return;
              }

              const stillNeedsInterest = computeInterestForDebt(
                { id: debtId, originType: 'rotativo_cartao', saldoDevedor: freshSaldo, taxaMensal: freshTaxa, lastInterestAppliedAt: freshLastApplied },
                now,
              );

              if (!stillNeedsInterest) {
                skippedCount++;
                return;
              }

              tx.update(ref, {
                saldoDevedor: freshSaldo + stillNeedsInterest.interest,
                lastInterestAppliedAt: now.toISOString(),
              });

              const jurosRecord = prepareScheduledInterestRecord(db, uid, {
                debtId,
                debtName: (fresh.nome as string) ?? 'Rotativo',
                competence,
                principal: freshSaldo,
                taxaMensal: freshTaxa,
                interestAmount: stillNeedsInterest.interest,
                newBalance: freshSaldo + stillNeedsInterest.interest,
                monthsLost: stillNeedsInterest.monthsLost,
              });
              tx.set(jurosRecord.ref, jurosRecord.data);

              processedCount++;
              totalInterestApplied += stillNeedsInterest.interest;
              userInterestTotal += stillNeedsInterest.interest;
              userDebtCount++;
              if (data.nome && typeof data.nome === 'string') {
                userDebtNames.push(data.nome);
              }
            });
          } catch (txErr) {
            const msg = txErr instanceof Error ? txErr.message : String(txErr);
            errors.push(`${uid}/${debtId}: ${msg}`);
            errorCount++;
          }
        }

        if (userInterestTotal > 0) {
          const primaryName = userDebtNames[0] ?? 'dívida rotativa';
          const suffix = userDebtCount > 1
            ? ` e ${userDebtCount - 1} outra${userDebtCount - 1 > 1 ? 's' : ''} dívida${userDebtCount - 1 > 1 ? 's' : ''}`
            : '';

          await createEvent(db, uid, nowMs, {
            eventType: 'rotativo.interest_applied',
            persona: 'debts',
            urgency: 'medium',
            message: {
              title: 'Juros do rotativo aplicados',
              body: `R$ ${userInterestTotal.toFixed(2)} em juros foram aplicados ao saldo de ${primaryName}${suffix}.`,
              ctaLabel: 'Ver dívidas',
            },
            deepLink: '/minhas-dividas',
            channel: 'in_app',
            cooldownHours: 720,
            expiresInHours: 720,
            payload: {
              competence,
              totalInterest: Math.round(userInterestTotal * 100) / 100,
              debtCount: userDebtCount,
            },
          });

          notifiedUserCount++;
        }
      } catch (userErr) {
        const msg = userErr instanceof Error ? userErr.message : String(userErr);
        errors.push(`${uid}: ${msg}`);
        errorCount++;
      }
    }

    const finishedAt = Timestamp.now();
    const logEntry = {
      type: 'monthlyRotativoInterest',
      competence,
      startedAt,
      finishedAt,
      processedCount,
      skippedCount,
      errorCount,
      totalInterestApplied: Math.round(totalInterestApplied * 100) / 100,
      notifiedUserCount,
      errors: errors.length > 0 ? errors.slice(0, 50) : null,
    };

    await db.collection('_schedulerLogs').add(logEntry);

    logger.info(
      `[monthlyRotativoInterest] Concluído: ${processedCount} processadas, ` +
      `${skippedCount} ignoradas, ${errorCount} erros, ` +
      `R$ ${totalInterestApplied.toFixed(2)} em juros aplicados, ` +
      `${notifiedUserCount} usuários notificados`,
    );
  },
);
