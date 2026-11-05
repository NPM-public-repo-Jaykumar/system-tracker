export declare const MAX_FAILS = 3;
export declare const LOCK_SEC: number;
export declare const POPUP_LOCK_SEC = 60;
export declare const blockedKey: (prefix: string, username: string) => string;
export type Lock = {
    seconds: number;
    by: "browser" | "username";
};
export declare function lockedFor(prefix: string, username: string, browser: string | null, now?: number): Promise<Lock | null>;
export declare function loginFailed(prefix: string, username: string, browser: string | null, now?: number, lockSec?: number): Promise<{
    lock: Lock | null;
    left: number;
}>;
export declare function loginSucceeded(prefix: string, username: string, browser: string | null): Promise<void>;
export declare function lockMessage(lock: Lock, popup?: boolean): string;
export declare function triesLeft(left: number, lockSec?: number): string;
