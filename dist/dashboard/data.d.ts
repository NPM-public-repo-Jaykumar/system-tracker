import type { AutoConfig, TimeBucket } from "../types";
export declare const TIME_BUCKETS: TimeBucket[];
export declare const RANGE: Record<TimeBucket, number>;
export declare class BadRequest extends Error {
}
export declare function bucketIds(bucket: TimeBucket, n: number, now?: number): string[];
export declare function getMany(keys: string[]): Promise<number[]>;
export declare function config(): {
    cfg: AutoConfig;
    buckets: TimeBucket[];
};
export type Span = {
    key: TimeBucket | "week";
    bucket: TimeBucket;
    n: number;
};
export declare function rangesOf(buckets: TimeBucket[]): (TimeBucket | "week")[];
export declare function seriesMany(wanted: [string, TimeBucket, number][], now: number): Promise<{
    bucket: TimeBucket;
    ids: string[];
    counts: number[];
}[]>;
export declare function typesOf(cfg: AutoConfig): string[];
export declare function clearRouteCache(): void;
export declare function routesOf(prefix: string, type: string, buckets: TimeBucket[], now: number): Promise<{
    action: string;
    name: string;
}[]>;
export type RangeRoute = {
    type: string;
    action: string;
    name: string;
    total: number;
    now: number;
    errors: number | null;
};
export declare function clearRangeCache(): void;
export declare function rangeRoutes(span: Span, now: number, onlyType?: string): Promise<RangeRoute[]>;
export declare function overview(range: string | null, now?: number): Promise<{
    prefix: string;
    buckets: TimeBucket[];
    ranges: (TimeBucket | "week")[];
    range: TimeBucket | "week";
    global: {
        total: boolean;
        perType: boolean;
    };
    failures: boolean;
    chart: {
        bucket: TimeBucket;
        ids: string[];
        counts: number[];
    };
    now: {
        total: number;
        current: number;
        previous: number | null;
        average: number;
        peak: {
            count: number;
            id: string | null;
        };
    };
    types: ({
        type: string;
        total: number;
        now: number;
        chart: number[];
    } | {
        own: number;
        thirdParty: number;
        type: string;
        total: number;
        now: number;
        chart: number[];
    })[];
    top: ({
        share: number;
        type: string;
        action: string;
        name: string;
        total: number;
        now: number;
        errors: number | null;
    } & {
        own?: boolean;
    })[];
}>;
export declare function typeView(typeParam: string | null, range: string | null, now?: number): Promise<{
    type: string;
    buckets: TimeBucket[];
    ranges: (TimeBucket | "week")[];
    range: TimeBucket | "week";
    failures: boolean;
    chart: {
        bucket: TimeBucket;
        ids: string[];
        counts: number[];
    };
    now: {
        errors: number | null;
        total: number;
        current: number;
        previous: number | null;
        average: number;
        peak: {
            count: number;
            id: string | null;
        };
    };
    routes: (RangeRoute & {
        own?: boolean;
    })[];
}>;
export declare function routeView(q: URLSearchParams, now?: number): Promise<{
    kept: null;
    samplesOff: boolean;
    key: string;
    buckets: TimeBucket[];
    failures: boolean;
    tiles: {
        bucket: TimeBucket;
        current: number;
        spark: number[];
        ids: string[];
        expiry: number;
    }[];
    chart: {
        errors: number[] | null;
        bucket: TimeBucket;
        ids: string[];
        counts: number[];
    };
} | {
    kept: {
        samples: number;
        failed: number;
    };
    samplesOff?: undefined;
    key: string;
    buckets: TimeBucket[];
    failures: boolean;
    tiles: {
        bucket: TimeBucket;
        current: number;
        spark: number[];
        ids: string[];
        expiry: number;
    }[];
    chart: {
        errors: number[] | null;
        bucket: TimeBucket;
        ids: string[];
        counts: number[];
    };
}>;
export declare function requestsView(body: any): Promise<{
    samples: import("../auto/samples").Sample[];
    failed: import("../auto/samples").Sample[];
} | {
    samples: never[];
    failed: never[];
    samplesOff: boolean;
}>;
