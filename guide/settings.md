# Settings

[← Back to system-tracker](../README.md)

All settings go in the same `statis.init({...})` call. You only add the ones you want to change.

## Expiry

Choose which buckets to keep and for how long:

```ts
statis.init({
  redis: { host: "127.0.0.1", port: 6379 },
  prefix: "demo",
  timeConfig: {
    sec: { enable: true, expiry_in_sec: 60 * 60 }, // 1 hour
    min: { enable: true },                         // default: 1 day
    hour: { enable: true },                        // default: 1 day
    day: { enable: true, expiry_in_sec: 90 * 24 * 60 * 60 }, // 90 days
    month: { enable: false },
    year: { enable: false },
  },
});
```

Defaults:

| Bucket | Enabled | Expiry |
| --- | --- | --- |
| `sec` | yes | 1 hour |
| `min` | yes | 1 day |
| `hour` | yes | 1 day |
| `day` | yes | 30 days |
| `month` | yes | 180 days |
| `year` | yes | 10 years |

- Any bucket you leave out keeps its default.
- `expiry_in_sec` must be a whole number of seconds, 0 or more. Anything else makes `init` throw an error.
- The expiry is set when a key is created, so a key lives for its expiry from its first count.
- Each counted request writes one Redis key per enabled bucket, and more when totals or failure keys are on. Turning off buckets you don't need reduces Redis writes.

## Skip requests

```ts
statis.init({
  // ...
  ignore: {
    paths: ["/health", "/metrics", "/favicon.ico", "/internal/*"],
    methods: ["OPTIONS", "HEAD"], // default
    bots: true,                   // skip search engines and crawlers (default: false)
  },
});
```

- `paths`:
  - `"/health"` matches `/health` and `/health/`, but not `/healthz`.
  - `"/internal/*"` matches `/internal` and everything below it.
  - The query string is ignored.
  - Ignored paths also apply to WebSocket connections.
- `methods`: the list replaces the default. Pass `[]` to count `OPTIONS` and `HEAD` too.
- `bots`: skips requests whose `User-Agent` contains `bot`, `crawl`, `spider`, `slurp`, `bingpreview`, `facebookexternalhit` or `headless`.

## Choose what to track

Every type, with its default:

```ts
statis.init({
  // ...
  track: {
    API: true,      // /api/... and JSON / REST       demo:API:GET:api/users/<id>
    WEB: true,      // pages (HTML responses)         demo:WEB:GET:products/<id>
    GRAPHQL: true,  // GraphQL operations             demo:GRAPHQL:QUERY:GetUser
    RPC: true,      // JSON-RPC, tRPC, rpc hosts and routes  demo:RPC:CALL:eth_getBalance
    WSS: true,      // WebSocket connections, messages and Socket.IO events
                    //                                demo:WSS:CONNECT:ws/chat
    SSE: true,      // server-sent event streams      demo:SSE:GET:events/prices
    GRPC: true,     // gRPC calls                     demo:GRPC:CALL:user.UserService/GetUser
    OTHER: true,    // requests that match no route   demo:OTHER:GET:<unmatched>
    STATIC: false,  // JS, CSS, images, fonts         demo:STATIC:GET:assets/<file>
    OUT: false,     // calls your app makes to others demo:OUT:GET:api.stripe.com/v1/charges
  },
  global: {
    total: true,    // demo:global:{bucket}:{bucket_id}         — every request
    perType: true,  // demo:{TYPE}:global:{bucket}:{bucket_id}  — every request of one type
  },
  failures: false,  // true adds demo:{TYPE}:{ACTION}:{name}:5xx:… for status 500 and above
});
```

You only need to list what you change. Anything you leave out keeps the default above. For example, to turn on files and outgoing calls and turn off WebSockets:

```ts
statis.init({
  // ...
  track: { STATIC: true, OUT: true, WSS: false },
});
```

Turning a type off:

