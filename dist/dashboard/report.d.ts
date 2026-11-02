import { type Period } from "./periods";
type Row = {
    total: number;
    errors: number | null;
};
export type Report = Awaited<ReturnType<typeof buildReport>>;
export type ReportMeta = {
    id: string;
    kind?: "view";
    period: Period | null;
    label: string;
    range: string;
    createdAt: string;
    total: number | null;
    errors: number | null;
    format: string;
};
export declare const MAX_VIEW_BYTES = 1000000;
export declare function clearReportCache(): void;
declare function buildReport(period: Period, now: number): Promise<{
    prefix: string;
    period: Period;
    label: string;
    range: string;
    timezone: string;
    generatedAt: string;
    failures: boolean;
    total: number;
    errors: number | null;
    previous: {
        label: string;
        total: number;
    } | null;
    chart: {
        bucket: import("..").TimeBucket;
        ids: string[];
        counts: number[];
    } | null;
    types: {
        total: number;
        errors: number | null;
        type: string;
    }[];
    routeCount: number;
    routes: (Row & {
        type: string;
        action: string;
        name: string;
    })[];
}>;
export declare function reportView(periodParam: string | null, now?: number): Promise<{
    prefix: string;
    period: Period;
    label: string;
    range: string;
    timezone: string;
    generatedAt: string;
    failures: boolean;
    total: number;
    errors: number | null;
    previous: {
        label: string;
        total: number;
    } | null;
    chart: {
        bucket: import("..").TimeBucket;
        ids: string[];
        counts: number[];
    } | null;
    types: {
        total: number;
        errors: number | null;
        type: string;
    }[];
    routeCount: number;
    routes: (Row & {
        type: string;
        action: string;
        name: string;
    })[];
}>;
export declare function cleanView(v: any): {
    kind: "view";
    screen: string;
    title: string;
    range: string;
    total: number | null;
    kpis: {
        label: string;
        value: string | number | null;
        note: string;
    }[];
    charts: {
        title: string;
        unit: string;
        ids: string[];
        series: {
            label: string;
            values: (number | null)[];
        }[];
    }[];
    tables: {
        title: string;
        columns: string[];
        rows: (string | number | null)[][];
    }[];
};
export declare function saveReport(body: any, now?: number): Promise<{
    meta: ReportMeta;
    report: {
        prefix: string;
        timezone: string;
        generatedAt: string;
        kind: "view";
        screen: string;
        title: string;
        range: string;
        total: number | null;
        kpis: {
            label: string;
            value: string | number | null;
            note: string;
        }[];
        charts: {
            title: string;
            unit: string;
            ids: string[];
            series: {
                label: string;
                values: (number | null)[];
            }[];
        }[];
        tables: {
            title: string;
            columns: string[];
            rows: (string | number | null)[][];
        }[];
    };
} | {
    meta: ReportMeta;
    report: {
        prefix: string;
        period: Period;
        label: string;
        range: string;
        timezone: string;
        generatedAt: string;
        failures: boolean;
        total: number;
        errors: number | null;
        previous: {
            label: string;
            total: number;
        } | null;
        chart: {
            bucket: import("..").TimeBucket;
            ids: string[];
            counts: number[];
        } | null;
        types: {
            total: number;
            errors: number | null;
            type: string;
        }[];
        routeCount: number;
        routes: (Row & {
            type: string;
            action: string;
            name: string;
        })[];
    };
}>;
export declare function listReports(): Promise<{
    key: string;
    reports: ReportMeta[];
}>;
export declare function getReport(idParam: string | null): Promise<any>;
export declare function deleteReport(idParam: string | null): Promise<{
    ok: boolean;
}>;
export {};
