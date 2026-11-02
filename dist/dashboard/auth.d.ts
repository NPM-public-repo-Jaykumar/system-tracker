import type { IncomingMessage } from "node:http";
import type { DashboardConfig, DashboardLogin } from "../types";
export declare function needsLogin(cfg: DashboardConfig): boolean;
export declare function checkLogin(cfg: DashboardConfig, username: unknown, password: unknown): DashboardLogin | null;
export declare function isSignedIn(cfg: DashboardConfig, req: IncomingMessage, now?: number): boolean;
export declare function sessionCookie(cfg: DashboardConfig, user: DashboardLogin, req: IncomingMessage, now?: number): string;
export declare function clearCookie(cfg: DashboardConfig): string;
