import type { ContentstackRegion } from "../../util/regions.js";
export declare const DIGITAL_CONCIERGE_SEARCH_PATH_PREFIX = "/digital-concierge/";
export declare const DIGITAL_CONCIERGE_SEARCH_PATH_SUFFIX = "/search";
export declare const DIGITAL_CONCIERGE_HEADER_SESSION_ID = "x-session-id";
export declare const DIGITAL_CONCIERGE_HEADER_LIMIT = "x-limit";
export declare function resolveDigitalConciergeSearchUrl(params: {
    apiKey: string;
    region?: ContentstackRegion;
    endpoint?: string;
}): string;
//# sourceMappingURL=searchEndpoints.d.ts.map