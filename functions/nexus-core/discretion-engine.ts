/**
 * DISCRETION ENGINE 2.0 - Motor de Bom Senso Contextual Avançado
 * Toma decisões inteligentes sobre quando falar, quanto falar e como falar
 */

export class DiscretionEngine {
    static analyzeContext(
        userMessage: string,
        messageHistory: Array<{role: string, text: string, timestamp?: Date}>,
        userData: {
            hasGoals: boolean;
            hasRecentTransactions: boolean;
            hasSimulations: boolean;
        }
    ): {
        intent: string;
        complexity: 'low' | 'medium' | 'high';
        requiresMarketData: boolean;
        requiresDate: boolean;
        requiresTime: boolean;
        isSimpleGreeting: boolean;
        shouldSuggest: boolean;
        timeOfDay?: 'morning' | 'afternoon' | 'evening';
        userMood: 'neutral' | 'curious' | 'impatient' | 'confused' | 'detailed' | 'testing';
        requiresFollowUp: boolean;
        isProbablyTesting: boolean;
    } {
        const message = userMessage.toLowerCase().trim();
        
        // Detectar se é um teste de presença
        const isTesting = this.isTestingPresence(message, messageHistory);
        
        const intent = isTesting ? 'presence_check' : this.determineIntent(message);
        const complexity = this.assessComplexity(message, intent, messageHistory);
        const requirements = this.analyzeDataRequirements(message, intent);
        const isSimpleGreeting = this.isSimpleGreeting(message, intent);
        const shouldSuggest = this.shouldSuggestActions(message, intent, messageHistory, userData);
        const timeOfDay = this.getTimeOfDay();
        const userMood = this.analyzeUserMood(message, messageHistory);
        const requiresFollowUp = this.requiresFollowUp(message, intent, messageHistory);
        
        return {
            intent,
            complexity,
            requiresMarketData: requirements.marketData,
            requiresDate: requirements.date,
            requiresTime: requirements.time,
            isSimpleGreeting,
            shouldSuggest,
            timeOfDay,
            userMood,
            requiresFollowUp,
            isProbablyTesting: isTesting
        };
    }
    
    // ========== MÉTODOS PRIVADOS APRIMORADOS ==========
    
