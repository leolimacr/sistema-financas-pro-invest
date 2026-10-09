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
exports.MultiModelRouter = void 0;
const logger = __importStar(require("firebase-functions/logger"));
class MultiModelRouter {
    constructor() {
        this.providers = new Map();
        this.cache = new Map();
        this.CACHE_TTL = 2 * 60 * 1000;
        this.initializeProviders();
    }
    static getInstance() {
        if (!MultiModelRouter.instance) {
            MultiModelRouter.instance = new MultiModelRouter();
        }
        return MultiModelRouter.instance;
    }
    initializeProviders() {
        this.providers.set('gemini', {
            name: 'gemini',
            apiKey: '',
            baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
            models: {
                primary: 'gemini-3.8-flash',
                fallbacks: ['gemini-3.5-flash', 'gemini-flash-latest']
            },
            priority: 1,
            isAvailable: true,
            errorCount: 0,
            maxTokens: 8000
        });
        this.providers.set('groq', {
            name: 'groq',
            apiKey: '',
            baseURL: 'https://api.groq.com/openai/v1',
            models: {
                primary: 'llama-3.3-70b-versatile',
                fallbacks: ['llama-3.1-8b-instant']
            },
            priority: 2,
            isAvailable: true,
            errorCount: 0,
            maxTokens: 8000
        });
        this.providers.set('openrouter', {
            name: 'openrouter',
            apiKey: '',
            baseURL: 'https://openrouter.ai/api/v1',
            models: {
                primary: 'openrouter/free',
                fallbacks: []
            },
            priority: 3,
            isAvailable: true,
            errorCount: 0,
            maxTokens: 8000,
            headers: {
                'HTTP-Referer': 'https://financas-pro-invest.web.app',
                'X-Title': 'Nexus Financial'
            }
        });
    }
    updateApiKeys(keys) {
        if (keys.gemini) {
            const p = this.providers.get('gemini');
            if (p)
                p.apiKey = keys.gemini;
        }
        if (keys.groq) {
            const p = this.providers.get('groq');
            if (p)
                p.apiKey = keys.groq;
        }
        if (keys.openrouter) {
            const p = this.providers.get('openrouter');
            if (p)
                p.apiKey = keys.openrouter;
        }
    }
    async routeRequest(messages, systemPrompt, options) {
        const cacheKey = this.generateCacheKey(messages, systemPrompt, options?.cacheScope, options?.responseFormat);
        const cached = this.getCachedResponse(cacheKey);
        if (cached)
            return { ...cached.response, cached: true };
        const sortedProviders = this.getAvailableProviders();
        let attempts = 0;
        for (const provider of sortedProviders) {
            if (attempts >= 2) {
                logger.warn(`[Router] Limite de ${attempts} tentativas atingido`);
                break;
            }
            if (!provider.apiKey) {
                logger.warn(`[Router] ${provider.name} sem API key - pulando`);
                continue;
            }
            try {
                attempts++;
                logger.info(`[Router] Tentativa ${attempts}/2: ${provider.name} (${provider.models.primary})`);
                const response = await this.tryProvider(provider, messages, systemPrompt, options);
                if (response.success) {
                    this.resetProviderErrors(provider.name);
                    this.cacheResponse(cacheKey, response);
                    logger.info(`[Router] ✓ ${provider.name} (${response.model}) - ${response.tokensUsed} tokens`);
                    return response;
                }
            }
            catch (error) {
                logger.error(`[Router] ${provider.name} falhou: ${error.message}`);
                this.markProviderError(provider.name);
            }
        }
        logger.error("[Router] ⚠️ Providers falharam após 2 tentativas - modo contingência");
        return this.getContingencyResponse(options?.fallbackContext);
    }
    async tryProvider(provider, messages, systemPrompt, options) {
        if (!provider.isAvailable) {
            throw new Error('Provider indisponível');
        }
        const candidates = [provider.models.primary, ...(provider.models.fallbacks ?? [])];
        let lastError;
        for (const modelName of candidates) {
            try {
                return await this.callOpenAIFormat(provider, modelName, messages, systemPrompt, options);
            }
            catch (error) {
                lastError = error;
                logger.warn(`[Router] ${provider.name}/${modelName} falhou: ${error.message}`);
            }
        }
        throw lastError ?? new Error(`Nenhum modelo de ${provider.name} respondeu`);
    }
    async callOpenAIFormat(provider, modelName, messages, systemPrompt, options) {
        const fullMessages = systemPrompt
            ? [{ role: 'system', content: systemPrompt }, ...messages]
            : messages;
        const requestBody = {
            model: modelName,
            messages: fullMessages,
            temperature: options?.temperature || 0.6,
            max_tokens: options?.maxTokens || provider.maxTokens,
            stream: false
        };
        if (options?.responseFormat === 'json') {
            requestBody.response_format = { type: 'json_object' };
        }
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${provider.apiKey}`,
            ...(provider.headers || {})
        };
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        try {
            const response = await fetch(`${provider.baseURL}/chat/completions`, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const errorText = await response.text();
                logger.error(`[${provider.name}] HTTP ${response.status}: ${errorText.substring(0, 150)}`);
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            const message = data.choices?.[0]?.message;
            if (!message) {
                throw new Error('Resposta inválida');
            }
            return {
                success: true,
                content: message.content || '',
                provider: provider.name,
                model: modelName,
                tokensUsed: data.usage?.total_tokens || 0,
                cached: false
            };
        }
        catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
    getAvailableProviders() {
        return Array.from(this.providers.values())
            .filter(p => p.isAvailable)
            .sort((a, b) => a.priority - b.priority);
    }
    markProviderError(providerName) {
        const provider = this.providers.get(providerName);
        if (!provider)
            return;
        provider.errorCount++;
        logger.warn(`[Router] ${providerName}: ${provider.errorCount}/5 erros`);
        if (provider.errorCount >= 5) {
            provider.isAvailable = false;
            logger.error(`[Router] ${providerName} DESATIVADO temporariamente`);
            setTimeout(() => {
                provider.isAvailable = true;
                provider.errorCount = 0;
                logger.info(`[Router] ${providerName} reativado`);
            }, 2 * 60 * 1000);
        }
    }
    resetProviderErrors(providerName) {
        const provider = this.providers.get(providerName);
        if (provider && provider.errorCount > 0) {
            provider.errorCount = 0;
        }
    }
    getContingencyResponse(context) {
        const userName = context?.userName || 'Investidor';
        const content = `${userName}, estou com instabilidade momentânea. Por favor, tente novamente em alguns instantes.`;
        return {
            success: true,
            content: content,
            provider: 'contingency',
            model: 'fallback',
            tokensUsed: 0,
            cached: false,
            isContingency: true
        };
    }
    generateCacheKey(messages, systemPrompt, cacheScope, responseFormat) {
        return JSON.stringify({
            cacheScope: cacheScope || 'anonymous',
            systemPrompt: systemPrompt || '',
            responseFormat: responseFormat || 'text',
            messages: messages.slice(-8),
        });
    }
    getCachedResponse(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached;
        }
        if (cached)
            this.cache.delete(key);
        return null;
    }
    cacheResponse(key, response) {
        if (this.cache.size > 500) {
            const oldest = [...this.cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
            if (oldest)
                this.cache.delete(oldest[0]);
        }
        this.cache.set(key, { response, timestamp: Date.now() });
    }
}
exports.MultiModelRouter = MultiModelRouter;
//# sourceMappingURL=MultiModelRouter.js.map