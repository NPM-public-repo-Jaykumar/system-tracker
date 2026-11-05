import type { IncomingMessage } from "node:http";
import type Redis from "ioredis";
import type { Cluster } from "ioredis";
export type TimeBucket = "sec" | "min" | "hour" | "day" | "month" | "year";
export type TimeBucketConfig = {
    enable?: boolean;
    expiry_in_sec?: number;
};
export type TimeConfig = Partial<Record<TimeBucket, TimeBucketConfig>>;
export type RedisAuth = {
    username?: string;
    password?: string;
};
export type RedisStandalone = RedisAuth & {
    host: string;
    port: number;
};
export type RedisCluster = RedisAuth & {
    nodes: {
        host: string;
        port: number;
    }[];
};
export type BuiltInType = "API" | "WEB" | "GRAPHQL" | "RPC" | "WSS" | "SSE" | "GRPC" | "OTHER" | "STATIC" | "OUT";
export type Hit = {
    type: string;
    action: string;
    name: string;
};
export type RedisOption = string | RedisStandalone | RedisCluster | {
    client: Redis | Cluster;
    type: "standalone" | "cluster";
};
export type InitOptions = {
    redis: RedisOption;
    prefix: string;
    secretKey?: string;
    timeConfig?: TimeConfig;
    ignore?: {
        paths?: string[];
        methods?: string[];
        bots?: boolean;
    };
    track?: Partial<Record<BuiltInType, boolean>>;
    global?: {
        total?: boolean;
        perType?: boolean;
    };
    failures?: boolean;
    types?: {
        path: string;
        type: string;
    }[];
    operations?: {
        path: string;
        type: string;
        read: (body: any) => unknown;
    }[];
    limits?: {
        maxNamesPerType?: number;
        collapseAfter?: number;
    };
    ownDomains?: string[];
    name?: (req: IncomingMessage) => Hit | undefined;
    enabled?: boolean;
    platformCheck?: boolean;
    dashboard?: DashboardOptions;
};
export type DashboardLogin = {
    username: string;
    password: string;
};
export type DashboardOptions = {
    enable?: boolean;
    url?: string;
    users?: DashboardLogin[];
    username?: string;
    password?: string;
    saveSampleCurl?: boolean;
};
export type DashboardConfig = {
    path: string;
    users: DashboardLogin[];
    saveSampleCurl: boolean;
};
export type AutoConfig = {
    prefix: string;
    ignore: {
        paths: string[];
        methods: string[];
        bots: boolean;
    };
    track: Record<BuiltInType, boolean>;
    global: {
        total: boolean;
        perType: boolean;
    };
    failures: boolean;
    types: {
        path: string;
        type: string;
    }[];
    operations: {
        path: string;
        type: string;
        read: (body: any) => unknown;
    }[];
    limits: {
        maxNamesPerType: number;
        collapseAfter: number;
    };
    ownDomains: string[];
    name?: (req: IncomingMessage) => Hit | undefined;
    dashboard: DashboardConfig | null;
};
