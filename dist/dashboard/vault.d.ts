export declare const MIN_KEY = 16;
export declare function useKey(secretKey: string): void;
export declare function seal(where: string, text: string): string;
export declare function open(where: string, value: unknown): string | null;
export declare function openJson<T = any>(where: string, value: unknown): T | null;
export declare function mac(text: string): string;
