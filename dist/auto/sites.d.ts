import type { IncomingMessage } from "node:http";
export declare function siteOf(host: string): string | null;
export declare function learnSite(req: IncomingMessage): void;
export declare function isOwnHost(host: string): boolean;
export declare function outHost(name: string): string;
export declare function knownSites(): string[];
export declare function forgetSites(): void;
