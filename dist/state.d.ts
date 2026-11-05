import type { RedisClient } from "./redis";
import type { AutoConfig, InitOptions, TimeBucket, TimeConfig } from "./types";
import type { Platform } from "./platform";
export declare const DEFAULT_TIME_CONFIG: Record<TimeBucket, {
    enable: boolean;
    expiry_in_sec: number;
}>;
export type Vault = {
    id: string;
    enc: Buffer;
    mac: Buffer;
};
export declare function setRedis(client: RedisClient): RedisClient;
export declare function getRedis(): RedisClient | null;
export declare function getRedisOrThrow(): RedisClient;
export declare function getReadyRedis(): Promise<RedisClient>;
export declare function setTimeConfig(cfg: TimeConfig): Record<TimeBucket, {
    enable: boolean;
    expiry_in_sec: number;
}>;
export declare function getTimeConfig(): Record<TimeBucket, {
    enable: boolean;
    expiry_in_sec: number;
}>;
export declare function setAutoConfig(cfg: AutoConfig | null): void;
export declare function getAutoConfig(): AutoConfig | null;
export declare function setInitOptions(options: InitOptions | null): void;
export declare function getInitOptions(): InitOptions | null;
export declare function isStarted(): boolean;
export declare function markStarted(): void;
export declare function setPlatform(platform: Platform | null): void;
export declare function getPlatform(): Platform | null;
export declare function isTurnedOff(): boolean;
export declare function setVault(vault: Vault | null): void;
export declare function getVault(): Vault | null;