    private static isTestingPresence(message: string, history: any[]): boolean {
        // CORREÇÃO CRÍTICA DO DEEPSEEK: Se não há histórico, é a primeira interação.
        // Nunca tratar a primeira mensagem como teste, mesmo que seja "Oi".
        if (!history || history.length === 0) return false;

        const testPatterns = [
            'oi', 'olá', 'tá aí', 'still there', 'ainda está aí', 'hello?', 
            'alô', 'testando', 'hey', 'opa'
        ];
        
        const isShortTest = testPatterns.some(pattern => 
            message.toLowerCase() === pattern || message.toLowerCase().startsWith(pattern + ' ')
        );
        
        if (!isShortTest) return false;
        
        // Verificar contexto: se já conversamos recentemente
        const lastMessage = history[history.length - 1];
        const timeSinceLast = lastMessage.timestamp ? 
            (new Date().getTime() - new Date(lastMessage.timestamp).getTime()) / 1000 : 0;
        
        // Se a última mensagem foi há mais de 30 segundos, pode ser um novo início
        if (timeSinceLast > 30) return false;
        
        // Se já respondemos recentemente e ele manda "oi" de novo, é teste
        return history.length > 2 && message.length < 10;
    }
        private static determineIntent(message: string): string {
        const messageLower = message.toLowerCase();

        if (this.isSimpleGreeting(messageLower, '')) return 'greeting';

        const cashflowKeywords = [
            'minhas despesas', 'minhas receitas', 'meu orçamento', 'meus gastos',
            'meus lançamentos', 'minhas transações', 'minhas transacoes',
            'meu saldo', 'meus registros', 'entradas e saídas', 'entradas e saidas',
            'fluxo de caixa', 'lançamentos de despesas', 'lancamentos de despesas',
            'receitas e despesas', 'analisar meus lançamentos', 'analise meus lançamentos',
            'analisar minhas despesas', 'analise minhas despesas', 'meu fluxo financeiro'
        ];

        const patrimonyKeywords = [
            'meus ativos', 'meus passivos', 'meu patrimônio', 'meu patrimonio',
            'meus bens', 'minha carteira patrimonial', 'meus imóveis', 'meus imoveis',
            'meus veículos', 'meus veiculos', 'meus terrenos', 'composição patrimonial',
            'composicao patrimonial', 'patrimônio ativo', 'patrimonio ativo',
            'patrimônio passivo', 'patrimonio passivo'
        ];

        const marketKeywords = [
            'dólar', 'dolar', 'ibov', 'ação', 'ações', 'acao', 'acoes',
            'bitcoin', 'mercado', 'cotação', 'cotacao', 'preço', 'preco', 'valor'
        ];

        const investmentKeywords = [
            'investir', 'aplicar', 'onde colocar', 'melhor investimento',
            'onde investir', 'recomende investimento'
        ];

        const debtKeywords = [
            'plano', 'quitar', 'sair das dívidas', 'sair das dividas',
            'estratégia de quitação', 'estrategia de quitacao', 'prioridade de dívida', 'prioridade de divida'
        ];

        const identityKeywords = ['quem é você', 'seu nome', 'você é', 'voce é', 'o que é nexus', 'o que e nexus'];
        const dateKeywords = ['que dia é hoje', 'que dia e hoje', 'qual a data', 'que horas são', 'que horas sao', 'dia atual', 'hora atual'];
        const explanationKeywords = ['o que é', 'o que e', 'como funciona', 'diferença entre', 'diferenca entre', 'significa', 'qual a diferença', 'qual a diferenca'];
        const followUpKeywords = ['e', 'também', 'tambem', 'além disso', 'alem disso', 'outra coisa', 'certo', 'então', 'entao'];
        const genericUserDataKeywords = ['meus dados', 'minha situação', 'minha situacao', 'como estão meus', 'como estao meus'];

        if (debtKeywords.some(k => messageLower.includes(k))) return 'debt_plan_query';
        if (cashflowKeywords.some(k => messageLower.includes(k))) return 'cashflow_query';
        if (patrimonyKeywords.some(k => messageLower.includes(k))) return 'patrimony_query';
        if (genericUserDataKeywords.some(k => messageLower.includes(k))) return 'user_data_query';
        if (explanationKeywords.some(k => messageLower.includes(k))) return 'explanation_query';
        if (marketKeywords.some(k => messageLower.includes(k))) return 'market_query';
        if (investmentKeywords.some(k => messageLower.includes(k))) return 'investment_advice';
        if (identityKeywords.some(k => messageLower.includes(k))) return 'identity_query';
        if (dateKeywords.some(k => messageLower.includes(k))) return 'date_time_query';
        if (followUpKeywords.some(k => messageLower.startsWith(k)) && messageLower.length < 50) return 'follow_up';

        return 'general_query';
    }
    private static assessComplexity(message: string, intent: string, history: any[]): 'low' | 'medium' | 'high' {
        // Mensagens muito curtas são de baixa complexidade
        if (message.split(' ').length <= 3) return 'low';
        
        // Perguntas de investimento são sempre altas (devido à CVM)
        if (intent === 'investment_advice') return 'high';
        
        // Perguntas explicativas são altas
        if (intent === 'explanation_query') return 'high';
        
        // Se o usuário já fez várias perguntas seguidas
        const recentUserMessages = history
            .filter((h: any) => h.role === 'user')
            .slice(-3);
            
        if (recentUserMessages.length >= 2) {
            const timeBetween = recentUserMessages.length > 1 ? 
                Math.abs(
                    new Date(recentUserMessages[0].timestamp || Date.now()).getTime() - 
                    new Date(recentUserMessages[1].timestamp || Date.now()).getTime()
                ) / 1000 : 0;
                 
            if (timeBetween < 30 && message.length < 100) {
                return 'low'; // Usuário parece ter pressa
            }
        }
        
        // Perguntas com "por que" ou "como" são médias/altas
        if (message.includes('por que') || message.includes('como')) {
            return message.length > 50 ? 'high' : 'medium';
        }
        
        return 'medium';
    }
    
    private static analyzeDataRequirements(message: string, intent: string): {
        marketData: boolean;
        date: boolean;
        time: boolean;
    } {
        const requirements = {
            marketData: false,
            date: false,
            time: false
        };
        
        if (intent === 'market_query') {
            requirements.marketData = true;
            
            // Análise inteligente de contexto
            const timeIndicators = ['agora', 'neste momento', 'atualmente'];
            const dateIndicators = ['hoje', 'nesta data'];
            const nowIndicators = ['quanto está agora', 'preço agora'];
            
            requirements.time = timeIndicators.some(i => message.includes(i)) || 
                               nowIndicators.some(i => message.includes(i));
            requirements.date = dateIndicators.some(i => message.includes(i));
            
            // Para perguntas genéricas de preço, incluir data para contexto
            if (!requirements.time && !requirements.date && message.includes('quanto está')) {
                requirements.date = true;
            }
        }
        
        if (intent === 'date_time_query') {
            if (message.includes('hora') || message.includes('horas')) {
                requirements.time = true;
            }
            if (message.includes('dia') || message.includes('data')) {
                requirements.date = true;
            }
            // Perguntas completas incluem ambos
            if (message.includes('que horas são') || message.includes('que dia é hoje')) {
                requirements.date = true;
                requirements.time = true;
            }
        }
        
        return requirements;
    }
    
