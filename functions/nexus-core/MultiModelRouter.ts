/**
 * MULTI-MODEL ROUTER - Fail-fast controlado
 * 1º Groq → 2º OpenRouter (único fallback)
 * Máximo 2 tentativas por request. Sem cascata explosiva.
 */

import * as logger from "firebase-functions/logger";

export interface ModelProvider {
  name: string;
  apiKey: string;
  baseURL: string;
  models: {
    primary: string;
    fallbacks?: string[];
  };
  priority: number;
  isAvailable: boolean;
  errorCount: number;
  maxTokens: number;
  headers?: Record<string, string>;
}

export interface RouterResponse {
  success: boolean;
  content: string;
  provider: string;
  model: string;
  tokensUsed: number;
  cached: boolean;
  isContingency?: boolean;
}

export class MultiModelRouter {
  private static instance: MultiModelRouter;
  private providers: Map<string, ModelProvider> = new Map();
  private cache: Map<string, { response: RouterResponse; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 2 * 60 * 1000;

  private constructor() {
    this.initializeProviders();
  }

  static getInstance(): MultiModelRouter {
    if (!MultiModelRouter.instance) {
      MultiModelRouter.instance = new MultiModelRouter();
    }
    return MultiModelRouter.instance;
  }

  private initializeProviders(): void {
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

  public updateApiKeys(keys: {
      gemini?: string;
      groq?: string;
      openrouter?: string;
    }): void {
      if (keys.gemini) {
        const p = this.providers.get('gemini');
        if (p) p.apiKey = keys.gemini;
      }
      if (keys.groq) {
        const p = this.providers.get('groq');
        if (p) p.apiKey = keys.groq;
      }
      if (keys.openrouter) {
        const p = this.providers.get('openrouter');
        if (p) p.apiKey = keys.openrouter;
      }
    }

  async routeRequest(
    messages: any[],
    systemPrompt?: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      tools?: any[];
      /**
       * Escopo estável da conversa. Em fluxos com dados pessoais deve ser o
       * UID autenticado. Impede que o cache de processo reutilize uma resposta
       * contextualizada em outra conta.
       */
      cacheScope?: string;
      fallbackContext?: {
        primaryIntent?: string;
        userName?: string;
      };
      /** Exige saída JSON estruturada (response_format json_object) quando suportado. */
      responseFormat?: 'json';
    }
  ): Promise<RouterResponse> {
    const cacheKey = this.generateCacheKey(messages, systemPrompt, options?.cacheScope, options?.responseFormat);
    const cached = this.getCachedResponse(cacheKey);
    if (cached) return { ...cached.response, cached: true };

    const sortedProviders = this.getAvailableProviders();

    // Máximo 2 tentativas: 1 primary + 1 fallback
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
      } catch (error: any) {
        logger.error(`[Router] ${provider.name} falhou: ${error.message}`);
        this.markProviderError(provider.name);
      }
    }

    logger.error("[Router] ⚠️ Providers falharam após 2 tentativas - modo contingência");
    return this.getContingencyResponse(options?.fallbackContext);
  }

  private async tryProvider(
    provider: ModelProvider,
    messages: any[],
    systemPrompt?: string,
    options?: any
  ): Promise<RouterResponse> {
    if (!provider.isAvailable) {
      throw new Error('Provider indisponível');
    }
    // Tenta o modelo primário e depois cada fallback do provider (mesma API key).
    // A falha de um modelo (ex.: rota/modelo inexistente) não derruba o provider.
    const candidates = [provider.models.primary, ...(provider.models.fallbacks ?? [])];
    let lastError: unknown;
    for (const modelName of candidates) {
      try {
        return await this.callOpenAIFormat(provider, modelName, messages, systemPrompt, options);
      } catch (error: any) {
        lastError = error;
        logger.warn(`[Router] ${provider.name}/${modelName} falhou: ${error.message}`);
      }
    }
    throw lastError ?? new Error(`Nenhum modelo de ${provider.name} respondeu`);
  }

  private async callOpenAIFormat(
    provider: ModelProvider,
    modelName: string,
    messages: any[],
    systemPrompt?: string,
    options?: any
  ): Promise<RouterResponse> {
    const fullMessages = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;

    const requestBody: any = {
      model: modelName,
      messages: fullMessages,
      temperature: options?.temperature || 0.6,
      max_tokens: options?.maxTokens || provider.maxTokens,
      stream: false
    };

    // response_format json_object: apenas quando o chamador exigir JSON estruturado (options.responseFormat === 'json')
    if (options?.responseFormat === 'json') {
      requestBody.response_format = { type: 'json_object' };
    }

    const headers: Record<string, string> = {
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

      const data: any = await response.json();
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
    } catch (error: any) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private getAvailableProviders(): ModelProvider[] {
    return Array.from(this.providers.values())
      .filter(p => p.isAvailable)
      .sort((a, b) => a.priority - b.priority);
  }

  private markProviderError(providerName: string): void {
    const provider = this.providers.get(providerName);
    if (!provider) return;

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

  private resetProviderErrors(providerName: string): void {
    const provider = this.providers.get(providerName);
    if (provider && provider.errorCount > 0) {
      provider.errorCount = 0;
    }
  }

  private getContingencyResponse(context?: {
    primaryIntent?: string;
    userName?: string;
  }): RouterResponse {
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

  private generateCacheKey(
    messages: any[],
    systemPrompt?: string,
    cacheScope?: string,
    responseFormat?: 'json',
  ): string {
    // O prompt de sistema carrega a posição financeira do usuário. Portanto,
    // mensagens iguais não são suficientes para caracterizar uma resposta
    // reutilizável. Limitamos somente o histórico textual, nunca o escopo nem
    // o contexto financeiro que alteram o diagnóstico.
    return JSON.stringify({
      cacheScope: cacheScope || 'anonymous',
      systemPrompt: systemPrompt || '',
      responseFormat: responseFormat || 'text',
      messages: messages.slice(-8),
    });
  }

  private getCachedResponse(key: string): { response: RouterResponse; timestamp: number } | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached;
    }
    if (cached) this.cache.delete(key);
    return null;
  }

  private cacheResponse(key: string, response: RouterResponse): void {
    if (this.cache.size > 500) {
      const oldest = [...this.cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      if (oldest) this.cache.delete(oldest[0]);
    }
    this.cache.set(key, { response, timestamp: Date.now() });
  }
}
