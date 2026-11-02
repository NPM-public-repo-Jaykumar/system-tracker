export declare const MAX_FAILS = 3;
export declare const LOCK_SEC: number;
export declare const blockedKey: (prefix: string, username: string) => string;
export declare function lockedFor(prefix: string, username: string, now?: number): Promise<number>;
export declare function loginFailed(prefix: string, username: string, now?: number): Promise<number>;
export declare function loginSucceeded(prefix: string, username: string): Promise<void>;
