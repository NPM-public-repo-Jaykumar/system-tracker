import type { TimeBucket } from "../types";
declare const GROUPS: readonly [...TimeBucket[], "otherCounters", "samples", "failures", "boards", "reports"];
type Group = (typeof GROUPS)[number];
type GroupStat = {
    keys: number;
    bytes: number | null;
};
export type StorageView = {
    redis: {
        used: number | null;
        limit: number | null;
        limitFrom: "maxmemory" | "ram" | null;
        keys: number | null;
        nodes: number;
    };
    tracker: {
        keys: number;
        bytes: number | null;
        groups: Record<Group, GroupStat>;
        expiry: Partial<Record<TimeBucket, number>>;
        sampled: number;
        at: number;
    } | null;
    other: {
        keys: number | null;
        bytes: number | null;
    } | null;
    scanning: {
        checked: number;
        since: number;
    } | null;
    notes: string[];
};
export declare function storageView(recount?: boolean, now?: number): Promise<StorageView>;
export declare function storageSettled(): Promise<void>;
export declare function clearStorageCache(): void;
export {};
