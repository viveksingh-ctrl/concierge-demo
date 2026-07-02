import type { ContentstackRegion } from "../../util/regions.js";
export type ConciergeEnvironment = string;
export declare function resolveDigitalConciergeBaseUrl(region: ContentstackRegion, environment?: ConciergeEnvironment): string;
export declare function resolveDigitalConciergeExecuteUrl(params: {
    apiKey: string;
    region?: ContentstackRegion;
    endpoint?: string;
    environment?: ConciergeEnvironment;
}): string;
//# sourceMappingURL=endpoints.d.ts.map