    private static isSimpleGreeting(message: string, intent: string): boolean {
        if (intent === 'greeting') return true;
        
        const simpleGreetings = ['oi', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'e aí', 'hey', 'opa', 'hello', 'hi'];
        const isGreeting = simpleGreetings.some(greeting => 
            message.toLowerCase().startsWith(greeting) && message.split(' ').length <= 4
        );
        
        return isGreeting;
    }
    
    private static shouldSuggestActions(
        message: string, 
        intent: string, 
        history: any[],
        _userData: any
    ): boolean {
        // Nunca sugerir em saudações simples
        if (intent === 'greeting') return false;
        
        // Não sugerir se o usuário parece ter pressa
        if (message.includes('rápido') || message.includes('urgente') || message.includes('agora')) {
            return false;
        }
        
        // Analisar histórico recente
        const recentMessages = history.slice(-5);
        const hasRejectedSuggestions = recentMessages.some((msg: any) => 
            msg.role === 'user' && 
            (msg.text.toLowerCase().includes('não quero') || 
             msg.text.toLowerCase().includes('sem sugestão'))
        );
        
        if (hasRejectedSuggestions) return false;
        
        // Para investimentos: sugerir apenas conceitos, nunca produtos
        if (intent === 'investment_advice') return true;
        
        // Para dados do usuário: sugerir análise
        if (intent === 'cashflow_query' || intent === 'patrimony_query' || intent === 'user_data_query') return true;
        
        // Não sugerir em conversas muito longas
        if (history.length > 10) return false;
        
        return false;
    }
    
    private static getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
        const now = new Date();
        const options = { timeZone: 'America/Sao_Paulo' };
        const hour = new Date(now.toLocaleString('en-US', options)).getHours();
        
        if (hour >= 5 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 18) return 'afternoon';
        return 'evening';
    }
    
    private static analyzeUserMood(message: string, history: any[]): 
        'neutral' | 'curious' | 'impatient' | 'confused' | 'detailed' | 'testing' {
        
        const messageLower = message.toLowerCase();
        
        // Indicadores diretos
        if (messageLower.includes('???') || messageLower.includes('!!')) return 'impatient';
        if (messageLower.includes('?') && messageLower.length < 15) return 'confused';
        if (messageLower.includes('entendeu') || messageLower.includes('tá aí')) return 'testing';
        if (messageLower.includes('explic') || messageLower.includes('como funciona')) return 'curious';
        if (messageLower.includes('detalhe') || messageLower.includes('especific')) return 'detailed';
        
        // Análise de padrão
        const recentMessages = history.slice(-3);
        
        // Múltiplas mensagens seguidas muito breves
        if (recentMessages.length >= 2 && recentMessages.every(m => m.role === 'user')) {
            const allShort = recentMessages.every(m => m.text.length < 30);
            if (allShort) return 'impatient';
        }
        
        // Silêncio seguido de mensagem curta
        if (history.length > 0) {
            const lastMsg = history[history.length - 1];
            if (lastMsg.role === 'assistant' || lastMsg.role === 'ai') {
                const timeSince = lastMsg.timestamp ? 
                    (new Date().getTime() - new Date(lastMsg.timestamp).getTime()) / 1000 : 0;
                
                if (timeSince > 60 && message.length < 20) {
                    return 'testing';
                }
            }
        }
        
        return 'neutral';
    }
    
    private static requiresFollowUp(message: string, intent: string, history: any[]): boolean {
        if (intent === 'follow_up') return true;
        
        // Se a última mensagem foi nossa e esta é uma continuação
        if (history.length > 0) {
            const lastMessage = history[history.length - 1];
            if (lastMessage.role === 'assistant' || lastMessage.role === 'ai') {
                // Mensagens que claramente continuam a conversa
                const continuations = ['certo', 'então', 'e', 'também', 'além'];
                if (continuations.some(c => message.toLowerCase().startsWith(c))) {
                    return true;
                }
            }
        }
        
        return false;
    }
}
