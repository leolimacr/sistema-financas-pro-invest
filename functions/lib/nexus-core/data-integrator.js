"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_GOALS_LISTED = exports.MAX_PROMPT_SEGMENT_CHARS = exports.NEXUS_TX_CAPS = exports.DataIntegrator = void 0;
exports.txCapsByPlan = txCapsByPlan;
exports.truncatePromptSegment = truncatePromptSegment;
const database_1 = require("firebase-admin/database");
const firestore_1 = require("firebase-admin/firestore");
const logger = __importStar(require("firebase-functions/logger"));
class DataIntegrator {
    static async gatherUserData(userId, userPlan) {
        const timeoutMs = 3000;
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error(`DataIntegrator timeout global`)), timeoutMs));
        const dataPromise = (async () => {
            let goals = [];
            let transactions = [];
            let simulations = [];
            let financialProfile = undefined;
            let summary = '';
            let hasData = false;
            let dataStatus = 'ok';
            let error = undefined;
            try {
                logger.info(`[DataIntegrator] Iniciando coleta para userId: ${userId}`);
                const [txs, glds, userDoc] = await Promise.all([
                    this.fetchRecentTransactionsWithTimeout(userId, 2500, userPlan),
                    this.fetchUserGoalsWithTimeout(userId, 2500),
                    (0, firestore_1.getFirestore)().doc(`users/${userId}`).get()
                ]);
                transactions = txs;
                goals = glds;
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    financialProfile = userData?.financialProfile;
                }
                const totalItems = goals.length + transactions.length;
                hasData = totalItems > 0;
                dataStatus = hasData ? 'ok' : 'empty';
                summary = this.generateDataSummary(goals, transactions, simulations, financialProfile);
                logger.info(`[DataIntegrator] Sucesso. userId=${userId}, transações=${transactions.length}, metas=${goals.length}, status=${dataStatus}`);
            }
            catch (err) {
                logger.error('[DataIntegrator] Erro crítico no fluxo:', err);
                dataStatus = 'error';
                error = err.message;
                summary = 'Erro técnico ao acessar os dados.';
            }
            return { goals, recentTransactions: transactions, simulations, summary, hasData, dataStatus, error, financialProfile };
        })();
        try {
            return await Promise.race([dataPromise, timeoutPromise]);
        }
        catch (timeoutError) {
            logger.error('[DataIntegrator] Abortado por timeout global.');
            return {
                goals: [],
                recentTransactions: [],
                simulations: [],
                summary: 'Sistema de dados lento.',
                hasData: false,
                dataStatus: 'error',
                error: 'timeout'
            };
        }
    }
    static async fetchRecentTransactionsWithTimeout(userId, timeout, userPlan) {
        return new Promise(async (resolve) => {
            const timeoutId = setTimeout(() => {
                logger.warn(`[DataIntegrator] Timeout na busca de transações (${timeout}ms)`);
                resolve([]);
            }, timeout);
            try {
                const rtdb = (0, database_1.getDatabase)();
                const path = `transactions/${userId}`;
                const userTransactionsRef = rtdb.ref(path);
                const caps = txCapsByPlan(userPlan);
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - caps.days);
                const cutoffStr = cutoffDate.toISOString().split('T')[0];
                const snapshot = await userTransactionsRef
                    .orderByChild('date')
                    .startAt(cutoffStr)
                    .limitToLast(caps.max)
                    .get();
                clearTimeout(timeoutId);
                if (!snapshot.exists()) {
                    resolve([]);
                    return;
                }
                const transactions = [];
                snapshot.forEach((childSnapshot) => {
                    const data = childSnapshot.val();
                    const transactionDate = new Date(data.date);
                    transactions.push({
                        id: childSnapshot.key || '',
                        date: transactionDate,
                        description: data.description?.trim() || 'Sem descrição',
                        amount: parseFloat(data.amount) || 0,
                        category: data.category || 'Outros',
                        type: data.type === 'income' ? 'income' : 'expense',
                        userId: data.userId || userId
                    });
                });
                transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
                logger.info(`[DataIntegrator] ${transactions.length} transações dos últimos ${caps.days} dias (Filtro: ${cutoffStr}, teto: ${caps.max})`);
                resolve(transactions);
            }
            catch (error) {
                clearTimeout(timeoutId);
                logger.error(`[DataIntegrator] Erro ao ler transações:`, error);
                resolve([]);
            }
        });
    }
    static async fetchUserGoalsWithTimeout(userId, timeout) {
        return new Promise(async (resolve) => {
            const timeoutId = setTimeout(() => {
                logger.warn(`[DataIntegrator] Timeout na busca de metas (${timeout}ms)`);
                resolve([]);
            }, timeout);
            try {
                const rtdb = (0, database_1.getDatabase)();
                const path = `meta/${userId}`;
                const userGoalsRef = rtdb.ref(path);
                const snapshot = await userGoalsRef.get();
                clearTimeout(timeoutId);
                if (!snapshot.exists()) {
                    resolve([]);
                    return;
                }
                const goals = [];
                snapshot.forEach((childSnapshot) => {
                    const data = childSnapshot.val();
                    goals.push({
                        id: childSnapshot.key || '',
                        name: data.name || 'Meta sem nome',
                        targetAmount: parseFloat(data.targetAmount) || 0,
                        currentAmount: parseFloat(data.currentAmount) || 0,
                        deadline: new Date(data.deadline || new Date().setFullYear(new Date().getFullYear() + 1)),
                        category: this.mapGoalCategory(data.category),
                        priority: (['high', 'medium', 'low'].includes(data.priority)) ? data.priority : 'medium'
                    });
                });
                resolve(goals);
            }
            catch (error) {
                clearTimeout(timeoutId);
                logger.error(`[DataIntegrator] Erro ao ler metas:`, error);
                resolve([]);
            }
        });
    }
    static formatTransactionsForPrompt(transactions, _context) {
        if (!transactions || transactions.length === 0)
            return 'Nenhuma transação recente registrada.';
        const relevant = this.filterRelevantTransactions(transactions, _context);
        if (relevant.length === 0)
            return 'Nenhuma transação relevante para o contexto atual.';
        const oldestTx = relevant.length > 0 ? relevant[relevant.length - 1] : null;
        let daysToFetch = undefined;
        if (oldestTx) {
            const today = new Date();
            const diffTime = Math.abs(today.getTime() - oldestTx.date.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            daysToFetch = diffDays;
        }
        const summary = this.generateTransactionSummary(relevant, daysToFetch);
        const recentList = relevant.slice(0, 8).map(t => {
            const date = new Date(t.date).toLocaleDateString('pt-BR');
            const amount = t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            return `• ${date}: ${t.description} - ${amount} (${t.category})`;
        });
        return `**RESUMO CALCULADO (use estes valores nas respostas):**\n${summary}\n\n**ÚLTIMAS TRANSAÇÕES (apenas para contexto, não some manualmente):**\n${recentList.join('\n')}`;
    }
    static formatGoalsForPrompt(goals, _context) {
        if (!goals || goals.length === 0)
            return 'Nenhuma meta financeira registrada.';
        const listed = goals.slice(0, exports.MAX_GOALS_LISTED);
        const extra = goals.length - listed.length;
        return `**METAS ATIVAS (${goals.length}):**\n${listed.map(g => `• ${g.name}: R$ ${g.currentAmount}/${g.targetAmount}`).join('\n')}${extra > 0 ? `\n(+${extra} metas omitidas pelo limite de contexto)` : ''}`;
    }
    static formatAssetsSummary(assets) {
        if (!assets || assets.length === 0)
            return '\n🏦 Ativos patrimoniais / produtivos: Nenhum ativo registrado.';
        return `\n🏦 ATIVOS PATRIMONIAIS / PRODUTIVOS (${assets.length} itens):\n` +
            assets.map((a) => {
                const nome = a.name || a.description || 'Item sem nome';
                const categoria = a.category || 'Outros';
                const valor = Number(a.currentValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                return `  • ${nome} (${categoria}): R$ ${valor}`;
            }).join('\n');
    }
    static formatPassivesSummary(passives) {
        if (!passives || passives.length === 0)
            return '\n🏠 Passivos patrimoniais / imobilizados: Nenhum passivo registrado.';
        return `\n🏠 PASSIVOS PATRIMONIAIS / IMOBILIZADOS (${passives.length} itens):\n` +
            passives.map((p) => {
                const nome = p.description || p.name || 'Item sem nome';
                const categoria = p.category || 'Outros';
                const valor = Number(p.currentValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                return `  • ${nome} (${categoria}): R$ ${valor}`;
            }).join('\n');
    }
    static formatDebtsSummary(debts) {
        if (!debts || debts.length === 0)
            return '\n💳 Dívidas: Nenhuma dívida cadastrada no app.';
        return `\n💳 DÍVIDAS CADASTRADAS (${debts.length} itens):\n` +
            debts.map((d) => {
                const nome = d.nome || 'Dívida sem nome';
                const tipo = d.tipo || 'Outros';
                const saldo = Number(d.saldoDevedor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const taxa = Number(d.taxaMensal || 0).toFixed(2);
                const parcelas = d.parcelasRestantes ?? 'N/A';
                const parcela = d.valorParcela ? `R$ ${Number(d.valorParcela).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mês` : 'N/A';
                return `  • ${nome} (${tipo}): Saldo R$ ${saldo} | Taxa ${taxa}%/mês | ${parcelas} parcelas restantes | Parcela: ${parcela}`;
            }).join('\n');
    }
    static formatBillsSummary(bills) {
        if (!bills || bills.length === 0)
            return '\n📋 Contas fixas / Assinaturas: Nenhuma conta fixa cadastrada.';
        const activeBills = bills.filter((b) => b.isActive !== false);
        const totalMensal = activeBills.reduce((acc, b) => acc + Number(b.amount || 0), 0);
        return `\n📋 CONTAS FIXAS & ASSINATURAS (${activeBills.length} ativas, Total R$ ${totalMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mês):\n` +
            activeBills.map((b) => {
                const nome = b.name || 'Conta sem nome';
                const valor = Number(b.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const diaVenc = b.dueDay ? `dia ${b.dueDay}` : 'sem dia fixo';
                const cat = b.category ? ` [${b.category}]` : '';
                return `  • ${nome}${cat}: R$ ${valor} (Vencimento ${diaVenc})`;
            }).join('\n');
    }
    static formatCardsSummary(cards, invoices = []) {
        if (!cards || cards.length === 0)
            return '\n💳 Cartões de Crédito: Nenhum cartão cadastrado.';
        return `\n💳 CARTÕES DE CRÉDITO (${cards.length} cadastrados):\n` +
            cards.map((c) => {
                const nome = c.name || 'Cartão sem nome';
                const limite = Number(c.limit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const utilizado = Number(c.saldoUtilizadoTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const fechamento = c.closingDay ? `Fechamento dia ${c.closingDay}` : '';
                const vencimento = c.dueDay ? `Vencimento dia ${c.dueDay}` : '';
                const prazos = [fechamento, vencimento].filter(Boolean).join(' | ');
                const faturasDoCartao = invoices.filter((inv) => inv.cardId === c.id && inv.status !== 'paid');
                let faturaInfo = '';
                if (faturasDoCartao.length > 0) {
                    const faturaAberta = faturasDoCartao[0];
                    const valorFatura = Number(faturaAberta.remainingAmount ?? faturaAberta.total ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    faturaInfo = ` -> Fatura Atual pendente: R$ ${valorFatura} (${faturaAberta.status || 'aberta'})`;
                }
                return `  • ${nome}: Limite R$ ${limite} | Saldo Utilizado R$ ${utilizado}${prazos ? ` (${prazos})` : ''}${faturaInfo}`;
            }).join('\n');
    }
    static formatPatrimonioVisaoGerencial(assets, passives) {
        const totalAssets = assets.reduce((sum, a) => sum + (a.currentValue || 0), 0);
        const totalPassives = passives.reduce((sum, p) => sum + (p.currentValue || 0), 0);
        const patrimonioTotalMonitorado = totalAssets + totalPassives;
        return `📊 VISÃO PATRIMONIAL DO APP:\n` +
            `• Total em ativos patrimoniais / produtivos: R$ ${totalAssets.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
            `• Total em passivos patrimoniais / imobilizados: R$ ${totalPassives.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
            `• Patrimônio total monitorado no app: R$ ${patrimonioTotalMonitorado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
            `ℹ️ No Finanças Pro Invest, "passivos" são bens patrimoniais que exigem manutenção/aportes e não devem ser tratados automaticamente como dívidas.`;
    }
    static formatSimulationsForPrompt(simulations, _context) {
        if (!simulations || simulations.length === 0)
            return 'Nenhuma simulação recente.';
        return `**SIMULAÇÕES (${simulations.length}):**\n${simulations.map(s => `• ${s.label}`).join('\n')}`;
    }
    static filterRelevantTransactions(transactions, _context) {
        return transactions;
    }
    static generateTransactionSummary(transactions, daysToFetch) {
        const period = daysToFetch ? `Últimos ${daysToFetch} dias` : 'Período recente';
        const recent = transactions;
        const income = recent.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expenses = recent.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const savings = income - expenses;
        const expenseCount = recent.filter(t => t.type === 'expense').length;
        return `${period}:\n• Receitas: R$ ${income.toLocaleString('pt-BR')}\n• Despesas: R$ ${expenses.toLocaleString('pt-BR')} (${expenseCount})\n• Saldo: R$ ${savings.toLocaleString('pt-BR')}\n• Economia: ${income > 0 ? ((savings / income) * 100).toFixed(1) : 0}%`;
    }
    static generateDataSummary(goals, transactions, _simulations, financialProfile) {
        const activeGoals = goals.filter(g => new Date(g.deadline) > new Date() && g.currentAmount < g.targetAmount).length;
        let summaryText = "";
        if (financialProfile) {
            summaryText += `### PERFIL FINANCEIRO DECLARADO (PRIORIDADE MÁXIMA) ###\n`;
            summaryText += `ESTE É O DADO OFICIAL PARA O PLANO. IGNORE MÉDIAS DE LANÇAMENTOS ANTERIORES SE CONFLITAREM COM ISTO:\n`;
            summaryText += `- Renda Mensal Líquida: R$ ${financialProfile.monthlyIncome}\n`;
            summaryText += `- Meta da Reserva de Emergência: ${financialProfile.emergencyReserveTarget} meses de custo de vida\n`;
            summaryText += `- Saldo Atual da Reserva: R$ ${financialProfile.emergencyReserveCurrent}\n`;
            summaryText += `\nINSTRUÇÃO: Use a 'Renda Mensal Líquida' acima como a base de cálculo para o fôlego financeiro e amortizações extras. Não pergunte a renda ao usuário.\n\n`;
        }
        summaryText += `### CONTEXTO SECUNDÁRIO (HISTÓRICO) ###\n`;
        summaryText += `Usuário possui ${activeGoals} metas ativas e ${transactions.length} transações recentes no gerenciador financeiro.`;
        return summaryText;
    }
    static mapGoalCategory(category) {
        const valid = ['retirement', 'travel', 'property', 'education', 'emergency', 'investment'];
        return valid.includes(category) ? category : 'investment';
    }
}
exports.DataIntegrator = DataIntegrator;
exports.NEXUS_TX_CAPS = {
    free: { days: 3, max: 50 },
    pro: { days: 30, max: 150 },
    premium: { days: 90, max: 300 },
    premium_anual: { days: 9999, max: 500 },
};
const DEFAULT_TX_CAP = { days: 30, max: 150 };
function txCapsByPlan(plan) {
    if (plan && plan in exports.NEXUS_TX_CAPS)
        return exports.NEXUS_TX_CAPS[plan];
    return DEFAULT_TX_CAP;
}
exports.MAX_PROMPT_SEGMENT_CHARS = 4000;
function truncatePromptSegment(text, max = exports.MAX_PROMPT_SEGMENT_CHARS) {
    if (text.length <= max)
        return text;
    return text.slice(0, max) + '\n[...trecho truncado por limite de contexto]';
}
exports.MAX_GOALS_LISTED = 20;
//# sourceMappingURL=data-integrator.js.map