---
name: system-tracker
description: Use this skill when integrating the `system-tracker` npm package into a codebase, a single project or a workspace with several. It inspects the projects, asks the user step by step in plain words what to track (website pages, API, GraphQL, JSON-RPC, WebSockets, outside calls and more) with a recommended answer for each, then sets up `statis.init(...)`, the page-view script and the dashboard.
---

# system-tracker

Use this skill with the package docs at `https://www.npmjs.com/package/system-tracker`.

You are helping integrate the npm package `system-tracker` into a codebase.

## What `system-tracker` is for

- It stores Redis-based request counters per second, minute, hour, day, month and year.
- One `statis.init(...)` call counts every request the app handles automatically: API calls, page views, GraphQL, JSON-RPC, WebSockets, Socket.IO events, SSE and gRPC. Static files and outgoing calls can be turned on.
- There is no manual tracking API. Work that never arrives as a request (cron jobs, queue workers, scripts, business events) is not counted. If the user needs that, tell them system-tracker only counts incoming requests and, with `OUT`, outgoing calls.

## Package exports

- `statis` (only `statis.init(...)`)
- `searchKeys`
- `statRedis`

## Important API facts

- Call `statis.init(...)` once, at the top of the entry file, before the server starts listening.
- Minimal call:

```ts
import { statis } from "system-tracker";

statis.init({
  redis: "redis://127.0.0.1:6379",
  prefix: "qa-server",
});
```

- `redis` and `prefix` are passed to `init` directly; the package reads no environment variables.
- `redis` accepts one of:
- a `redis://` or `rediss://` (TLS) URL string, such as `"redis://default:secret@host:6379"`
- `{ host, port, username?, password? }` (standalone)
- `{ nodes: [{ host, port }, ...], username?, password? }` (cluster)
- `{ client: existingIoredisClient, type: "standalone" | "cluster" }` (reuse an existing client)
- All options and defaults:

| Option | Default | What it does |
| --- | --- | --- |
| `redis` | required | Redis connection |
| `prefix` | required | First part of every key; not empty, no `:` |
| `timeConfig` | all buckets on; 1h / 1d / 1d / 30d / 180d / 10y | Buckets to keep and their `expiry_in_sec`, e.g. `{ sec: { enable: false }, day: { expiry_in_sec: 90 * 24 * 60 * 60 } }` |
| `ignore.paths` | `[]` | Paths to skip, e.g. `["/health", "/metrics"]`; `"/admin/*"` matches a subtree |
| `ignore.methods` | `["OPTIONS", "HEAD"]` | Methods to skip |
| `ignore.bots` | `false` | Skip crawlers by user agent |
| `track` | all on except `STATIC` and `OUT` | Turn types on or off: `API`, `WEB`, `GRAPHQL`, `RPC`, `WSS`, `SSE`, `GRPC`, `OTHER`, `STATIC`, `OUT` |
| `global.total` | `true` | `{prefix}:global` keys |
| `global.perType` | `true` | `{prefix}:{TYPE}:global` keys |
| `failures` | `false` | Extra `:5xx` key for responses with status 500 or higher |
| `types` | `[]` | Custom types by path, e.g. `{ path: "/webhooks/*", type: "HOOK" }` |
| `operations` | `[]` | Read an operation name from the body, e.g. `{ path: "/action", type: "ACT", read: (body) => body.action }` |
| `limits.maxNamesPerType` | `200` | Names beyond this are counted as `<other>` |
| `limits.collapseAfter` | `50` | A URL part with more distinct values becomes `<slug>` |
| `name` | — | `(req) => ({ type, action, name })` to name any request yourself |
| `enabled` | `true` | `false` turns tracking off (e.g. in tests) |
| `ownDomains` | `[]` | Domains of the app's own backend, e.g. `["example.com"]`. Outgoing calls to them (and to local/private hosts, and to the domain the app is reached on) show as "your backend" instead of "third-party" in the dashboard |
| `dashboard` | off | `{ enable: true, url?: "/system-tracker", users?: [{ username, password }, ...], saveSampleCurl?: true }` serves a built-in dashboard from the app's own server; the app's log prints its full URL at startup. Anyone in `users` can sign in (`username` + `password` is a shorthand for one user). A wrong username or password gets the same "Wrong username or password"; 3 wrong tries block that username for 15 minutes, even with the right password (kept in Redis at `system-tracker:login-blocked:{prefix}:{username}`, expiring at the unlock time). `saveSampleCurl: false` keeps no recent requests or failures |

