import type { ConciergeMetadataResult, ConciergeResult, ConciergeSource, ConciergeTextInput } from "../agents/digital-concierge/types.js";
type FetchLike = typeof fetch;
export interface ConciergeClientStreamRun {
    events: AsyncIterable<ConciergeClientEvent>;
    textStream: AsyncIterable<string>;
    done: Promise<ConciergeResult>;
    cancel: () => void;
}
export interface ConciergeClientTextEvent {
    type: "text";
    textDelta: string;
    text: string;
}
export interface ConciergeClientSourcesEvent {
    type: "sources";
    sources: ConciergeSource[];
}
export interface ConciergeClientMetadataEvent {
    type: "metadata";
    results: ConciergeMetadataResult[];
    sources: ConciergeSource[];
}
export interface ConciergeClientDoneEvent {
    type: "done";
    threadId: string;
    userId: string;
    text: string;
    sources: ConciergeSource[];
    metadata: ConciergeMetadataResult[];
}
export interface ConciergeClientErrorEvent {
    type: "error";
    message: string;
}
export type ConciergeClientEvent = ConciergeClientTextEvent | ConciergeClientSourcesEvent | ConciergeClientMetadataEvent | ConciergeClientDoneEvent | ConciergeClientErrorEvent;
export interface ConciergeClient {
    streamText: (input: ConciergeTextInput) => ConciergeClientStreamRun;
    generateText: (input: ConciergeTextInput) => Promise<ConciergeResult>;
}
export declare function createConciergeClient(params: {
    endpoint: string;
    fetch?: FetchLike;
}): ConciergeClient;
export {};
//# sourceMappingURL=conciergeClient.d.ts.map