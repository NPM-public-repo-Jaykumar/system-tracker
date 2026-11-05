export declare const namesKey: (prefix: string) => string;
export declare const isHashed: (part: string) => boolean;
export declare function hashName(name: string): string;
export declare const routeKey: (prefix: string, type: string, action: string, name: string) => string;
export declare const routeId: (type: string, action: string, name: string) => string;
export declare function saveName(prefix: string, name: string): void;
export declare function loadNames(prefix: string, force?: boolean, now?: number): Promise<Map<string, string>>;
export declare function forgetNames(): void;
export declare function nameOf(hashed: string): string | null;
