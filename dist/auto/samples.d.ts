import type { IncomingMessage, ServerResponse } from "node:http";
import type { Hit } from "../types";
import { type Capture } from "./capture";
export type Sample = {
    sig: string;
    repeats?: number;
    at: number;
    method: string;
    scheme: string;
    host: string;
    url: string;
    template: string;
    headers: [string, string][];
    body?: string;
    bodyCut?: boolean;
    status: number;
    ms: number;
    response?: string;
    stack?: string;
};
export declare const samplesKey: (prefix: string, id: string) => string;
export declare const failuresKey: (prefix: string, id: string) => string;
export declare function keepSamples(prefix: string, hits: Hit[], req: IncomingMessage, res: ServerResponse, url: string, cap: Capture, startedAt: number): void;
export type OutCall = Omit<Sample, "sig" | "template"> & {
    template?: string;
};
export declare function keepOutSample(prefix: string, id: string, call: OutCall): void;
export declare function curlHeaders(pairs: [string, string][]): [string, string][];
