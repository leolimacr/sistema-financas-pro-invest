export declare class DiscretionEngine {
    static analyzeContext(userMessage: string, messageHistory: Array<{
        role: string;
        text: string;
        timestamp?: Date;
    }>, userData: {
        hasGoals: boolean;
        hasRecentTransactions: boolean;
        hasSimulations: boolean;
    }): {
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
    };
    private static isTestingPresence;
    private static determineIntent;
    private static assessComplexity;
    private static analyzeDataRequirements;
    private static isSimpleGreeting;
    private static shouldSuggestActions;
    private static getTimeOfDay;
    private static analyzeUserMood;
    private static requiresFollowUp;
}
