import type { AutoConfig, BuiltInType, DashboardOptions, InitOptions } from "./types";
export declare const BUILT_IN_TYPES: BuiltInType[];
export declare const OFF_BY_DEFAULT: BuiltInType[];
export declare function dashboardMissing(options?: DashboardOptions): "" | "a login (dashboard.users)";
export declare function keyProblem(key: unknown): "" | "secretKey (16+ characters)" | "a longer secretKey (16+ characters)";
export declare function resolveConfig(options: InitOptions): AutoConfig;
export declare function init(options: InitOptions): void;
