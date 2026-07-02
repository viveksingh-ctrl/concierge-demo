import type { ConciergeSearchConfig, ConciergeSearchInput, ConciergeSearchResult } from "./searchTypes.js";
export declare class ConciergeSearch {
    private readonly config;
    private readonly logger;
    private readonly platform;
    private currentSessionId;
    private lastQuery;
    constructor(config: ConciergeSearchConfig);
    setSessionId(sessionId: string): this;
    getSessionId(): string;
    clearSession(): void;
    search(input: ConciergeSearchInput): Promise<ConciergeSearchResult>;
}
//# sourceMappingURL=conciergeSearch.d.ts.map