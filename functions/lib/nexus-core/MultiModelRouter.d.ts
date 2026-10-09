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
export declare class MultiModelRouter {
    private static instance;
    private providers;
    private cache;
    private readonly CACHE_TTL;
    private constructor();
    static getInstance(): MultiModelRouter;
    private initializeProviders;
    updateApiKeys(keys: {
        gemini?: string;
        groq?: string;
        openrouter?: string;
    }): void;
    routeRequest(messages: any[], systemPrompt?: string, options?: {
        temperature?: number;
        maxTokens?: number;
        tools?: any[];
        cacheScope?: string;
        fallbackContext?: {
            primaryIntent?: string;
            userName?: string;
        };
        responseFormat?: 'json';
    }): Promise<RouterResponse>;
    private tryProvider;
    private callOpenAIFormat;
    private getAvailableProviders;
    private markProviderError;
    private resetProviderErrors;
    private getContingencyResponse;
    private generateCacheKey;
    private getCachedResponse;
    private cacheResponse;
}
