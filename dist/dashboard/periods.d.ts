import type { TimeBucket } from "../types";
export type Period = "15m" | "1h" | "today" | "week" | "month" | "quarter" | "year";
export declare const PERIODS: Period[];
export type Span = {
    period: Period;
    label: string;
    range: string;
    rolling: boolean;
    elapsed: number;
    unit: TimeBucket;
    ids: string[];
    chart: {
        bucket: TimeBucket;
        ids: string[];
    };
    previous: {
        label: string;
        unit: TimeBucket;
        ids: string[];
    };
};
export declare function isPeriod(value: unknown): value is Period;
export declare function spanOf(period: Period, now?: number): Span;
export declare function placeOf(span: Span, bucket: TimeBucket, id: string): "inside" | "around" | "outside";
export type CounterKey = {
    key: string;
    base: string;
    bucket: TimeBucket;
    id: string;
    kind: "global" | "type" | "route";
    type?: string;
    action?: string;
    name?: string;
    errors: boolean;
};
export declare function parseKey(prefix: string, key: string, raw?: boolean): CounterKey | null;
