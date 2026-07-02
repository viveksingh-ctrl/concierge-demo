import type { ConciergeAgentConfig, ConciergeResult, ConciergeStreamEvent, ConciergeStreamRun, ConciergeTextInput } from "./types.js";
export declare class ConciergeAgent {
    private readonly config;
    private readonly logger;
    private readonly store;
    private readonly platform;
    private readonly persist;
    private currentUserId?;
    private currentThreadId?;
    constructor(config: ConciergeAgentConfig);
    setUserId(userId: string): this;
    setThreadId(threadId: string): this;
    clearThread(threadId?: string): void;
    clearAllThreads(): void;
    generateText(input: ConciergeTextInput): Promise<ConciergeResult>;
    streamText(input: ConciergeTextInput): ConciergeStreamRun;
    streamTextEvents(input: ConciergeTextInput, signal?: AbortSignal): AsyncIterable<ConciergeStreamEvent>;
}
//# sourceMappingURL=conciergeAgent.d.ts.map