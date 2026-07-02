export type LogLevel = "debug" | "info" | "warn" | "error";
export interface Logger {
    debug?: (message: string, meta?: unknown) => void;
    info?: (message: string, meta?: unknown) => void;
    warn?: (message: string, meta?: unknown) => void;
    error?: (message: string, meta?: unknown) => void;
    log?: (level: LogLevel, message: string, meta?: unknown) => void;
}
export declare function createNoopLogger(): Logger;
export declare function createConsoleLogger(): Logger;
//# sourceMappingURL=logger.d.ts.map