- Single-page apps (React, Angular, Vue, Next.js): the server sees only the first page load. To count page changes, add `<script src="/system-tracker/view.js" defer></script>` to the app's HTML (Next.js: `next/script` in `app/layout.tsx` or `pages/_app.tsx`; Angular: `src/index.html`; Vite/CRA: `index.html`; Nuxt: `app.head.script` in `nuxt.config.ts`; SvelteKit: `src/app.html`; Remix/React Router: `app/root.tsx`; anything else: the HTML every page shares). It posts each new path to `/system-tracker/view`, counted as `WEB`. When the pages come from another origin, use the API server's full URL and add `data-count-first`. Framework page-change requests (Next.js `RSC: 1` and `/_next/data/`, SvelteKit `__data.json`, Nuxt `_payload.json`, Remix/React Router `.data` and `?_data=`, Gatsby `/page-data/`, Inertia, htmx boost, pjax, Turbo Drive) aren't counted, so apps using them need the script to count page changes. Server-rendered sites where every link is a full page load don't need the script. If the app's Content Security Policy uses a nonce, pass the same nonce to the tag (Next.js: `nonce={nonce}` on `<Script>`), or the browser blocks it.

- Key layout:
- `{prefix}:{TYPE}:{ACTION}:{name}:{bucket}:{bucket_id}`
- `{prefix}:{TYPE}:{ACTION}:{name}:5xx:{bucket}:{bucket_id}` (only with `failures: true`)
- `{prefix}:global:{bucket}:{bucket_id}` (all requests; WebSocket messages, Socket.IO events and outgoing calls are not included)
- `{prefix}:{TYPE}:global:{bucket}:{bucket_id}`
- `name` is the route without the leading `/`. Numbers, UUIDs, ObjectIds, long hex strings, `0x` addresses and long tokens become `<id>`. Express routes use their own param names (`/users/:userId` → `users/<userId>`).
- Bucket ids are in IST (UTC+5:30).
- Types:

| TYPE | ACTION | Example key |
| --- | --- | --- |
| `API` (everything under `/api/` except GraphQL, and JSON elsewhere) | HTTP method | `qa-server:API:GET:api/users/<id>:min:2026-10-29-23-35` |
| `WEB` | HTTP method | `qa-server:WEB:GET:products/<id>:min:…` |
| `GRAPHQL` | `QUERY` / `MUTATION` / `SUBSCRIPTION` | `qa-server:GRAPHQL:QUERY:GetUser:min:…` |
| `WSS` | `CONNECT` / `MESSAGE` / `EVENT` | `qa-server:WSS:CONNECT:ws/chat:min:…` |
| `SSE` | HTTP method | `qa-server:SSE:GET:events/prices:min:…` |
| `GRPC` | `CALL` | `qa-server:GRPC:CALL:user.UserService/GetUser:min:…` |
| `RPC` (JSON-RPC, tRPC, Server Actions, a host or route with `rpc` in it; calls out to rpc hosts use action `OUT`) | `CALL` / `NOTIFY` / `ACTION` / `QUERY` / `MUTATION` / `SUBSCRIPTION`, HTTP method, or `OUT` | `qa-server:RPC:CALL:eth_getBalance:min:…`, `qa-server:RPC:OUT:rpc-testnet.supra.com/rpc/v1/block:min:…` |
| `OTHER` (404s, scanner paths) | HTTP method | `qa-server:OTHER:GET:<unmatched>:min:…` |
| `STATIC` (off) | HTTP method | `qa-server:STATIC:GET:assets/<file>:min:…` |
| `OUT` (off) | HTTP method | `qa-server:OUT:GET:rpc-testnet.supra.com/rpc/v1/block:min:…` |

