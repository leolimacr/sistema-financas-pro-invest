export interface ContextualAction {
    id: string;
    label: string;
    route: string;
    icon?: string;
}
export interface NexusDecisionObject {
    observedFact: string;
    analyzedPeriod: string;
    confidenceLevel: 'alta' | 'media' | 'baixa';
    sourcesUsed: string[];
    assumptions: string[];
    impact: string;
    invalidatingCondition?: string;
    suggestedActions: ContextualAction[];
}
export declare const ACTION_REGISTRY: Record<string, ContextualAction>;
export declare class ActionManager {
    static extractActions(text: string): {
        cleanText: string;
        actions: ContextualAction[];
    };
    static parseDecision(rawText: string, basis?: {
        period?: string;
        sources?: string[];
        dataStatus?: 'ok' | 'empty' | 'error';
        limitations?: string[];
    }): {
        cleanText: string;
        actions: ContextualAction[];
        decision: NexusDecisionObject;
    };
    static getInstructionMenu(): string;
}
