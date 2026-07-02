import type { Logger } from "../../util/logger.js";
import type { ContentstackRegion } from "../../util/regions.js";
import type { ConciergeSource } from "./types.js";
export interface ConciergeSearchMetadataField {
    value: string | number;
    isSource: boolean;
    type?: string;
}
export interface ConciergeSearchHit {
    uid: string;
    project_uid: string;
    metadata: Record<string, ConciergeSearchMetadataField>;
}
export interface ConciergeSearchContentRef {
    content_uid: string;
}
export type ConciergeSearchResultItem = ConciergeSearchHit | ConciergeSearchContentRef;
export declare function isConciergeSearchHit(item: ConciergeSearchResultItem): item is ConciergeSearchHit;
export declare function isConciergeSearchContentRef(item: ConciergeSearchResultItem): item is ConciergeSearchContentRef;
export interface ConciergeSearchResult {
    sessionId: string;
    results: ConciergeSearchResultItem[];
    sources: ConciergeSource[];
    raw: unknown;
}
export interface ConciergeSearchInput {
    query: string;
    limit?: number;
    sessionId?: string;
    signal?: AbortSignal;
}
interface ConciergeSearchConfigBase {
    apiKey: string;
    platform?: string;
    sessionId?: string;
    defaultLimit?: number;
    logger?: Logger;
}
export type ConciergeSearchConfig = ConciergeSearchConfigBase & ({
    region: ContentstackRegion;
    endpoint?: never;
} | {
    endpoint: string;
    region?: never;
});
export {};
//# sourceMappingURL=searchTypes.d.ts.map