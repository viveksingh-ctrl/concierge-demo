import type { PersistThreadMessages } from "../../persistence/threadMessages.js";
import type { Logger } from "../../util/logger.js";
import type { ContentstackRegion } from "../../util/regions.js";
export interface ConciergeSource {
    key: string;
    value: string;
    contentType?: string;
}
export interface ConciergeMetadataCustomField {
    value: string;
    isSource: boolean;
    type?: string;
}
export interface ConciergeMetadataResult {
    content_uid: string;
    custom?: Record<string, ConciergeMetadataCustomField>;
}
export interface ConciergeToolResultEvent {
    type: "toolResult";
    toolName: string;
    toolCallId?: string;
    result: unknown;
    sources: ConciergeSource[];
}
export interface ConciergeTextEvent {
    type: "text";
    textDelta: string;
    text: string;
}
export interface ConciergeMetadataEvent {
    type: "metadata";
    results: ConciergeMetadataResult[];
    sources: ConciergeSource[];
}
export interface ConciergeDoneEvent {
    type: "done";
    threadId: string;
    userId: string;
    text: string;
    sources: ConciergeSource[];
    metadata: ConciergeMetadataResult[];
}
export interface ConciergeErrorEvent {
    type: "error";
    message: string;
}
export type ConciergeStreamEvent = ConciergeTextEvent | ConciergeToolResultEvent | ConciergeMetadataEvent | ConciergeDoneEvent | ConciergeErrorEvent;
export interface ConciergeResult {
    threadId: string;
    userId: string;
    text: string;
    sources: ConciergeSource[];
    metadata: ConciergeMetadataResult[];
}
export interface ConciergeConversationOptions {
    maxHistoryMessages?: number;
}
export interface ConciergeAgentOptions {
    conversation?: ConciergeConversationOptions;
}
interface ConciergeAgentConfigBase {
    apiKey: string;
    environment?: string;
    platform?: string;
    options?: ConciergeAgentOptions;
    logger?: Logger;
    persistThreadMessages?: PersistThreadMessages;
}
export type ConciergeAgentConfig = ConciergeAgentConfigBase & ({
    region: ContentstackRegion;
    endpoint?: never;
} | {
    endpoint: string;
    region?: never;
});
export interface ConciergeTextInput {
    prompt: string;
    threadId?: string;
    userId?: string;
    signal?: AbortSignal;
    onChunk?: (event: ConciergeStreamEvent) => void;
    onFinish?: (result: ConciergeResult) => void;
    onError?: (error: Error) => void;
}
export interface ConciergeStreamRun {
    events: AsyncIterable<ConciergeStreamEvent>;
    textStream: AsyncIterable<string>;
    text: Promise<string>;
    sources: Promise<ConciergeSource[]>;
    metadata: Promise<ConciergeMetadataResult[]>;
    done: Promise<ConciergeResult>;
    cancel: () => void;
    toSSEResponse: (init?: ResponseInit) => Response;
    toTextStreamResponse: (init?: ResponseInit) => Response;
}
export {};
//# sourceMappingURL=types.d.ts.map