- `WEB` is only what the browser shows as a page (Fetch Metadata `navigate` / `document`, or `Accept: text/html` from clients without it). Requests made by scripts (fetch, XHR, htmx, Turbo Frames) are `API` even when they return HTML. Scanner paths (`.php`, `.env`, `wp-…`) are `OTHER`; `robots.txt`, sitemaps, manifests and `/.well-known/` are `STATIC`.
- A host or route with `rpc` as a word part (`rpc.example.com`, `rpc-testnet.…`, `/rpc/…`, `/json-rpc`, `/jsonrpc`; not `grpc`/`trpc`) is `RPC`, even under `/api/`. Outgoing calls to such hosts are `RPC` with action `OUT` (needs `track.OUT`; not in the overall total).
- Anything else under `/api/` is `API`, whatever it returns; only GraphQL there keeps its own type. The dashboard (at `/system-tracker` or a custom `dashboard.url`) and `/system-tracker/view` are never counted.
- GraphQL and JSON-RPC are recognised from the JSON body on every framework: `req.body` when a body parser set it, otherwise the body as the app read it (up to 64 KB). GraphQL also via `GET ?query=`, `application/graphql` bodies and batches. See [Make every kind of traffic count](#make-every-kind-of-traffic-count) for what still isn't recognised.
- With the dashboard on, each route's page shows its recent requests as curl (the exact sample by default, or the structure) and its recent failures with the error response and, in Express, the stack. Outgoing calls (`OUT`) get the same, bodies included. Every screen has an Export button (CSV, PDF, JSON). No code is needed for this. These requests are kept as sent, tokens included; `dashboard.saveSampleCurl: false` (default `true`) keeps none of them: no recent requests, no failures, no error responses and no stacks, incoming or outgoing. 5xx counts (`failures: true`) are unaffected.
- Where to call `statis.init(...)`:
- Express, Fastify, Koa, plain Node: top of `server.ts` / `index.js`
- NestJS: `main.ts`, before `NestFactory.create()`
- Next.js: `instrumentation.ts`, inside `register()`, guarded by `if (process.env.NEXT_RUNTIME === "nodejs")` and loading the package with `await import("system-tracker")`
- Nuxt: `server/plugins/system-tracker.ts` inside `defineNitroPlugin(() => { ... })`
- SvelteKit (`adapter-node`): top of `src/hooks.server.ts`
- Remix / React Router: top of `app/entry.server.tsx`
- Astro (`@astrojs/node`): top of `src/middleware.ts`
- React, Vue, Angular, Svelte SPAs (Vite, CRA, Angular CLI): in the API server they call, not in the app; the page-view script then uses the API server's full URL with `data-count-first` when the pages are served from elsewhere
- For every framework whose pages change without a reload, also add the page-view script (see the single-page apps bullet above) in the same change, so the setup is complete.
- `prefix` is the environment the app runs in, read from the environment variable the project already uses: `prefix: process.env.APP_ENV ?? "development"` gives keys like `production:API:GET:…`, `staging:API:GET:…`, so local, staging and production counts never mix in a shared Redis (see [Config values](#config-values)). Never put per-request values such as `userId`, `walletAddress`, `tenantId` or `sessionId` inside it, and never `:`.
- Use the same `prefix` in every service that should share one `global` total.

### Reading counts

- The dashboard shows the counts, so don't add a stats endpoint or helper unless the user asks for one. If they do, use these:
- `searchKeys(pattern)` returns matching keys across standalone or cluster nodes.
- `statRedis` proxies the active Redis client for commands like `get`, `ttl`, `del`.

```ts
const keys = await searchKeys("qa-server:API:*:day:2026-10-29");
const counts = await Promise.all(
  keys.map(async (key) => ({ key, value: Number((await statRedis.get(key)) || 0) })),
);
```

## Workflow

1. Inspect the codebase first. Do not edit code yet.
2. Report what you found (see [First response format](#first-response-format)).
3. Ask the steps below one at a time, in plain words, each with a recommended answer.
4. Only after the final confirmation, change the code.

If you have no code access, ask for the root `package.json`, the startup/entry files, the Redis setup and the route files, then continue the same way.

## How to ask

- Ask in plain words first, the technical name second: "People opening pages of your website (`WEB`)", not "`track.WEB`?".
- If your tool has an interactive question picker (for example `AskUserQuestion` in Claude Code), use it: one question per step, short option labels, and a one-line description per option. Use multi-select for "what to track" questions. Otherwise, write the options as a numbered list and say how to reply (`1,3,4`, `yes`/`no`, or the option name).
- Mark the option you recommend with `(Recommended)` and put it first. Base it on what you found in the code, and say why in a few words (for example "found `ws` server in `src/socket.ts`").
- Ask only one step at a time and wait for the answer. If the answer is partial, confirm what's decided and ask only the missing part.
- Skip steps that don't apply (no frontend → no page-view step; no Redis question when the project's client is reused and its mode is clear). Say in one line that you skipped it and why.
- Never assume standalone vs cluster, which paths to ignore, or which optional types to turn on. Ask.

## What to inspect

### The workspace

- Is the root one project, or several? Look for a root `package.json` with `workspaces`, `pnpm-workspace.yaml`, `turbo.json`, `nx.json`, `lerna.json`, and folders such as `apps/*`, `packages/*`, `services/*`, `frontend/`, `backend/`, `client/`, `server/`, or several sibling folders with their own `package.json`.
- For each project, note its name and path, its framework, and its role:
  - **Server**: receives requests (Express, NestJS, Fastify, Koa, plain Node, a gRPC or WebSocket server). Needs `statis.init`.
  - **Full-stack**: serves pages and handles requests itself (Next.js, Nuxt, SvelteKit, Remix, React Router, Astro on Node). Needs `statis.init` and, when pages change without a reload, the page-view script.
  - **Frontend only**: built into static files (React, Vue, Svelte with Vite or Create React App, Angular CLI). Can't run `statis.init`; only the page-view script, pointing at the server it calls.
  - **Library or tooling**: shared packages, scripts, configs. Nothing to set up.
- Note which frontend calls which server (base URLs, proxies in `vite.config`, `angular.json`, `next.config`, env files).

### Each project

- Redis in the project: is there an `ioredis` client (reuse it), a `redis` (node-redis) or other client (its client can't be passed in; reuse its URL or host/port instead), a DI container or shared service module, a Redis URL in the config, or a `redis` service in `docker-compose.yml`. Standalone or cluster.
- Redis on this machine (when you can run commands), so the setup can be tried right away: `redis-cli ping` answers `PONG`, `docker ps` lists a running Redis container, or port 6379 is open on `127.0.0.1`. Only read; don't start or change anything without asking.
- The package manager, from the lockfile (`package-lock.json` → npm, `yarn.lock` → yarn, `pnpm-lock.yaml` → pnpm, `bun.lockb` → bun), to install `system-tracker` with. It brings its own Redis client (`ioredis`); nothing else needs installing.
- The environment variable the project uses to tell environments apart: `APP_ENV`, `ENVIRONMENT`, `STAGE`, `DEPLOY_ENV`, `VERCEL_ENV`, `RAILWAY_ENVIRONMENT`, or only `NODE_ENV`. Note its values (`development`, `staging`, `production`).
- Env files (`.env`, `.env.local`, `.env.development`, `.env.example`), whether they're in `.gitignore`, how they're loaded (`dotenv`, `@nestjs/config`, framework built-in), and any config schema (`zod`, `joi`, `envalid`, a typed `config.ts`) that new variables must be added to.
- Entry file and the best place for `statis.init(...)` (see "Where to call `statis.init(...)`" above).
- Traffic it handles, with the file that shows it:
  - pages rendered by the server, and whether pages change without a reload (client-side routing)
  - REST/JSON API routes
  - GraphQL (`apollo-server`, `graphql-yoga`, `mercurius`, a `/graphql` route)
  - JSON-RPC (`"jsonrpc": "2.0"` bodies, `/rpc` routes, `json-rpc-2.0`, `jayson`)
  - WebSockets or Socket.IO (`ws`, `socket.io`)
  - server-sent events (`text/event-stream`)
  - gRPC (`@grpc/grpc-js`)
  - calls the app makes to other services (`fetch`, `axios`, `http.request`, RPC providers, payment or email APIs)
  - static files served by the app
- Every route the app defines (router files, controllers, `app/api/**/route.ts`, `pages/api/**`, GraphQL resolvers, RPC method tables, socket event handlers), so you can predict the key each one gets. See [Make every kind of traffic count](#make-every-kind-of-traffic-count).
- Noisy paths: health checks, metrics, readiness probes, admin tools.
- Route groups that deserve their own `types` (webhooks, admin) and single-URL endpoints whose operation name is in a custom body field (`operations`).
- A Content Security Policy, and whether it uses a nonce (Next.js middleware setting `x-nonce`, `helmet` with nonces).
- Work that never arrives as a request (cron, queue workers, scripts). It won't be counted; say so.

## Make every kind of traffic count

Don't assume a kind of traffic is counted because the library is installed. For each one found, check the condition below against the code; when it doesn't hold, apply the fix in the same change, then verify it.

| Traffic | Counted when | If not, the fix |
| --- | --- | --- |
| GraphQL | the operation arrives as JSON `{ "query": "…" }` (POST, read by the app), `GET ?query=`, or `application/graphql` | Persisted queries that send only a hash (`extensions.persistedQuery`, no `query`): `operations: [{ path: "/graphql", type: "GRAPHQL", read: (b) => b.operationName }]`. Unnamed operations count as `<anonymous>`: name them in the client, or read a name the same way. |
| GraphQL subscriptions | over WebSockets (`graphql-ws`, `subscriptions-transport-ws`) they're counted as `WSS` connections and messages on the socket's path, not per operation | Say so; nothing to change. |
| Next.js Server Actions | a `POST` with a `Next-Action` header; counted as `RPC` `ACTION`, named by the page (under `/api/`: `API`) | Nothing to change. |
| tRPC | the path ends in `/trpc/{procedure}` (e.g. `/trpc/user.byId`); `RPC` `QUERY` / `MUTATION` / `SUBSCRIPTION`. Under `/api/` (e.g. `/api/trpc/user.byId`) it's `API`, by route | To count procedures by name under `/api/`: `operations` or `name`. |
| gRPC-Web, Connect | `POST /package.Service/Method` with a gRPC-Web, gRPC or Connect content type; counted as `GRPC` | Nothing to change. |
| JSON-RPC | the body has `"jsonrpc": "2.0"` and a `method`; counted as `RPC` `CALL` / `NOTIFY` by method. Under `/api/` it's `API` by route, unless the route or host has `rpc` in it (`/api/rpc`) | Bodies without `jsonrpc` (`{ "action": "swap" }`, `{ "op": … }`), or JSON-RPC under a plain `/api/` route by method: `operations: [{ path: "/action", type: "RPC", read: (b) => b.action }]`. |
| WebSockets | the socket server runs on a Node `http`/`https` server in the same process (`ws`, `socket.io`, `new WebSocketServer({ port })` all do) | Messages and Socket.IO events are counted only when `ws` / `socket.io` resolve from the folder the app starts in (its `node_modules`). In a monorepo started from the root, check this. `uWebSockets.js`, `Bun.serve` and `Deno.serve` aren't Node servers and can't be counted; say so. |
| Server-sent events | the response sets `Content-Type: text/event-stream` | Set that header on the stream (SSE needs it anyway). |
| gRPC | `@grpc/grpc-js` serves in the same process | A proxy or separate binary isn't counted; say so. |
| Outgoing calls | made with `http`, `https`, `fetch`, `undici` or a client built on them (axios, got, node-fetch), and `track: { OUT: true }` | Turn `OUT` on if the user chose it. When the app calls its own backend on a domain other than the one it's served on (or the dashboard is opened before any request, e.g. in local development against a remote API), add that domain to `ownDomains`. |
| Pages changed in the browser | the page-view script is in the shared layout | Add it (Step-6). |

Then make sure nothing important ends up under a catch-all name. Go through the routes you listed and predict each key; fix every one that would land in:

- `OTHER:…:<unmatched>`: on frameworks other than Express, any 404 outside `/api/` is `OTHER`, including a real route answering "not found" (`GET /v1/users/999`). Keep those under their route with a `types` entry that reuses the built-in type, for example `types: [{ path: "/v1/*", type: "API" }]`. Under `/api/` such a 404 is `API:…:<unmatched>`.
- `<unknown>`: an `operations` `read` that returns nothing for some requests. Read the field those requests do send, or fall back to another one.
- `<anonymous>`: GraphQL operations without a name (see the table).
- `<other>`: more names in a type than `limits.maxNamesPerType` (200). If the app really has more routes, raise it to fit, with room to grow.
- `<slug>`: a URL part with more than `limits.collapseAfter` (50) values. Fine for slugs and usernames; if a real fixed route family collapses, raise it.
- A route family that deserves its own name (webhooks, admin, a proxy under one path): give it a `types` entry.

With the dashboard on, requests under `<unmatched>`, `<other>`, `<unknown>` and `<anonymous>` keep their last 20 curls on the route's page. Mention it, so the user can find what's still unnamed later.

### Verify

When you can run the app and Redis is reachable, prove each fix with a real request, then look for the key:

```bash
curl -s -X POST localhost:3000/graphql -H 'content-type: application/json' -d '{"query":"query GetUser { user { id } }"}'
redis-cli --scan --pattern '<prefix>:GRAPHQL:*'      # expect <prefix>:GRAPHQL:QUERY:GetUser:…
```

Do the same for JSON-RPC (`<prefix>:RPC:*`), a WebSocket connection and message (`<prefix>:WSS:*`), and a 404 from a real route. Report what you checked and what you couldn't.

## First response format

Start with `I inspected the codebase.` Then:

- `Workspace:` single project, or a table of the projects found:

  | Project | Path | Framework | Role | Can track |
  | --- | --- | --- | --- | --- |
  | api | `apps/api` | Express | Server | API, JSON-RPC, WebSockets, outside calls |
  | web | `apps/web` | Next.js | Full-stack | pages, page changes, API |
  | admin | `apps/admin` | React (Vite) | Frontend only | page changes (via `api`) |

- `Found:` for each project to set up: Redis (yes/no, where), entry file, each kind of traffic with the file that shows it, noisy paths, possible custom `types`/`operations`, CSP nonce, work that won't be counted, env files and the environment variable, and whether Redis runs on this machine.
- `Best path:` where `statis.init(...)` and the page-view script go, reuse Redis or add it, and the options you recommend.
- `Steps:` list the steps that apply, then say: `Let's go step by step. I'll ask the first question now.` and ask only the first one.

## Steps

Ask only the steps that apply, in this order. In a workspace with several projects, Step-0 comes first, and Steps 4 to 11 are asked per chosen project (name the project in each question). Step-3 decides whether Steps 4 to 11 are asked at all.

- `Step-0` Which projects (only when the root has several)
  - Multi-select of the projects that can be tracked, with their role.
  - Recommend every Server and Full-stack project that handles real traffic. A Frontend-only project is set up together with the server it calls.
- `Step-1` Redis connection
  - An `ioredis` client found: `Reuse the Redis connection in <file> (Recommended)`: no new connection, no new config. / `Use a separate connection`.
  - Another client or only a URL found: `Use the project's Redis settings from <file/variable> (Recommended)`. system-tracker opens its own connection with them.
  - No Redis in the project, but one runs on this machine: `Use the Redis running locally at redis://127.0.0.1:6379 (Recommended)`: adds `REDIS_URL` to the local env file, so tracking works right away; set the real URL for staging and production on the hosting. / `I'll give a Redis URL` / `Stop here`.
  - No Redis anywhere: `Add Redis to this project (Recommended)`: adds `REDIS_URL` to the env files; offer to start one locally with Docker (`docker run -d --name redis -p 6379:6379 redis:7`) and run it only if the user says yes. / `Stop here`.
  - In every case: `system-tracker` is installed with the project's package manager, and it brings its own Redis client.
- `Step-2` Redis mode (only for a new connection, or when the existing mode is unclear): `Standalone` / `Cluster`. Recommend the one the project's hosting or config points to; if nothing does, recommend `Standalone` and say why.
- `Step-3` How to set up the rest. This keeps the setup fast.
  - First show the recommended settings in a short list, one line each, based on what you found: prefix, what to track, page-view script, skipped paths and crawlers, failures (always on), groups, time periods, dashboard. For example:

    ```text
    Prefix:        ${APP_ENV}                 (production, staging, development)
    Track:         defaults + calls to outside services (OUT: rpc.example.com, api.stripe.com)
    Page changes:  script in app/layout.tsx (with your CSP nonce)
    Skip:          /health, /metrics · crawlers skipped
    Failures:      counted (5xx), always on
    Time periods:  standard (sec 1h · min/hour 1d · day 30d · month 180d · year 10y)
    Dashboard:     on at /system-tracker, login from SYSTEM_TRACKER_DASHBOARD_USERNAME / _PASSWORD
    ```

  - Then ask: `How do you want to set up the rest?`
    - `Use the recommended settings (Recommended)`: skip Steps 4 to 11 and go straight to Step-12, with the list above.
    - `Recommended, but let me change some`: multi-select of the settings above, except failures, which is always on; ask only the steps for the ones picked, and use the recommended answer for the rest.
    - `Go through each setting`: ask Steps 4 to 11 one by one.
  - With several projects, show one list per project and ask once for all of them.
- `Step-4` Prefix (the first part of every key)
  - Recommend the environment variable you found, on its own, and show the code and the keys it gives, for example `process.env.APP_ENV ?? "development"` → `production:API:GET:…`. The fallback keeps it from being empty where the variable isn't set.
  - Options: `The project's <VARIABLE> (Recommended)` / `A fixed name` (only for one environment per Redis) / `Something else`.
  - If the project has only `NODE_ENV`, use it, but say that staging usually runs with `NODE_ENV=production`; if staging and production share one Redis, recommend adding an `APP_ENV` variable instead.
  - With several projects, they share this prefix, so their counts add up in one total and every dashboard shows all of them together. Say so. If two projects have routes with the same name and share a Redis, offer to keep them apart by adding the project name (`` `api-${process.env.APP_ENV ?? "development"}` ``).
- `Step-5` What to track (multi-select). One option per kind of activity, in plain words:

  | Option | Type | Default | Recommend when |
  | --- | --- | --- | --- |
  | People opening pages of your website | `WEB` | on | the project serves pages |
  | API calls to your backend (everything under `/api/`, and JSON elsewhere) | `API` | on | it has API routes |
  | GraphQL queries and mutations | `GRAPHQL` | on | GraphQL is found |
  | Real-time connections and messages (WebSockets, Socket.IO) | `WSS` | on | `ws` or `socket.io` is found |
  | Live streams to the browser (server-sent events) | `SSE` | on | `text/event-stream` is found |
  | JSON-RPC calls, Next.js Server Actions, tRPC procedures, and anything on a host or route with `rpc` in it (calls out to RPC hosts too, with `OUT` on) | `RPC` | on | JSON-RPC, `"use server"` actions, tRPC, `/rpc` routes or RPC providers are found |
  | gRPC calls | `GRPC` | on | gRPC is found |
  | Calls your app makes to its own backend or outside services (RPC providers, payment, email APIs) | `OUT` | off | outgoing calls are found; name them, and list the app's own backend domains in `ownDomains` |
  | Requests to unknown URLs (404s, bot scans) | `OTHER` | on | always |
  | Files like JS, CSS and images | `STATIC` | off | rarely; only if the app serves files and the user wants them counted |

  - Pre-select and mark `(Recommended)` what you found. For a built-in type you didn't find, say "not found in the code; leaving it on costs nothing until such traffic appears". Recommend leaving it on, so `init` stays short.
  - In `init`, write only the entries that differ from the defaults, for example `track: { OUT: true }`.
- `Step-6` Page changes in the browser (only for Full-stack or Frontend-only projects whose pages change without a reload)
  - `Count page changes inside the app (Recommended)`: adds the page-view script to `<file>`. / `Count only full page loads`.
  - Pages served from another origin than the server: use the server's full URL and `data-count-first`. CSP with a nonce: pass the nonce. Say which applies.
- `Step-7` Skip noise
  - Multi-select of the noisy paths found for `ignore.paths` (health, metrics, readiness probes), each `(Recommended)`.
  - Then: `Skip search engines and crawlers?` `Yes (Recommended)` for public websites, `No (Recommended)` for internal APIs.
- `Step-8` Failures: always on, don't ask. Add `failures: true` to every `init`. It counts failed requests (status 500 and above) in one extra `:5xx` key each, and powers the failure charts, failure rate and alerts in the dashboard. Tell the user it's on.
- `Step-9` Groups (only when found): offer the route groups as custom `types` (for example `/webhooks/*` as `HOOK`) and single-URL endpoints as `operations`. Recommend each one that's found; `Keep the defaults` is the other option.
- `Step-10` How long to keep counts:
  - `Standard (Recommended)`: every bucket, kept 1 hour (sec), 1 day (min, hour), 30 days (day), 180 days (month), 10 years (year). Nothing to add to `init`.
  - `Lighter`: no per-second counts (`sec: { enable: false }`). Fewer Redis writes.
  - `Longer history`: day counts for 90 days.
  - `Custom`: the user lists buckets and expiries, such as `hour,day,month` or `day: 90 days`.
  - Buckets not chosen get `enable: false`. Confirm the breakdown back.
- `Step-11` Dashboard. Strongly recommend it, with a login:
  - `Turn on the dashboard with a login from env variables (Recommended)`: adds `SYSTEM_TRACKER_DASHBOARD_USERNAME` and `SYSTEM_TRACKER_DASHBOARD_PASSWORD` (or names that follow the project's convention) to the env files, and reads them in `init`. It stays off wherever they aren't set, so it's never open by accident.
  - `Turn it on without a login`: local development only; anyone who can reach the URL sees the traffic and can change boards. Say this plainly.
  - `No dashboard`.
  - Write `url: "/system-tracker"` in `init` even though it's the default, so the path is visible in the code. Tell the user the URL it'll be at (for example `http://localhost:3000/system-tracker`), that the app's log prints it at startup (`[system-tracker] dashboard: http://localhost:3000/system-tracker`), and that reset data needs the login.
  - Tell them more people can sign in by adding them to `users`, and that 3 wrong tries block a username for 15 minutes (deleting `system-tracker:login-blocked:{prefix}:{username}` in Redis unblocks it early).
  - Say what they get: charts per route, insights, boards, an export of any screen, and on each route's page (outgoing calls included) its recent requests as curl (the exact sample or the structure, copyable into Postman) and its recent failures with the error response and stack. Those requests are kept as sent, tokens included, which is one more reason for the login. If the user is concerned about that (personal data, compliance), offer `saveSampleCurl: false`: counts and charts stay (5xx counts too), and no requests, failures, error responses or stacks are kept. Leave it out otherwise; `true` is the default.
- `Step-12` Final confirmation
  - Show, per project, the full `statis.init({...})` call, the page-view script tag and the file for each, the env variables to add (names and which files; never the password value).
  - Ask: `Should I make these changes now?` `Implement (Recommended)` / `Change something` / `Stop`.
  - On `Change something`, ask which setting, ask only that step, then show this confirmation again.

## Config values

system-tracker reads no environment variables itself. The project's own code reads them and passes the values to `statis.init(...)`:

```ts
const env = process.env;

statis.init({
  redis: env.REDIS_URL!, // or the project's existing variable, or { client: existingRedis, type: "standalone" }
  prefix: env.APP_ENV ?? "development", // the project's environment variable
  failures: true, // always: counts 5xx responses for the failure charts and alerts
  dashboard: {
    enable: Boolean(env.SYSTEM_TRACKER_DASHBOARD_USERNAME && env.SYSTEM_TRACKER_DASHBOARD_PASSWORD),
    url: "/system-tracker", // the default; the app's log prints the full URL at startup
    users: [{ username: env.SYSTEM_TRACKER_DASHBOARD_USERNAME!, password: env.SYSTEM_TRACKER_DASHBOARD_PASSWORD! }],
    // saveSampleCurl: false, // only if the user doesn't want recent requests or failures (tokens, error responses, stacks) kept
  },
});
```

- Reuse variables the project already has (its Redis URL, its environment variable) as they are. Only add new ones for what's missing.
- New variables follow the project's naming convention; without one, use `REDIS_URL`, `SYSTEM_TRACKER_DASHBOARD_USERNAME` and `SYSTEM_TRACKER_DASHBOARD_PASSWORD`.
- Add them to:
  - the local env file (`.env`, `.env.local`), with working local values. For the password, generate a strong random one (for example `openssl rand -base64 24`) instead of a word like `admin`.
  - `.env.example` (or the project's template), with the names and an empty or placeholder value, never the real password.
  - the project's config schema, if it has one.
- Make sure the local env file is in `.gitignore`. If it isn't, say so and offer to add it.
- Never use a browser-exposed prefix (`NEXT_PUBLIC_`, `VITE_`, `NUXT_PUBLIC_`, `REACT_APP_`) for these: they'd end up in the page.
- Make sure the env file is loaded before `statis.init(...)` runs (`import "dotenv/config"` at the top of the entry file, when the project uses `dotenv`; Next.js, Nuxt, SvelteKit and NestJS's `ConfigModule` handle it themselves, but check `instrumentation.ts` and other early files).
- Remind the user to set the same variables on their hosting (staging, production), with their own values.
- The `dashboard.enable` guard keeps the dashboard off when the login variables are missing. Without it, a missing variable would serve the dashboard with no login.

## Implementation rules

- Keep it simple. Change as few files as possible: usually the entry file (`statis.init`), the shared layout (the page-view script) and the env files. Don't create helper files, wrapper modules, config classes or abstractions for system-tracker; put the `init` call inline where it belongs, and match the surrounding code's style.
- Don't add packages besides `system-tracker`, and don't touch routes, controllers or business code.
- Call `statis.init(...)` once per server process, at the place listed in "Where to call `statis.init(...)`", before the server listens.
- Write only options that differ from the defaults, so `init` stays short and readable. `failures: true` is always one of them.
- If the project already has an `ioredis` client, prefer `statis.init({ redis: { client, type }, prefix })`.
- If Redis is set up fresh, pass its URL from an env variable (see [Config values](#config-values)). Never hardcode a Redis password or a dashboard password in source.
- Install `system-tracker` with the project's package manager.
- Add the page-view script in the same change as `init` whenever the user chose it in Step-6.
- Do not add a stats endpoint or stat-reading helper unless the user asks; the dashboard covers it.
- Do not add tracking calls to routes, controllers, services, workers or jobs; system-tracker has no manual tracking API.
- The prefix is the project's environment variable (Step-4). Never use per-request prefixes such as `qa-server:${userId}`.
- In tests, pass `enabled: false` to `statis.init(...)`.
- Set up `dashboard` as chosen in Step-11. With a login, read the username and password from env variables into `users` and guard `enable` with them, as in [Config values](#config-values). Add `saveSampleCurl: false` only when the user asked for it.

## After all changes are done

At the end, output a summary per project in this format:

```text
✅ system-tracker is implemented successfully.

Project: <name> (<path>)
- statis.init in: <path/to/entry-file>
- prefix: <prefix>
- tracking: <API, WEB, ... / changes from defaults>
- page-view script: <file, or not needed>
- custom types / operations: <list or none>
- ignored paths: <list or none>, bots: <skipped / counted>
- failures key: on (`failures: true`)
- time periods: sec <on/off, expiry> · min <…> · hour <…> · day <…> · month <…> · year <…>
- dashboard: <URL, with/without login, or off>; recent requests as curl: <kept / off (saveSampleCurl: false)>
- Redis connection: <reused client / URL from <variable>>
- env variables added: <names and files, or none>; set them on your hosting too

Not counted (never arrives as a request): <list of workers/jobs or none>

Walkthrough video (the dashboard, boards and settings): https://youtu.be/8VVgm_3hoZo
```
