import type { IncomingMessage, ServerResponse } from "node:http";
export declare const VIEWS_PATH = "/system-tracker/view";
export declare function handleViews(req: IncomingMessage, res: ServerResponse): boolean;
