export type ConversationRole = "user" | "assistant";
export interface ConversationMessage {
    role: ConversationRole;
    text: string;
    createdAtMs: number;
}
export declare class ConversationStore {
    private readonly byUserId;
    getMessages(userId: string, threadId: string): ConversationMessage[];
    setMessages(userId: string, threadId: string, messages: ConversationMessage[]): void;
    appendMessage(userId: string, threadId: string, message: Omit<ConversationMessage, "createdAtMs">): void;
    clearThread(userId: string, threadId: string): void;
    clearAllThreads(userId: string): void;
}
//# sourceMappingURL=conversationStore.d.ts.map