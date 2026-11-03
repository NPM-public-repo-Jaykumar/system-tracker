# How it works

[← Back to system-tracker](../README.md)

## Redis keys

Each request adds 1 to a key like this:

```text
{prefix}:{TYPE}:{ACTION}:{name}:{bucket}:{bucket_id}
```

Its value is the number of requests in that period. With `prefix: "demo"`:

```text
GET    /api/users/42   →  demo:API:GET:api/users/<id>:min:2026-10-29-23-35
PATCH  /api/users/42   →  demo:API:PATCH:api/users/<id>:min:2026-10-29-23-35
GET    /products/7     →  demo:WEB:GET:products/<id>:min:2026-10-29-23-35
```

| Part | Meaning | Example |
| --- | --- | --- |
| `prefix` | Your app or environment name | `demo` |
| `TYPE` | Kind of request (see [What gets counted](#what-gets-counted)) | `API` |
| `ACTION` | HTTP method, or the operation kind | `GET`, `QUERY`, `CALL` |
| `name` | Route, without the leading `/` (see [How routes are named](#how-routes-are-named)) | `api/users/<id>` |
| `bucket` | Time period | `sec`, `min`, `hour`, `day`, `month`, `year` |
| `bucket_id` | The period itself, in IST (UTC+5:30) | `2026-10-29-23-35` |

Bucket id formats:

| Bucket | Format | Example |
| --- | --- | --- |
| `sec` | `YYYY-MM-DD-HH-mm-ss` | `2026-10-29-23-35-12` |
| `min` | `YYYY-MM-DD-HH-mm` | `2026-10-29-23-35` |
| `hour` | `YYYY-MM-DD-HH` | `2026-10-29-23` |
| `day` | `YYYY-MM-DD` | `2026-10-29` |
| `month` | `YYYY-MM` | `2026-10` |
| `year` | `YYYY` | `2026` |

One route across all buckets:

```text
demo:API:PATCH:api/users/<id>:sec:2026-10-29-23-35-12     expires in 1 hour
demo:API:PATCH:api/users/<id>:min:2026-10-29-23-35        expires in 1 day
demo:API:PATCH:api/users/<id>:hour:2026-10-29-23          expires in 1 day
demo:API:PATCH:api/users/<id>:day:2026-10-29              expires in 30 days
demo:API:PATCH:api/users/<id>:month:2026-10               expires in 180 days
demo:API:PATCH:api/users/<id>:year:2026                   expires in 10 years
```

Every HTTP method gets its own keys:

```text
demo:API:GET:api/users:min:2026-10-29-23-30                 48   ← list users
demo:API:POST:api/users:min:2026-10-29-23-30                 6   ← create user
demo:API:GET:api/users/<id>:min:2026-10-29-23-30           212   ← get one user
demo:API:PUT:api/users/<id>:min:2026-10-29-23-30             9   ← replace user
demo:API:PATCH:api/users/<id>:min:2026-10-29-23-30          17   ← update user
demo:API:DELETE:api/users/<id>:min:2026-10-29-23-30          2   ← delete user
```

Totals:

```text
demo:global:min:2026-10-29-23-35         all requests
demo:API:global:min:2026-10-29-23-35     all API requests
demo:WEB:global:min:2026-10-29-23-35     all page views
demo:RPC:global:min:2026-10-29-23-35     all RPC calls, in and out
```

Every type has its own `{prefix}:{TYPE}:global` total. `demo:global` counts requests, connections and calls coming into your app. WebSocket messages, Socket.IO events and outgoing calls are left out of it; they are still counted in `demo:WSS:global` and `demo:OUT:global`.

Failed requests (status 500 or higher) can also get their own key; see [Choose what to track](settings.md#choose-what-to-track).

## What gets counted

| TYPE | What | ACTION | Example key |
| --- | --- | --- | --- |
| `API` | Everything under `/api/` (except GraphQL), and JSON / REST endpoints elsewhere | HTTP method | `demo:API:POST:api/orders:min:…` |
| `WEB` | Pages (HTML responses) | HTTP method | `demo:WEB:GET:blog/<slug>:min:…` |
| `GRAPHQL` | GraphQL operations | `QUERY`, `MUTATION`, `SUBSCRIPTION` | `demo:GRAPHQL:QUERY:GetUser:min:…` |
| `WSS` | WebSocket connections, messages, Socket.IO events | `CONNECT`, `MESSAGE`, `EVENT` | `demo:WSS:CONNECT:ws/chat:min:…` |
| `SSE` | Server-sent event streams | HTTP method | `demo:SSE:GET:events/prices:min:…` |
| `GRPC` | gRPC, gRPC-Web and Connect calls | `CALL` | `demo:GRPC:CALL:user.UserService/GetUser:min:…` |
| `RPC` | JSON-RPC calls, Next.js Server Actions, tRPC procedures, anything on a host or route with `rpc` in it, and calls out to such hosts | `CALL`, `NOTIFY`, `ACTION`, `QUERY`, `MUTATION`, `SUBSCRIPTION`, the HTTP method, or `OUT` for calls your app makes | `demo:RPC:CALL:eth_getBalance:min:…`, `demo:RPC:OUT:rpc-testnet.example.com/rpc/v1/block:min:…` |
| `OTHER` | Requests that match no route, and scanner paths (`.php`, `.env`, `wp-…`) | HTTP method | `demo:OTHER:GET:<unmatched>:min:…` |
| `STATIC` | JS, CSS, images, fonts — **off by default** | HTTP method | `demo:STATIC:GET:assets/<file>:min:…` |
| `OUT` | Calls your app makes to other services — **off by default** | HTTP method | `demo:OUT:GET:rpc-testnet.example.com/rpc/v1/block:min:…` |

How each type is detected, checked in this order (the first match wins):

1. **Your own naming**: the `name` option, if it returns a name. See [Name requests yourself](settings.md#name-requests-yourself).
2. **Custom types**: the path matches one of your `types`. See [Custom types](settings.md#custom-types).
3. **Operations**: the path matches one of your `operations`. See [One URL, many operations](settings.md#one-url-many-operations).
4. **`rpc` in the host or route** (`RPC`): `rpc` is a word part of the `Host` (or `X-Forwarded-Host`) or of the path, as in `rpc.example.com`, `rpc-testnet.example.com`, `/rpc/v1`, `/json-rpc` or `/jsonrpc`. Not `grpc`, `trpc` or `xrpcd`. This wins over `/api/`. A JSON-RPC body is named by its method, a tRPC call by its procedure, anything else by HTTP method and route.
5. **`/api/`** (`API`): the path is `/api` or starts with `/api/`, in any letter case. It's `API` whatever it returns: JSON, HTML, an event stream, a file, a JSON-RPC body or a tRPC call. Only a GraphQL operation (see `GRAPHQL` below) keeps its own type. A 404 that matched no route is named `<unmatched>`.
6. **Next.js Server Actions** (`RPC`, `ACTION`): a `POST` with a `Next-Action` header. The name is the page it was called from (`/` for the home page), since Next.js gives the action itself a new id on every build.
7. **tRPC** (`RPC`): the path ends in `/trpc/{procedure}`, as in `/trpc/user.byId`. A `GET` is a `QUERY`, a `POST` a `MUTATION`, and an event stream a `SUBSCRIPTION`. In a batch (`/trpc/a.list,b.count?batch=1`), each procedure is counted.
8. **gRPC-Web and Connect** (`GRPC`): a `POST` to `/package.Service/Method` with a `Content-Type` of `application/grpc-web…`, `application/grpc…` or `application/connect+…`, or a `Connect-Protocol-Version` header.
9. **JSON-RPC** (`RPC`): the parsed request body has `"jsonrpc": "2.0"` and a `method`. A call with an `id` is `CALL` and one without is `NOTIFY`. In a batch (`[{...}, {...}]`), each call is counted under its method and in `demo:RPC:global`, while `demo:global` counts the HTTP request once. Repeated methods in a batch are merged into one Redis write per key.
10. **`GRAPHQL`**: the parsed request body has a `query` that is a GraphQL document (it starts with `{` or with `query`, `mutation` or `subscription` and contains `{`). The name is `operationName`, else the name in the document, else `<anonymous>`. A REST body like `{"query": "shoes"}` stays `API`. Also recognised: a `GET` with the document in `?query=` (and `?operationName=`), an `application/graphql` body, and a batch (`[{...}, {...}]`), where each operation is counted.
11. **`OTHER`**: the response status is 404 and no route matched, or the path is one only vulnerability scanners ask a Node app for (`.php`, `.asp`, `.env`, `.git/`, `wp-…`, `phpmyadmin`, `cgi-bin/`), even when a catch-all route answers it. All of these share the single name `<unmatched>`, so bot scans can't create new keys. (Scanner paths are checked before the `rpc` and `/api/` rules, right after your own `operations`.)
12. **`SSE`**: the response `Content-Type` is `text/event-stream`.
13. **`STATIC`**: the file extension is `js`, `mjs`, `css`, `map`, `png`, `jpg`, `jpeg`, `gif`, `svg`, `ico`, `webp`, `avif`, `woff`, `woff2`, `ttf`, `otf`, `eot`, `mp4` or `webm`, or the path starts with `/_next/static/`. Site files for crawlers and browsers count here too: `robots.txt`, `sitemap*.xml`, `*.webmanifest`, `manifest.json`, `ads.txt`, `humans.txt`, `security.txt` and `/.well-known/…`. The file name becomes `<file>`.
14. **`WEB`**: what the browser shows as a page. The browser says so in its [Fetch Metadata](https://developer.mozilla.org/docs/Web/HTTP/Headers/Sec-Fetch-Mode) headers, which pages can't fake: `Sec-Fetch-Mode: navigate` or `Sec-Fetch-Dest: document` / `iframe` for a link, the address bar or a form. Clients that don't send them (curl, crawlers) count as a page load when they ask for `text/html`.
    - A request made by a script is `API`, even when it gets HTML back: `Sec-Fetch-Dest: empty` (fetch, XMLHttpRequest), `X-Requested-With: XMLHttpRequest`, `HX-Request` (htmx) or `Turbo-Frame`.
    - Otherwise a `text/html` (or XHTML) response is `WEB` when its status is below 400. An HTML error page is `WEB` only for a page load.
    - A page load with no `Content-Type` (a `304 Not Modified`, a load the user cancelled) or a redirect (a form post, a login) is `WEB`.
    - JSON opened in the address bar is still `API`.
15. **`API`**: everything else.

Detected outside this order:

- **`WSS`**:
  - `CONNECT` is counted when a request upgrades to a WebSocket.
  - `MESSAGE` counts each message received through the [`ws`](https://www.npmjs.com/package/ws) library on that connection.
  - `EVENT` counts each [Socket.IO](https://socket.io) event by name. `chat:send` becomes `chat/send`.
  - Socket.IO's own traffic (its polling requests and raw messages) is not counted separately.
- **`GRPC`**: an HTTP/2 stream with `Content-Type: application/grpc`. The name is the gRPC method path.
- **`OUT`**: requests made with `http`, `https` or `fetch`. The name is the host, plus `_port` for a non-default port, then the path, with the query string dropped. For example, `127.0.0.1_4000/rpc/v1/block`. The dashboard marks each one as a call to your backend or to a third party (see [Your own domains](#your-own-domains)).
  A call to a host or path with `rpc` in it (the same word-part rule as above, e.g. `rpc-testnet.example.com`) is counted as `RPC` with the action `OUT` instead, e.g. `demo:RPC:OUT:rpc-testnet.example.com/rpc/v1/block`. Like `OUT`, it's in `demo:RPC:global` but not in `demo:global`, and it's only watched while `track.OUT` is on.

### Your own domains

Outgoing calls (`track: { OUT: true }`) go either to your own backend or to third parties, and the dashboard shows them apart. A host counts as yours when:

- it's under a domain your app is reached on: a request to `qa.example.com` (or `X-Forwarded-Host: qa.example.com` behind a proxy) makes `qa-api.example.com` and `api.example.com` yours. Country domains such as `example.co.nz` are understood;
- it's local or private: `localhost`, a name without dots (a Docker or Kubernetes service such as `backend`), `*.local`, `*.internal`, `*.svc`, or a private IP such as `10.0.0.4` or `192.168.1.9`;
- or it's under one of the `ownDomains` you list, for when your backend is on a different domain, or before your app has served a request:

```ts
statis.init({
  redis: "redis://127.0.0.1:6379",
  prefix: "demo",
  track: { OUT: true },
  ownDomains: ["example.com", "example-api.io"], // also matches their subdomains
});
```

Either way they stay outgoing calls: they're counted in `demo:OUT:global`, not in `demo:global`. A request your app receives and the call it makes to your backend are one piece of work, and counting both would count it twice. The keys don't change; the dashboard sorts them by host when it shows them.

Always skipped:

- `OPTIONS` and `HEAD` requests (change with `ignore.methods`)
- Prefetches (`Next-Router-Prefetch`, `Purpose: prefetch`, `Sec-Purpose: prefetch` or `X-Sec-Purpose: prefetch` headers)
- Page changes a framework fetches from a script: Next.js (`RSC: 1` that isn't a page load, `/_next/data/...`), SvelteKit (`…/__data.json`), Nuxt (`…/_payload.json`), Remix and React Router (`….data`, `?_data=`), Gatsby (`/page-data/…`), and `GET`s with `X-Inertia`, `HX-Boosted`, `X-PJAX`, or `X-Turbo-Request-Id` outside a Turbo Frame. [The page-view script](frameworks.md#page-views-in-single-page-apps) counts those page changes
- Socket.IO long-polling requests (`/socket.io/...`)
- system-tracker's own URLs: the dashboard and its API at `/system-tracker` or your own `dashboard.url`, and the page-view script at `/system-tracker/view`. This holds in any letter case, and for anything under `/system-tracker` even with the dashboard off
- Next.js's own WebSocket in development (`/_next/webpack-hmr`, used for hot reload)

JSON-RPC and GraphQL are read from the JSON body: `req.body` when your app's body parser set it, otherwise the body as your app read it (Fastify, Koa, Next.js and plain Node keep theirs elsewhere). system-tracker never reads the body itself; it sees it while your app does, up to 64 KB. A body your app never reads, or a larger one without `req.body`, counts as `API`.

## How routes are named

The `name` part of a key is the route, without the leading `/`. The home page `/` is named `/`.

With Express (and NestJS, which uses Express), the route you wrote is used:

| Route | Name |
| --- | --- |
| `app.get("/users/:userId")` | `users/<userId>` |
| `router.get("/:id")` mounted at `/api/orders` | `api/orders/<id>` |
| `app.get("/items/:id?")` (Express 4) or `app.get("/items{/:id}")` (Express 5) | `items/<id>` |
| `app.get("/files/*")` | `files/<rest>` |
| `app.get("/files/*splat")` (Express 5) | `files/<splat>` |

A route that's only a wildcard, such as `app.all("*")` or `app.all("/{*splat}")` in a Next.js custom server or Remix and React Router on Express, says nothing about the page, so those requests are named from their URL, as below.

Everywhere else (plain Node, Fastify, Koa, Next.js), the URL is cleaned up:

| URL | Name | Why |
| --- | --- | --- |
| `/api/users/42` | `api/users/<id>` | Numbers become `<id>` |
| `/api/users/550e8400-e29b-41d4-a716-446655440000` | `api/users/<id>` | UUIDs become `<id>` |
| `/api/items/507f1f77bcf86cd799439011` | `api/items/<id>` | MongoDB ObjectIds become `<id>` |
| `/tx/deadbeefdeadbeef` | `tx/<id>` | Hex strings of 16+ characters become `<id>` |
| `/accounts/0x1a2b3c4d5e6f/balance` | `accounts/<id>/balance` | `0x` addresses (8+ hex characters) become `<id>` |
| `/reset/aB3dE5gH7jK9mN1pQ3rS` | `reset/<id>` | Tokens of 20+ letters/digits mixing both become `<id>` |
| `/api/search?q=eth&page=2` | `api/search` | Query string dropped |
| `/api/users/42/` | `api/users/<id>` | Trailing slash dropped |
| `/v1/things:batchGet` | `v1/things/batchGet` | `:` becomes `/` |
| `/files/<a 100-character name>` | `files/<slug>` | Parts longer than 64 characters become `<slug>` |
| `/a/b/c/…` (more than 16 parts) | first 16 parts + `/<rest>` | Very deep URLs are cut |
| `/blog/hello-world` | `blog/hello-world`, later `blog/<slug>` | See below |

Words like `hello-world` don't look like IDs. Once one position in a URL has seen more than 50 different values, every value there is counted as `<slug>`. This keeps blog posts, usernames and similar pages from creating keys forever. See [Limits](settings.md#limits).

URL parts are learned only from responses with a status below 400. An error response (401, 403, 500, …) to a URL part that has never had a successful response is named `<slug>`. This stops bots probing random URLs from filling your names or collapsing real routes. Express routes are always named from the route itself, whatever the status.

The URL is read as it arrived, so routes inside mounted routers (`app.use("/api", router)`) keep their full path for naming, `ignore.paths`, `types` and `operations`.

Placeholders you may see in names:

| Placeholder | Meaning |
| --- | --- |
| `<id>` | A number, UUID, ObjectId, long hex string, `0x` address or long token |
| `<paramName>` | An Express route parameter, e.g. `<userId>` |
| `<rest>` | An Express wildcard (`*`), or everything after the 16th part of a URL |
| `<slug>` | A URL part with too many different values, longer than 64 characters, or never seen in a successful response |
| `<file>` | A static file name |
| `<unmatched>` | A request that matched no route |
| `<other>` | A name beyond the per-type limit |
| `<anonymous>` | A GraphQL operation without a name |
| `<unknown>` | An operation name your `read` function could not find |

Names never contain `:` (it is replaced with `/`) and are cut at 200 characters, so every key splits cleanly on `:`.

## How it behaves

- **It never breaks your app.** Tracking errors are logged as `[system-tracker] … failed` and never thrown into your request handling. Response bodies and status codes are untouched.
- **Request bodies.** JSON bodies are watched as your app reads them, up to 64 KB, for GraphQL and JSON-RPC. With the dashboard on, other text bodies are too, for [recent requests](dashboard.md#recent-requests-and-failures). Nothing is read ahead of your app, and file uploads and binary bodies are skipped.
- **Quiet when Redis fails.** If Redis keeps returning errors (out of memory, read-only after a failover), the same error is logged at most once every 10 seconds, with a `suppressed` count of the ones skipped.
- **Redis cost.** Each key is one `EVALSHA` per enabled bucket (the script is sent once, then called by its hash). Repeated hits in one request are merged with `INCRBY`.
- **Redis down or still connecting.** Automatic counts are skipped until Redis is ready, so nothing piles up in memory. Requests that arrive in the first moments after startup, before the connection is up, are not counted.
- **When a request is counted.** When its response finishes, or when the client disconnects. A request the client aborts is counted once. The bucket is the time the request arrived; an SSE stream is counted when it closes, under the time it opened.
- **What isn't counted.** Only work that arrives as a request is counted (HTTP, WebSockets, Socket.IO, SSE, gRPC), plus outgoing calls with `track: { OUT: true }`. Cron jobs, queue workers and scripts that never receive a request aren't counted.
- **Calling `init` twice.** The second call is ignored and logs an error.
- **Invalid options.** An empty `prefix`, a `prefix` containing `:`, or an invalid `expiry_in_sec` makes `init` throw before it connects to Redis.
- **WebSocket and Socket.IO libraries.** `ws` and `socket.io` are picked up from your app's own `node_modules`. They are not dependencies of this package.
- **Redis Cluster.** Keys never contain `{` or `}`, so they spread across all cluster nodes.
- **Keys stay bounded.** IDs are replaced, unknown URLs share `<unmatched>`, and [limits](settings.md#limits) cap the rest.
- **Shared totals.** Keep the same `prefix` across services to get one combined `global` total. A different `prefix` gives a separate set of keys.
- **Tested with** Node.js 22, ioredis 5, Express 5, ws 8 and Socket.IO 4.


## Read the counts

`searchKeys(pattern)` finds keys using Redis patterns (`*` matches anything). With a cluster it searches every node. `statRedis` is the connected ioredis client.

```ts
import { searchKeys, statRedis } from "system-tracker";

async function todaysApiCounts() {
  const keys = await searchKeys("demo:API:*:day:2026-10-29");

  return Promise.all(
    keys.map(async (key) => ({
      key,
      value: Number((await statRedis.get(key)) || 0),
    })),
  );
}
```

More patterns:

```ts
searchKeys("demo:API:DELETE:*:day:2026-10-29");          // every DELETE today
searchKeys("demo:API:*:api/users/<id>:hour:*");          // all methods on one route, every hour
searchKeys("demo:WEB:*:day:2026-10-29");                 // all page views today
searchKeys("demo:RPC:CALL:*:min:2026-10-29-23-*");       // JSON-RPC calls per minute in one hour
searchKeys("demo:*:5xx:day:2026-10-29");                 // every failure key today
searchKeys("demo:global:day:*");                         // daily totals
searchKeys("demo:OUT:*:day:2026-10-29");                 // outgoing calls today
```

A stats endpoint (Express):

```ts
app.get("/api/statistics", async (req, res) => {
  const pattern = String(req.query.pattern || "demo:global:min:*");
  const keys = await searchKeys(pattern);

  res.json(
    await Promise.all(
      keys.map(async (key) => ({ key, value: Number((await statRedis.get(key)) || 0) })),
    ),
  );
});
```

That endpoint is itself counted (`demo:API:GET:api/statistics`). Add it to `ignore.paths` if you don't want it in your numbers.

- `statRedis` works with any Redis command (`get`, `ttl`, `del`, …).
- Errors are logged and return `null` instead of throwing.
- Before Redis is set up, calls log `redis not initialized` and return `null`.
