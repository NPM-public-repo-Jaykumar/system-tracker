import type { IncomingMessage } from "node:http";
import type { DashboardConfig, DashboardLogin } from "../types";
export declare const MAX_SESSION: number;
export declare const MAX_IDLE: number;
export declare const REVEAL_MS: number;
export type Session = {
    key: string;
    user: DashboardLogin;
    start: number;
    last: number;
    reveal: number;
};
export type Ended = "idle" | "expired" | "ended";
export declare function checkLogin(cfg: DashboardConfig, username: unknown, password: unknown): DashboardLogin | null;
export declare const sessionCookie: (cfg: DashboardConfig, req: IncomingMessage, token: string) => string;
export declare const clearCookie: (cfg: DashboardConfig, req: IncomingMessage) => string;
export declare function browserOf(cfg: DashboardConfig, req: IncomingMessage): {
    id: string;
    set?: string;
};
export declare function startSession(prefix: string, user: DashboardLogin, now?: number): Promise<string>;
export declare function readSession(cfg: DashboardConfig, prefix: string, req: IncomingMessage, now?: number): Promise<{
    session: Session;
} | {
    ended: Ended | null;
}>;
export declare function touch(session: Session, activeAt: number, now?: number): Promise<void>;
export declare function allowReveal(session: Session, now?: number): Promise<void>;
export declare function endSession(session: Session | null, prefix?: string, req?: IncomingMessage): Promise<void>;