- `track.API: false`: requests under `/api/` and JSON/REST requests are not counted at all.
- `track.WEB: false`: page views are not counted.
- `track.GRAPHQL: false` / `track.RPC: false`: those calls are not counted. They do not fall back to `API`.
- `track.WSS: false`: no `CONNECT`, `MESSAGE` or `EVENT` keys.
- `track.SSE: false`, `track.GRPC: false`, `track.OTHER: false`: that type is not counted.
- `track.STATIC: true`: files are counted under `STATIC`. While it is off, files are not counted anywhere.
- `track.OUT: true`: outgoing `http`, `https` and `fetch` calls are counted.
- [Custom types](#custom-types) are always counted. `track` doesn't apply to them.

Totals:

| Setting | Keys written | Example |
| --- | --- | --- |
| `global.total: true` | one per counted request, connection or gRPC call | `demo:global:min:2026-10-29-23-35` |
| `global.perType: true` | one per type | `demo:API:global:min:2026-10-29-23-35`, `demo:WSS:global:min:…` |
| both `false` | no totals, only per-route keys | — |

`demo:global` leaves out WebSocket messages, Socket.IO events and outgoing calls. `demo:WSS:global` and `demo:OUT:global` still count them.

Failures: with `failures: true`, a request answered with status 500 or higher gets one extra key, next to its normal one:

```text
demo:API:GET:api/users/<id>:min:2026-10-29-23-35        all requests
demo:API:GET:api/users/<id>:5xx:min:2026-10-29-23-35    failed requests
```

The normal key still counts the failed request, so the failure rate is `5xx ÷ all`. Failure keys are only written for HTTP requests (any `TYPE` that has a status code), not for WebSocket messages, gRPC streams or outgoing calls.

## Custom types

Give a group of routes its own `TYPE`:

```ts
statis.init({
  // ...
  types: [
    { path: "/webhooks/*", type: "HOOK" },  // demo:HOOK:POST:webhooks/stripe:…
    { path: "/admin/*", type: "ADMIN" },    // demo:ADMIN:GET:admin/users:…
  ],
});
```

- `path` matches like `ignore.paths`. The first matching entry wins.
- `type` is upper-cased (`"hook"` becomes `HOOK`).
- The action is the HTTP method and the name follows [How routes are named](how-it-works.md#how-routes-are-named).
- Custom types are always counted; `track` doesn't apply to them.

## One URL, many operations

GraphQL and JSON-RPC are detected automatically (see [What gets counted](how-it-works.md#what-gets-counted)). If your app sends different operations to one URL some other way, tell `init` where to find the name in the request body:

```ts
statis.init({
  // ...
  operations: [
    { path: "/action", type: "ACT", read: (body) => body.action },
  ],
});
```

```text
POST /action {"action":"swap"}    →  demo:ACT:CALL:swap:min:…
POST /action {"action":"stake"}   →  demo:ACT:CALL:stake:min:…
POST /action {}                   →  demo:ACT:CALL:<unknown>:min:…
```

- `read` gets the parsed JSON body and must return a non-empty string.
- Anything else, including an error thrown inside `read`, counts as `<unknown>`.
- The action is always `CALL`, and `type` is upper-cased.

## Name requests yourself

For full control, return the type, action and name for a request. Return `undefined` to use the normal rules:

```ts
statis.init({
  // ...
  name: (req) => {
    if (req.url?.startsWith("/legacy/")) {
      return { type: "LEGACY", action: req.method ?? "GET", name: "legacy" };
    }
    return undefined;
  },
});
```

```text
GET /legacy/anything  →  demo:LEGACY:GET:legacy:min:…
```

- `req` is Node's `IncomingMessage`.
- All three values must be non-empty. `:` in them is replaced with `/`.
- Built-in type names you return still respect `track`.

## Limits

Some names come from outside your code: URLs typed by bots, Socket.IO event names, GraphQL operation names. Two limits keep the number of Redis keys bounded:

```ts
statis.init({
  // ...
  limits: {
    maxNamesPerType: 200, // default
    collapseAfter: 50,    // default
  },
});
```

- `maxNamesPerType`: each `TYPE` keeps at most this many names. New names after that are counted as `<other>`:

  ```text
  demo:API:GET:api/users/<id>:min:…    ← one of the first 200 names
  demo:API:GET:<other>:min:…           ← everything after that
  ```

- `collapseAfter`: once one position in a URL has seen more than this many different values, that position becomes `<slug>`:

  ```text
  /blog/post-1 … /blog/post-50       →  blog/post-1 … blog/post-50
  /blog/post-51, and from then on
  every /blog/… page (old ones too)  →  blog/<slug>
  ```

The limits are kept in memory and start again when the app restarts.

## All options

| Option | Default | What it does |
| --- | --- | --- |
| `redis` | required | Redis URL or connection (see [Connect to Redis](#connect-to-redis)) |
| `prefix` | required | First part of every key. Must not be empty or contain `:` |
| `timeConfig` | see [Expiry](#expiry) | Buckets to keep and their expiry |
| `ignore.paths` | `[]` | Paths to skip (see [Skip requests](#skip-requests)) |
| `ignore.methods` | `["OPTIONS", "HEAD"]` | Methods to skip |
| `ignore.bots` | `false` | Skip crawlers |
| `track` | all on, except `STATIC` and `OUT` | Turn types on or off |
| `global.total` | `true` | `{prefix}:global` keys |
| `global.perType` | `true` | `{prefix}:{TYPE}:global` keys |
| `failures` | `false` | Extra `:5xx` key for responses with status 500 or higher |
| `types` | `[]` | Your own types by path (see [Custom types](#custom-types)) |
| `operations` | `[]` | Read the operation name from the body (see [One URL, many operations](#one-url-many-operations)) |
| `limits.maxNamesPerType` | `200` | Names beyond this are counted as `<other>` |
| `limits.collapseAfter` | `50` | A URL part with more distinct values becomes `<slug>` |
| `name` | — | `(req) => ({ type, action, name })` to name any request yourself |
| `enabled` | `true` | `false` turns tracking off completely |
| `platformCheck` | `true` | `false` skips the hosting platform check (see [If the check gets it wrong](platforms.md#if-the-check-gets-it-wrong)) |
| `ownDomains` | `[]` | Domains of your own backend, for outgoing calls (see [Your own domains](how-it-works.md#your-own-domains)) |
| `dashboard` | off | `{ enable, url, users, saveSampleCurl }` (see [Dashboard](dashboard.md#dashboard)); `url` defaults to `"/system-tracker"`, `users` is a list of `{ username, password }` (3 wrong tries block a username for 15 minutes), `saveSampleCurl` defaults to `true` (`false` keeps no recent requests or failures, so no headers, bodies, error responses or stacks) |


## Connect to Redis

Pass the connection and the `prefix` straight to `init`. system-tracker never takes its settings from environment variables, so there are no variable names to remember. If you keep these values in your own config or env files, read them however you like and pass them in.

A Redis URL:

```ts
statis.init({
  redis: "redis://default:secret@127.0.0.1:6379",
  prefix: "production",
});
```

- `redis://` or `rediss://` (TLS). The port defaults to 6379; add `/2` at the end to use database 2.
- Any other URL makes `init` throw an error.

Standalone:

```ts
statis.init({
  redis: { host: "127.0.0.1", port: 6379 },
  prefix: "demo",
});
```

Secure standalone:

```ts
statis.init({
  redis: { host: "127.0.0.1", port: 6379, username: "default", password: "secret" },
  prefix: "demo",
});
```

Cluster:

```ts
statis.init({
  redis: {
    nodes: [
      { host: "127.0.0.1", port: 7000 },
      { host: "127.0.0.1", port: 7001 },
      { host: "127.0.0.1", port: 7002 },
    ],
  },
  prefix: "demo",
});
```

Secure cluster:

```ts
statis.init({
  redis: {
    nodes: [
      { host: "127.0.0.1", port: 7000 },
      { host: "127.0.0.1", port: 7001 },
      { host: "127.0.0.1", port: 7002 },
    ],
    username: "default",
    password: "secret",
  },
  prefix: "demo",
});
```

Your own ioredis client (standalone):

```ts
import Redis from "ioredis";
import { statis } from "system-tracker";

const client = new Redis({ host: "127.0.0.1", port: 6379 });

statis.init({
  redis: { client, type: "standalone" },
  prefix: "demo",
});
```

Your own ioredis client (cluster):

```ts
import Redis from "ioredis";
import { statis } from "system-tracker";

const client = new Redis.Cluster([
  { host: "127.0.0.1", port: 7000 },
  { host: "127.0.0.1", port: 7001 },
  { host: "127.0.0.1", port: 7002 },
]);

statis.init({
  redis: { client, type: "cluster" },
  prefix: "demo",
});
```

If `type` doesn't match the client (a cluster passed as `"standalone"`, or the reverse), `init` throws an error.

Use a different `prefix` per app or environment (`production`, `staging`, `development`) so their counts never mix.


## TypeScript

Types are included:

```ts
import type {
  InitOptions,      // options for statis.init
  DashboardOptions, // the dashboard option of statis.init
  Hit,              // { type, action, name } returned by the name option
  BuiltInType,      // "API" | "WEB" | "GRAPHQL" | "RPC" | "WSS" | "SSE" | "GRPC" | "OTHER" | "STATIC" | "OUT"
  RedisOption,      // the redis option of statis.init
  TimeConfig,       // timeConfig
  TimeBucket,       // "sec" | "min" | "hour" | "day" | "month" | "year"
  TimeBucketConfig,
} from "system-tracker";
```
