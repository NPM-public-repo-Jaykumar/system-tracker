import type { IncomingMessage, Server } from "node:http";
export declare function announceOnListen(server: Server & {
    cert?: unknown;
}): void;
export declare function announceOnRequest(req: IncomingMessage): void;
