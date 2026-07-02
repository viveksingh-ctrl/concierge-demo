export interface StorageLike {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
}
export type PersistThreadMessages = boolean | {
    storageKey?: string;
    maxMessagesPerThread?: number;
    storage?: StorageLike;
};
export interface PersistThreadMessagesResolved {
    storageKey: string;
    maxMessagesPerThread: number;
    storage: StorageLike;
}
export type ThreadMessageRole = "user" | "assistant";
export interface ThreadMessage {
    id: string;
    role: ThreadMessageRole;
    text: string;
    ts: number;
}
export declare function resolvePersistThreadMessages(persist?: PersistThreadMessages): PersistThreadMessagesResolved | null;
export declare function getPersistedUserId(r: PersistThreadMessagesResolved): string;
export declare function setPersistedUserId(r: PersistThreadMessagesResolved, userId: string): void;
export declare function getPersistedCurrentThreadId(r: PersistThreadMessagesResolved): string | null;
export declare function setPersistedCurrentThreadId(r: PersistThreadMessagesResolved, threadId: string | null): void;
export declare function getPersistedThreadIds(r: PersistThreadMessagesResolved): string[];
export declare function addPersistedThreadId(r: PersistThreadMessagesResolved, threadId: string): void;
export declare function clearPersistedAll(r: PersistThreadMessagesResolved): void;
export declare function clearPersistedThread(r: PersistThreadMessagesResolved, threadId: string): void;
export declare function getThreadMessages(params: {
    threadId: string;
    storageKey?: string;
    storage?: StorageLike;
}): ThreadMessage[];
export declare function setThreadMessages(params: {
    threadId: string;
    messages: ThreadMessage[];
    storageKey?: string;
    storage?: StorageLike;
}): void;
export declare function appendThreadMessage(r: PersistThreadMessagesResolved, threadId: string, message: {
    role: ThreadMessageRole;
    text: string;
    ts?: number;
    id?: string;
}): void;
//# sourceMappingURL=threadMessages.d.ts.map