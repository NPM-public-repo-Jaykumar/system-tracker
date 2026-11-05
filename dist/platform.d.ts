export declare const SERVERS_URL = "https://github.com/NPM-public-repo-Jaykumar/system-tracker/blob/main/guide/platforms.md#works-fully";
export type Platform = {
    works: "none" | "partly";
    name: string;
};
export type Notice = {
    id: string;
    kind: "platform";
    name: string;
} | {
    id: "paused";
    kind: "paused";
    at: number;
    minutes: number;
};
export declare function detectPlatform(env?: NodeJS.ProcessEnv): Platform | null;
export declare function offMessage(name: string): string;
export declare const pausedKey: (prefix: string) => string;
export declare function pauseFrom(lastTick: number, now: number): {
    at: number;
    minutes: number;
} | null;
export declare function watchPauses(prefix: string): NodeJS.Timeout;
export declare function platformNotice(prefix: string): Promise<Notice | null>;
