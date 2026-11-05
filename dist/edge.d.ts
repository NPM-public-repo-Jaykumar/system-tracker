import type { RedisClient } from "./redis";
import type { InitOptions } from "./types";
export type { BuiltInType, DashboardOptions, Hit, InitOptions, RedisOption, TimeBucket, TimeBucketConfig, TimeConfig, } from "./types";
export declare const statis: {
    init(options: InitOptions): void;
};
export declare const statRedis: RedisClient;
export declare function searchKeys(_pattern: string): Promise<string[]>;
