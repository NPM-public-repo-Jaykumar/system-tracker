# redis-tracker

Count every request your Node.js app handles in Redis, per second, minute, hour, day, month and year. That covers API calls, page views, GraphQL, JSON-RPC, WebSockets, Socket.IO, server-sent events and gRPC, plus outgoing calls if you turn them on.

You call it once at startup. Your routes need no tracking code.

## AI Prompt

Using an AI coding assistant (Claude Code, Cursor, Copilot)? Paste this into it. It looks through your project (or each project, when the folder holds several), asks in plain words what you want to track (website pages, API calls, WebSockets, calls to outside services and more) with a recommended answer for each, then sets up redis-tracker, server and browser parts included:

```
Read and strictly follow the SKILL.md file to implement the npm package "redis-tracker".

References:
NPM: https://www.npmjs.com/package/redis-tracker
SKILL.md: https://github.com/NPM-public-repo-Jaykumar/redis-tracker/blob/main/SKILL.md
```

## Contents

- **[Getting started](#getting-started):** [Install](#install) · [Quick start](#quick-start) · [Set up your framework](#set-up-your-framework) · [Page views in single-page apps](#page-views-in-single-page-apps) · [Dashboard](#dashboard) · [Read the counts](#read-the-counts) · [Connect to Redis](#connect-to-redis)
- **[Settings](#settings):** [Expiry](#expiry) · [Skip requests](#skip-requests) · [Choose what to track](#choose-what-to-track) · [Custom types](#custom-types) · [One URL, many operations](#one-url-many-operations) · [Name requests yourself](#name-requests-yourself) · [Limits](#limits) · [All options](#all-options)
- **[How it works](#how-it-works):** [Redis keys](#redis-keys) · [What gets counted](#what-gets-counted) · [How routes are named](#how-routes-are-named) · [How it behaves](#how-it-behaves)
- **[More](#more):** [Examples](#examples) · [TypeScript](#typescript) · [Demo](#demo)

## Getting started

### Install

npm:

```bash
npm install redis-tracker
```

yarn:

```bash
yarn add redis-tracker
```

If npm stops with `ERESOLVE could not resolve`, the conflict is between other packages already in your project (for example, a package that only supports React 18 in a React 19 app). redis-tracker has no peer dependencies. Install it with:

```bash
npm install redis-tracker --legacy-peer-deps
```

### Quick start

Add this at the top of your entry file, before your server starts:

```ts
import { statis } from "redis-tracker";

statis.init({
  redis: { host: "127.0.0.1", port: 6379 },
  prefix: "demo",
});
```

Every request is now counted:

```text
GET    /api/users/42   →  demo:API:GET:api/users/<id>:min:2026-10-29-23-35
PATCH  /api/users/42   →  demo:API:PATCH:api/users/<id>:min:2026-10-29-23-35
GET    /products/7     →  demo:WEB:GET:products/<id>:min:2026-10-29-23-35
```

Each key reads `{prefix}:{TYPE}:{ACTION}:{name}:{bucket}:{bucket_id}`, and its value is the number of requests in that period. [Redis keys](#redis-keys) explains each part.

Your routes don't change. Next, [set up your framework](#set-up-your-framework), then [read the counts](#read-the-counts).

### Set up your framework

Two parts, both in this section for each framework:

- **Server**: call `statis.init(...)` once, as early as possible, in the process that serves your requests. This counts every request.
- **Browser**: only for apps where moving to another page doesn't reload it (React, Vue, Angular, Svelte, Next.js, Nuxt, SvelteKit, Remix). Add one script to the HTML every page shares, so page changes are counted too. redis-tracker serves it from your server; there's nothing else to install. See [Page views in single-page apps](#page-views-in-single-page-apps) for how it works.

| Framework | Server: `statis.init` in | Browser: script in |
| --- | --- | --- |
| [Express](#express) | `server.ts` / `index.js` | not needed |
| [NestJS](#nestjs) | `main.ts` | not needed |
| [Fastify, Koa, plain Node](#fastify-koa-plain-node) | `server.ts` / `index.js` | not needed |
| [Next.js, App Router](#nextjs-app-router) | `instrumentation.ts` | `app/layout.tsx` |
| [Next.js, Pages Router](#nextjs-pages-router) | `instrumentation.ts` | `pages/_app.tsx` |
| [Nuxt](#nuxt) | `server/plugins/redis-tracker.ts` | `nuxt.config.ts` |
| [SvelteKit](#sveltekit) | `src/hooks.server.ts` | `src/app.html` |
| [Remix, React Router](#remix-react-router) | `app/entry.server.tsx` | `app/root.tsx` |
| [Astro](#astro) | `src/middleware.ts` | your layout, with `<ClientRouter />` only |
| [React, Vue, Angular, Svelte (Vite, CRA, Angular CLI)](#react-vue-angular-svelte-spa) | your API server | `index.html` |

The examples use `{ redis: { host: "127.0.0.1", port: 6379 }, prefix: "demo" }`; see [Connect to Redis](#connect-to-redis) for the other ways to connect.

#### Express

Server (`server.ts`):

```ts
import express from "express";
import { statis } from "redis-tracker";

statis.init({ redis: { host: "127.0.0.1", port: 6379 }, prefix: "demo" });

const app = express();
app.use(express.json());

app.get("/api/users/:id", (req, res) => {
  res.json({ id: req.params.id }); // counted as demo:API:GET:api/users/<id>
});

app.listen(4000);
```

Browser: not needed for pages rendered on the server (EJS, Pug, Handlebars), since every link loads a new page. If Express serves a React, Vue or Angular build, add the script to that app's `index.html` as in [React, Vue, Angular, Svelte](#react-vue-angular-svelte-spa).

#### NestJS

Server (`main.ts`):

```ts
import { NestFactory } from "@nestjs/core";
import { statis } from "redis-tracker";
import { AppModule } from "./app.module";

statis.init({ redis: { host: "127.0.0.1", port: 6379 }, prefix: "demo" });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
```

Browser: not needed; same as Express.

#### Fastify, Koa, plain Node

Server: put the same call at the top of `server.ts` / `index.js`, before the server starts listening:

```ts
import { statis } from "redis-tracker";

statis.init({ redis: { host: "127.0.0.1", port: 6379 }, prefix: "demo" });

// ...create and start your server
```

Browser: not needed; same as Express.

#### Next.js, App Router

Server (`instrumentation.ts`, next to `app/` or in `src/`):

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { statis } = await import("redis-tracker");
    statis.init({ redis: { host: "127.0.0.1", port: 6379 }, prefix: "demo" });
  }
}
```

Browser (`app/layout.tsx`):

```tsx
import Script from "next/script";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* redis-tracker: counts page changes made in the browser */}
        <Script src="/redis-tracker/view.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
```

If your app sets a Content Security Policy with a nonce, pass it to the `<Script>`; see [Content Security Policy](#content-security-policy).

#### Next.js, Pages Router

Server (`instrumentation.ts`): the same as the [App Router](#nextjs-app-router).

Browser (`pages/_app.tsx`):

```tsx
import Script from "next/script";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <Script src="/redis-tracker/view.js" strategy="afterInteractive" />
    </>
  );
}
```

#### Nuxt

Server (`server/plugins/redis-tracker.ts`):

```ts
import { statis } from "redis-tracker";

export default defineNitroPlugin(() => {
  statis.init({ redis: { host: "127.0.0.1", port: 6379 }, prefix: "demo" });
});
```

Browser (`nuxt.config.ts`):

```ts
export default defineNuxtConfig({
  app: {
    head: {
      script: [{ src: "/redis-tracker/view.js", defer: true }],
    },
  },
});
```

#### SvelteKit

Server (`src/hooks.server.ts`, with `@sveltejs/adapter-node`):

```ts
import { statis } from "redis-tracker";

statis.init({ redis: { host: "127.0.0.1", port: 6379 }, prefix: "demo" });
```

Browser (`src/app.html`), inside `<head>`:

```html
<script src="/redis-tracker/view.js" defer></script>
```

#### Remix, React Router

Server (`app/entry.server.tsx`), at the top:

```ts
import { statis } from "redis-tracker";

statis.init({ redis: { host: "127.0.0.1", port: 6379 }, prefix: "demo" });
```

Browser (`app/root.tsx`), inside `<head>`:

```tsx
<script src="/redis-tracker/view.js" defer />
```

#### Astro

Server (`src/middleware.ts`, with `@astrojs/node`):

```ts
import { defineMiddleware } from "astro:middleware";
import { statis } from "redis-tracker";

statis.init({ redis: { host: "127.0.0.1", port: 6379 }, prefix: "demo" });

export const onRequest = defineMiddleware((_context, next) => next());
```

Browser: only needed with `<ClientRouter />` (view transitions), which changes pages without a reload. Then add it to the layout every page uses, inside `<head>`:

```astro
<script is:inline src="/redis-tracker/view.js" defer></script>
```

#### React, Vue, Angular, Svelte (SPA)

These apps are built into static files, so there's no server of their own to call `init` in. Call it in the API server they talk to (see [Express](#express), [NestJS](#nestjs) or [Fastify, Koa, plain Node](#fastify-koa-plain-node)).

Browser (`index.html` for Vite and Create React App, `src/index.html` for Angular), inside `<head>`:

```html
<!-- the API server also serves the app's files -->
<script src="/redis-tracker/view.js" defer></script>

<!-- the app is served from somewhere else (a CDN, or a dev server on another port) -->
<script src="https://api.example.com/redis-tracker/view.js" data-count-first defer></script>
```

Use the API server's full URL when the pages come from somewhere else. `data-count-first` also counts the first page, since the API server never sees that page load.

#### What works where

| Framework | Requests counted | Route names | GraphQL / JSON-RPC |
| --- | --- | --- | --- |
| Express 4 / 5 | yes | Your Express routes | yes |
| NestJS (Express) | yes | Your controller routes | yes |
| Plain Node `http` / `https` | yes | Cleaned-up URL | yes |
| Fastify, Koa | yes | Cleaned-up URL | yes |
| Next.js, Nuxt, SvelteKit, Astro (Node) | yes | Cleaned-up URL | yes |

- Requests only reach the tracker if your Node process serves them. A site served by a CDN, Nginx or an edge runtime isn't counted.
- `init` runs when that file is first loaded. Requests that arrive before then aren't counted.

In tests, turn tracking off:

```ts
statis.init({
  redis: { host: "127.0.0.1", port: 6379 },
  prefix: "demo",
  enabled: process.env.NODE_ENV !== "test",
});
```

With `enabled: false`, `init` does nothing: no Redis connection and no hooks.

### Page views in single-page apps

In single-page apps, moving to another page happens in the browser without a reload, so your server sees only the first page load. The script added in [Set up your framework](#set-up-your-framework) reports each page change to your server.

Each time the path changes (`history.pushState`, `replaceState`, the back and forward buttons, or a `#/...` hash route), the script sends the new path to `POST /redis-tracker/view` with `navigator.sendBeacon`. It's counted as a `WEB` page view under the same name as a full page load, so `/products/12` and `/products/7` both count as `products/<id>`. Only the path counts: a new query string or `#section` on the same page doesn't. `track.WEB`, `ignore.paths` and `ignore.bots` apply as usual. The first page load is counted by your server, as before, so it isn't counted twice. Requests for the script and its reports never reach your routes and aren't counted as requests of their own.

With `enabled: false`, the script isn't served. The tag then gets a 404, which doesn't affect your pages.

Next.js fetches a page's data when the browser moves to it (requests with an `RSC: 1` header in the App Router, and `/_next/data/...` in the Pages Router). Those aren't counted as `API` calls; the script counts the page change instead.

#### Content Security Policy

If your app sets one:

- With a list of allowed sources, allow the script's origin in `script-src` and, when it's another server, in `connect-src`.
- With a nonce (`'nonce-…'`, often with `'strict-dynamic'`), pass the same nonce your other scripts get. In Next.js, read it in the layout and hand it to `<Script>`:

  ```tsx
  import { headers } from "next/headers";
  import Script from "next/script";

  // inside your async RootLayout
  const nonce = (await headers()).get("x-nonce") ?? undefined; // the header your middleware sets
  // ...
  <Script src="/redis-tracker/view.js" strategy="afterInteractive" nonce={nonce} />
  ```

  Without it, the browser blocks the script and page changes aren't counted.

### Dashboard

A built-in dashboard shows these counts in your browser. It's off by default. Turn it on in the same `init` call:

```ts
statis.init({
  redis: { host: "127.0.0.1", port: 6379 },
  prefix: "demo",
  dashboard: {
    enable: true,            // default: false
    url: "/system-tracker",  // default: "/system-tracker"
    username: "admin",       // optional: no login when omitted
    password: "change-me",   // optional: set both or neither
  },
});
```

Then open `/system-tracker` on your app's own host and port, for example `http://localhost:4000/system-tracker`. Your app's log prints the full URL once, when its server starts (or, when redis-tracker starts after the server, as with Next.js, on the first request):

```text
[redis-tracker] dashboard: http://localhost:4000/system-tracker (sign in with dashboard.username and dashboard.password)
```

| Option | Default | What it does |
| --- | --- | --- |
| `dashboard.enable` | `false` | Serve the dashboard |
| `dashboard.url` | `"/system-tracker"` | The path it's served at (leading and trailing `/` are optional) |
| `dashboard.username`, `dashboard.password` | — | Show a sign-in page. Set both or neither |

Four tabs, and each part loads only when you open it:

- **Overview**: your default board, when you set one (see [Boards](#boards)). Otherwise the built-in overview, with a range picker at the top: the last minute (per second), hour (per minute), 24 hours, 7 days, 30 days, 12 months or 5 years. Everything on the page covers that range: the requests in it, the current second, minute, hour, day, month or year next to the one before, the average and the busiest one; traffic stacked by type (hover a bar for each type and the total); one row per type with its trend, its current bucket (for example today), its total for the range (for example the last 7 days) and its share of that total; and the top routes, the same way. Outgoing calls (`OUT`) are listed too, split into calls to **your backend** and to **third parties** (see [Your own domains](#your-own-domains)), but they aren't requests to your app, so they're not part of the total, the stacked chart or the shares, just like `{prefix}:global` leaves them out. The most important insights sit above them. The totals come from the `{prefix}:global` and `{prefix}:{TYPE}:global` keys, read by exact name; the routes of the last minute or hour are read by name for the routes seen in the last two hours, and longer ranges with one `SCAN`, cached for 15 seconds. **Customize** turns it into a board you can rearrange; saving it makes it your Overview.
  - **Type** (click a row or a bar): the same range picker, and for that range its numbers, 5xx rate, share by route, methods (for `OUT`: your backend vs third-party), and every route with its requests, its current bucket and, with `failures: true`, its 5xx. Filter and sort them.
  - **Route** (click a route): one tile per bucket (seconds to years), which also picks the range, with how long each bucket is kept; the total, average, peak and lowest of the range, its failure rate, a chart with 5xx in red, and the raw bucket values. Below them, the route's [recent requests and failures](#recent-requests-and-failures) as curl commands.
- **Insights**: stats and problems for the last 15 minutes, the last hour, today, this week, this month, this quarter or this year, with reports you can export. Problems are grouped as critical, warning, spikes, drops, high traffic, scale, failures and new routes. Click one to open that route or type at the right time range. See [Insights](#insights).
- **Boards**: your own dashboards. See [Boards](#boards).
- **Settings**: try other settings and get the `init()` code for them. See [Settings](#settings-tab).

**Storage**: the top bar shows how much of Redis is in use and the tracker's share, for example `Redis 230 MB / 2 GB · tracker ≈28 MB`. It turns amber when Redis is 80% full. Hover it for the details, or click it for the **Storage in Redis** card on the Settings tab. That card has a bar for the tracker, everything else and the free space, and a table of the tracker's keys by group: each time bucket (with how long it's kept), recent requests, failures, boards and reports, with their key counts and sizes. Redis's own numbers come from `INFO memory` (`used_memory`, and `maxmemory`, or the server's RAM when no `maxmemory` is set) and `DBSIZE`, added up across cluster masters. The tracker's share comes from a `SCAN` of its keys in the background, at most once every 10 minutes and only while the dashboard is open. Sizes are estimated from `MEMORY USAGE` on a random sample of each group, so they're approximate. "Other" is everything else in Redis: other apps' keys and Redis's own overhead. **Recount** starts a new count (at most every 30 seconds). If your Redis provider blocks `INFO` or `MEMORY USAGE`, the card shows what it can, such as key counts only.

Hover any chart, including the small trend lines, to see the time and the value under the cursor. Click a chart's legend to hide or show a series.

#### Insights

**Stats by period**: pick the last 15 minutes, the last hour, today, this week (from Monday), this month, this quarter or this year, all in IST. The whole tab follows it: the stats, the three summary cards and the list of problems. You get the requests and how they compare with the period before, 5xx and their share, how many routes were called, the busiest minute, hour, day or month, a chart over the period, the split by type and the top 10 routes. Periods are read from the `min`, `day`, `month` and `year` buckets with one `SCAN` each, cached for 30 seconds, so they need those buckets turned on and kept long enough (a week needs 7 days of `day` buckets).

**Export** (on every screen: the Overview, a type, a route, a board, a template and Settings): downloads what the screen shows, at the range picked on it. That's the numbers at the top, each chart's data over time and each table (for a route: its buckets, newest first; for a board: every chart and table on it; for Settings: storage and what's tracked). Pick CSV, PDF (a print view) or JSON. A route's recent requests and failures are left out, since they can hold tokens. Each export is saved with the reports below, so you can download it again later.

**Export report** (Insights): pick a period, then CSV (for Excel or Google Sheets), PDF (a print view; choose "Save as PDF") or JSON, then click Export. A report has the totals, the chart, the split by type and up to 500 routes with their 5xx. Each export is also saved in your Redis, so the dialog lists earlier reports to download again in any format, or delete. They're kept at `redis-tracker:reports:{prefix}` (a list) and `redis-tracker:report:{prefix}:{id}` (one string per report), the newest 100.

**Reset data** (on the Overview and Insights): deletes counts for good. Pick what (everything, one type or one route) and when (all time, today, this week, this month, this quarter or this year). The dashboard first shows how many counters it will delete, then asks you to confirm. Only redis-tracker's own counter keys under your prefix are deleted, found with `SCAN` and checked against the key format, so other keys stay, and so do your boards and saved reports. Totals that include the deleted counts are lowered to match: deleting today lowers this month and this year, and deleting one route lowers its type's total and the overall total. Reset needs a dashboard login (`dashboard.username` and `dashboard.password`), so a dashboard without one can't delete anything. Each reset is written to your app's log, for example `[redis-tracker] dashboard reset (everything, all time): deleted 1345 counters, lowered 0 totals`.

**Problems**: the rules below are checked over the picked period, against the period before it. Spikes, drops and recent failures use steps that fit the period: minutes for the last 15 minutes and the last hour, hours for today, days for a week or month, months for a quarter or year. Every complete step inside the period is searched, so a burst ten minutes ago still shows in the last hour, with its time ("40× its usual traffic at 17:31"); the usual level is the median of the 30 steps before it, or their average when most are empty, and hours and days are compared with the same hour or weekday earlier. Today and longer periods also list what the last hour found minute by minute, tagged "last hour", since a burst of a few minutes doesn't show in hourly or daily totals. The badge on the Insights tab and the Overview always show what's unusual right now (the last 30 minutes and today, like this table); the badge refreshes on every page, and those alerts are always in the list too, tagged "right now", whatever the period. Top routes can be folded away; the dashboard remembers it. Each refresh checks every route counted today, and the minute-by-minute traffic of up to 100 of them (the busiest, plus any with failures):

| Group | When | Level |
| --- | --- | --- |
| Failures | 5xx are 5% or more of a route's calls today (at least 50 calls), or 20% or more in the last 10 minutes | critical |
| Failures | 5xx are 1% or more today | warning |
| Spike | the last full minute is 3× the route's usual minute (the median of the 30 before it) and at least 30 calls more. A client stuck in a loop looks like this | warning; critical at 10× |
| Drop | a route that usually gets 30+ calls a minute got 20% or less of that over the last 3 minutes | warning |
| High traffic | one route has 40% or more of all calls today (with at least 10,000 calls and 3 routes); or today is on track for 1.5× yesterday | info |
| Scale | a type uses 80% of `limits.maxNamesPerType`; calls were counted as `<other>`; or 10% of a type's calls matched no route | warning or info |
| New | a route has calls today and none yesterday | info |

#### Recent requests and failures

Each route's page lists its recent requests, so you can see what's being sent and replay it. That includes outgoing calls (`OUT`): the call your app made to your backend or a third party, with its body. Pick the format at the top:

- **curl sample** (the default): the request exactly as it was sent, ready to run.
- **curl structure**: the route with its parameters, and every value replaced by its type. Use it to see the shape of a request. The browser remembers your choice.

curl structure:

```bash
curl -X POST 'https://api.example.com/api/users/:userId/profile?lang=<string>' \
  -H 'content-type: application/json' \
  -H 'authorization: <authorization>' \
  --data-raw '{
  "username": "<string>",
  "age": "<number>"
}'
```

curl sample:

```bash
curl -X POST 'https://api.example.com/api/users/42/profile?lang=en' \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer eyJhbGciOi…' \
  --data-raw '{"username":"jay","age":10}'
```

**Copy** puts the command on your clipboard. Paste it in a terminal, or in Postman with **Import → Raw text**. In a GraphQL body, the query and operation name stay as they are and only the variables become types; in a JSON-RPC body, so does the method.

- **Recent requests**: the last 5 per route, at most one a minute, newest first. Names that many different requests share (`<unmatched>`, `<other>`, `<unknown>`, `<anonymous>`) keep the last 20, at most one every 2 seconds, so you can see what's behind them.
- **Recent failures**: the last 20 requests answered with status 500 or above, at most one a second per route. Each also has the start of the error response (up to 2 KB) and, in Express apps, the stack of the error passed to `next(err)` or thrown in a route. For outgoing calls, a call that got no response at all (a reset connection or a timeout) is a failure too, with its error.
- **No duplicates**: a request with the same method, URL (path and query) and body as one already in the list isn't added again. That entry moves to the top with the latest time, response and stack, and shows how many times it was captured (×3). So the list holds different requests, and repeats don't push them out.

What's kept:

- The method, URL, headers and body (up to 16 KB) as they were sent, including `Authorization`, cookies and API keys. Only connection headers (`Host`, `Content-Length`, `Connection`, `Accept-Encoding`, …) are left out; the host is part of the URL. Because of this, set a dashboard login, and keep your Redis private.
- HTTP requests your app receives, and outgoing calls made with `fetch`, `http` or `https` (axios, got and node-fetch use these). An outgoing body is kept when it's text: a string, `URLSearchParams` or a buffer for `fetch`, and whatever is written to the request for `http` and `https`. Form data and streams aren't read. WebSocket traffic and gRPC have no curl.
- Saved in your Redis as lists at `redis-tracker:samples:{prefix}:{TYPE}:{ACTION}:{name}` and `redis-tracker:failures:{prefix}:{TYPE}:{ACTION}:{name}`, kept 30 days after their last write. Resetting a route, a type or everything for all time deletes them too.
- Only while the dashboard is on. Without `dashboard.enable`, nothing is kept. So a route can have counts but no requests to show: counts from before the dashboard was turned on, or older than 30 days. The next request shows up within a minute.

#### Settings tab

Toggle what to track, totals, failures, skipped requests, time buckets and limits. A change is only a preview: the dashboard hides what you turned off, and your app keeps tracking as before. Below the settings, your current `statis.init()` call is shown with the change applied, new lines in green and removed lines in red. Copy it into your code and restart to apply it. Credentials (Redis and dashboard usernames and passwords, and the ones in a Redis URL) are hidden on the server and never reach the browser.

#### Boards

Build dashboards of your own. The Boards tab has two parts:

- **Default templates**: ten ready-made boards. Open one to see it with your live data, then **Use this template** (saves a copy) or **Customize** it first. A template itself never changes; saving always creates your own copy. Charts that need a type your app doesn't track, or `failures: true`, are left out.

  | Template | For | Shows |
  | --- | --- | --- |
  | Everyday overview | everyone | insights, totals, traffic by type, the mix, busiest routes, 30 days |
  | DevOps / SRE | on-call, operations | requests per second, 5xx, failure rate, spikes, routes with 5xx |
  | Product owner | product | daily and monthly usage, most used features and pages, pages vs API |
  | Backend developer | developers | API routes with 5xx, calls by HTTP method, GraphQL and RPC operations |
  | QA & testing | QA | 5xx per minute and per route, failure rate, anything new or unusual |
  | API health | API teams | API calls, failures and failure rate, route by route |
  | Live wall | big screens | per-second traffic and this minute, with Live refresh |
  | Capacity planning | engineering leads | hours, days, months and years, and how the mix changes |
  | Web & pages | frontend | page views next to API calls, top pages, daily trend |
  | Integrations & realtime | platform | outgoing calls by host, WebSocket, SSE, gRPC, GraphQL and RPC |

- **Your templates**: the boards you saved, plus a blank board and a customized Overview.

Add charts in four steps:

1. **What to track**: all traffic, a type, one route, or a pattern with `*` wildcards (for example type `API`, method `*`, name `api/users*`). The editor shows which routes a pattern matches. Add up to 6 series to compare them on one chart.
2. **Show as**: number, line, area, bars, stacked bars, donut, table or insights. Donuts and tables split a type or pattern by route, all traffic by type, several series against each other, and one route into calls with and without 5xx, so you can switch any chart to any kind.
3. **Measure**: requests, 5xx or failure rate (5xx needs `failures: true`).
4. **Range and size**: the last minute (per second), hour (per minute), 24 hours, 30 days, 12 months or 5 years; then the size on the grid.

The pencil next to a board's name, on the Boards tab and on the board itself, renames it right away. **Edit board** also lets you rename it, along with everything else.

Click **Edit board** to change a board: drag a chart to move it (the others make room as you go and keep their sizes), drag any edge or corner to resize it, add, edit, duplicate or remove charts, and rename the board. When a chart gets wider than its row allows, the next charts move to the row below. While you edit, clicking a chart doesn't open anything, there's extra room below the last chart, and the page scrolls when you drag near its edge. Nothing changes until you click **Save**, which stores the board and opens it; **Cancel** drops the changes. Templates and **Customize** on the Overview open the same way, as an unsaved draft.

**Set as default** makes a board your Overview: the Overview tab and the dashboard URL open it. **Reset to default Overview** brings back the built-in one. Saving a customized overview makes it your default board.

Charts sit on a grid four units wide (two on tablets, one on phones), and sizes snap to whole units, width × height:

| Chart | Smallest | Largest |
| --- | --- | --- |
| Number | 1×1 | 2×2 |
| Line, area, bars | 1×1 | 4×3 |
| Stacked bars, insights | 2×1 | 4×3 |
| Donut | 2×2 | 4×3 |
| Table | 2×2 | 4×4 |

Charts on boards work like the built-in ones: hover for the crosshair and values, click the legend to hide a series, and click a bar, number, row or slice to open that route or type. Tables and donuts add up the whole range they show. Only types your app tracks can be charted. Text that doesn't fit ends in "…"; hover it to see all of it.

Boards are saved in your Redis, as one JSON string at `redis-tracker:dashboards:{prefix}` (at most 50 boards and 256 KB). Restarts and redeploys keep them, and every instance of your app and everyone using the dashboard shares them. Each save is also logged to the browser console.

How it behaves:

- Your app's own server answers it (Express, NestJS, Fastify, Koa, Next.js or plain Node). No extra port, no extra dependency. Dashboard requests never reach your routes and are never counted.
- Pick how often it refreshes: live (every second), 5 s, 30 s (the default), 1 min, 5 min, 15 min, or off. ↻ refreshes right away. It doesn't refresh while the tab is hidden. A chart under your mouse pointer waits, so what you're reading holds still; it catches up as soon as the pointer leaves.
- It's dark by default; the theme button switches to light. The browser remembers both choices.
- It works on any screen size: on tablets and phones the layout stacks, tables scroll sideways and charts keep their proportions.
- With a username and password, signing in sets an `HttpOnly`, `SameSite=Strict` cookie for 7 days. Changing the password signs everyone out.
- Without them, anyone who can reach the URL can see your routes and traffic, the recent requests with their headers and bodies, and change your boards. The page shows a warning, and the server logs one at startup. In production, set a login and serve it over HTTPS.
- Times are in IST, like the bucket ids in the keys.

### Read the counts

`searchKeys(pattern)` finds keys using Redis patterns (`*` matches anything). With a cluster it searches every node. `statRedis` is the connected ioredis client.

```ts
import { searchKeys, statRedis } from "redis-tracker";

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

### Connect to Redis

Pass the connection and the `prefix` straight to `init`. redis-tracker never reads environment variables, so there are no variable names to remember. If you keep these values in your own config or env files, read them however you like and pass them in.

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
import { statis } from "redis-tracker";

const client = new Redis({ host: "127.0.0.1", port: 6379 });

statis.init({
  redis: { client, type: "standalone" },
  prefix: "demo",
});
```

Your own ioredis client (cluster):

```ts
import Redis from "ioredis";
import { statis } from "redis-tracker";

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

## Settings

All settings go in the same `statis.init({...})` call. You only add the ones you want to change.

### Expiry

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

### Skip requests

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

### Choose what to track

Every type, with its default:

```ts
statis.init({
  // ...
  track: {
    API: true,      // JSON / REST endpoints          demo:API:GET:api/users/<id>
    WEB: true,      // pages (HTML responses)         demo:WEB:GET:products/<id>
    GRAPHQL: true,  // GraphQL operations             demo:GRAPHQL:QUERY:GetUser
    RPC: true,      // JSON-RPC calls                 demo:RPC:CALL:eth_getBalance
    WSS: true,      // WebSocket connections, messages and Socket.IO events
                    //                                demo:WSS:CONNECT:ws/chat
    SSE: true,      // server-sent event streams      demo:SSE:GET:events/prices
    GRPC: true,     // gRPC calls                     demo:GRPC:CALL:user.UserService/GetUser
    OTHER: true,    // requests that match no route   demo:OTHER:GET:<unmatched>
    STATIC: false,  // JS, CSS, images, fonts         demo:STATIC:GET:assets/<file>
    OUT: false,     // calls your app makes to others demo:OUT:GET:rpc-testnet.supra.com/rpc/v1/block
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

- `track.API: false`: JSON/REST requests are not counted at all.
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

### Custom types

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
- The action is the HTTP method and the name follows [How routes are named](#how-routes-are-named).
- Custom types are always counted; `track` doesn't apply to them.

### One URL, many operations

GraphQL and JSON-RPC are detected automatically (see [What gets counted](#what-gets-counted)). If your app sends different operations to one URL some other way, tell `init` where to find the name in the request body:

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

### Name requests yourself

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

### Limits

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
  demo:RPC:CALL:eth_getBalance:min:…   ← one of the first 200 names
  demo:RPC:CALL:<other>:min:…          ← everything after that
  ```

- `collapseAfter`: once one position in a URL has seen more than this many different values, that position becomes `<slug>`:

  ```text
  /blog/post-1 … /blog/post-50       →  blog/post-1 … blog/post-50
  /blog/post-51, and from then on
  every /blog/… page (old ones too)  →  blog/<slug>
  ```

The limits are kept in memory and start again when the app restarts.

### All options

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
| `ownDomains` | `[]` | Domains of your own backend, for outgoing calls (see [Your own domains](#your-own-domains)) |
| `dashboard` | off | `{ enable, url, username, password }` (see [Dashboard](#dashboard)); `url` defaults to `"/system-tracker"` |

## How it works

### Redis keys

Each request adds 1 to a key like this:

```text
{prefix}:{TYPE}:{ACTION}:{name}:{bucket}:{bucket_id}
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
demo:RPC:global:min:2026-10-29-23-35     all JSON-RPC calls
```

Every type has its own `{prefix}:{TYPE}:global` total. `demo:global` counts requests, connections and calls coming into your app. WebSocket messages, Socket.IO events and outgoing calls are left out of it; they are still counted in `demo:WSS:global` and `demo:OUT:global`.

Failed requests (status 500 or higher) can also get their own key; see [Choose what to track](#choose-what-to-track).

### What gets counted

| TYPE | What | ACTION | Example key |
| --- | --- | --- | --- |
| `API` | JSON / REST endpoints | HTTP method | `demo:API:POST:api/orders:min:…` |
| `WEB` | Pages (HTML responses) | HTTP method | `demo:WEB:GET:blog/<slug>:min:…` |
| `GRAPHQL` | GraphQL operations | `QUERY`, `MUTATION`, `SUBSCRIPTION` | `demo:GRAPHQL:QUERY:GetUser:min:…` |
| `RPC` | JSON-RPC calls, Next.js Server Actions, tRPC procedures | `CALL`, `NOTIFY`, `ACTION`, `QUERY`, `MUTATION`, `SUBSCRIPTION` | `demo:RPC:CALL:eth_getBalance:min:…` |
| `WSS` | WebSocket connections, messages, Socket.IO events | `CONNECT`, `MESSAGE`, `EVENT` | `demo:WSS:CONNECT:ws/chat:min:…` |
| `SSE` | Server-sent event streams | HTTP method | `demo:SSE:GET:events/prices:min:…` |
| `GRPC` | gRPC, gRPC-Web and Connect calls | `CALL` | `demo:GRPC:CALL:user.UserService/GetUser:min:…` |
| `OTHER` | Requests that match no route | HTTP method | `demo:OTHER:GET:<unmatched>:min:…` |
| `STATIC` | JS, CSS, images, fonts — **off by default** | HTTP method | `demo:STATIC:GET:assets/<file>:min:…` |
| `OUT` | Calls your app makes to other services — **off by default** | HTTP method | `demo:OUT:GET:rpc-testnet.supra.com/rpc/v1/block:min:…` |

How each type is detected, checked in this order (the first match wins):

1. **Your own naming**: the `name` option, if it returns a name. See [Name requests yourself](#name-requests-yourself).
2. **Custom types**: the path matches one of your `types`. See [Custom types](#custom-types).
3. **Operations**: the path matches one of your `operations`. See [One URL, many operations](#one-url-many-operations).
4. **Next.js Server Actions** (`RPC`, `ACTION`): a `POST` with a `Next-Action` header. The name is the page it was called from (`/` for the home page), since Next.js gives the action itself a new id on every build.
5. **tRPC** (`RPC`): the path ends in `/trpc/{procedure}`, as in `/api/trpc/user.byId`. A `GET` is a `QUERY`, a `POST` a `MUTATION`, and an event stream a `SUBSCRIPTION`. In a batch (`/trpc/a.list,b.count?batch=1`), each procedure is counted.
6. **gRPC-Web and Connect** (`GRPC`): a `POST` to `/package.Service/Method` with a `Content-Type` of `application/grpc-web…`, `application/grpc…` or `application/connect+…`, or a `Connect-Protocol-Version` header.
7. **`RPC`**: the parsed request body has `"jsonrpc": "2.0"` and a `method`. A call with an `id` is `CALL` and one without is `NOTIFY`. In a batch (`[{...}, {...}]`), each call is counted under its method and in `demo:RPC:global`, while `demo:global` counts the HTTP request once. Repeated methods in a batch are merged into one Redis write per key.
8. **`GRAPHQL`**: the parsed request body has a `query` that is a GraphQL document (it starts with `{` or with `query`, `mutation` or `subscription` and contains `{`). The name is `operationName`, else the name in the document, else `<anonymous>`. A REST body like `{"query": "shoes"}` stays `API`. Also recognised: a `GET` with the document in `?query=` (and `?operationName=`), an `application/graphql` body, and a batch (`[{...}, {...}]`), where each operation is counted.
9. **`OTHER`**: the response status is 404 and no route matched. All of these share the single name `<unmatched>`, so bot scans can't create new keys.
10. **`SSE`**: the response `Content-Type` is `text/event-stream`.
11. **`STATIC`**: the file extension is `js`, `mjs`, `css`, `map`, `png`, `jpg`, `jpeg`, `gif`, `svg`, `ico`, `webp`, `avif`, `woff`, `woff2`, `ttf`, `otf`, `eot`, `mp4` or `webm`, or the path starts with `/_next/static/`. The file name becomes `<file>`.
12. **`WEB`**: the response `Content-Type` is `text/html` and either the status is below 400 or the request asked for HTML (a browser `Accept: text/html` or `Sec-Fetch-Dest: document` header). A response with no `Content-Type` also counts as `WEB` when the browser asked for a page, for example a `304 Not Modified` revalidation or a page load the user cancelled. An HTML error page returned to a script or API client counts as `API`.
13. **`API`**: everything else.

Detected outside this order:

- **`WSS`**:
  - `CONNECT` is counted when a request upgrades to a WebSocket.
  - `MESSAGE` counts each message received through the [`ws`](https://www.npmjs.com/package/ws) library on that connection.
  - `EVENT` counts each [Socket.IO](https://socket.io) event by name. `chat:send` becomes `chat/send`.
  - Socket.IO's own traffic (its polling requests and raw messages) is not counted separately.
- **`GRPC`**: an HTTP/2 stream with `Content-Type: application/grpc`. The name is the gRPC method path.
- **`OUT`**: requests made with `http`, `https` or `fetch`. The name is the host, plus `_port` for a non-default port, then the path, with the query string dropped. For example, `127.0.0.1_4000/rpc/v1/block`. The dashboard marks each one as a call to your backend or to a third party (see [Your own domains](#your-own-domains)).

#### Your own domains

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
- Next.js link prefetches (`Next-Router-Prefetch`, `Purpose: prefetch` or `Sec-Purpose: prefetch` headers)
- Next.js client navigation data (an `RSC: 1` header that isn't a page load, or `/_next/data/...`). [The page-view script](#page-views-in-single-page-apps) counts those page changes
- Socket.IO long-polling requests (`/socket.io/...`)
- Next.js's own WebSocket in development (`/_next/webpack-hmr`, used for hot reload)

`RPC` and `GRAPHQL` are read from the JSON body: `req.body` when your app's body parser set it, otherwise the body as your app read it (Fastify, Koa, Next.js and plain Node keep theirs elsewhere). redis-tracker never reads the body itself; it sees it while your app does, up to 64 KB. A body your app never reads, or a larger one without `req.body`, counts as `API`.

### How routes are named

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

Words like `hello-world` don't look like IDs. Once one position in a URL has seen more than 50 different values, every value there is counted as `<slug>`. This keeps blog posts, usernames and similar pages from creating keys forever. See [Limits](#limits).

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

### How it behaves

- **It never breaks your app.** Tracking errors are logged as `[redis-tracker] … failed` and never thrown into your request handling. Response bodies and status codes are untouched.
- **Request bodies.** JSON bodies are watched as your app reads them, up to 64 KB, for GraphQL and JSON-RPC. With the dashboard on, other text bodies are too, for [recent requests](#recent-requests-and-failures). Nothing is read ahead of your app, and file uploads and binary bodies are skipped.
- **Quiet when Redis fails.** If Redis keeps returning errors (out of memory, read-only after a failover), the same error is logged at most once every 10 seconds, with a `suppressed` count of the ones skipped.
- **Redis cost.** Each key is one `EVALSHA` per enabled bucket (the script is sent once, then called by its hash). Repeated hits in one request are merged with `INCRBY`.
- **Redis down or still connecting.** Automatic counts are skipped until Redis is ready, so nothing piles up in memory. Requests that arrive in the first moments after startup, before the connection is up, are not counted.
- **When a request is counted.** When its response finishes, or when the client disconnects. A request the client aborts is counted once. The bucket is the time the request arrived; an SSE stream is counted when it closes, under the time it opened.
- **What isn't counted.** Only work that arrives as a request is counted (HTTP, WebSockets, Socket.IO, SSE, gRPC), plus outgoing calls with `track: { OUT: true }`. Cron jobs, queue workers and scripts that never receive a request aren't counted.
- **Calling `init` twice.** The second call is ignored and logs an error.
- **Invalid options.** An empty `prefix`, a `prefix` containing `:`, or an invalid `expiry_in_sec` makes `init` throw before it connects to Redis.
- **WebSocket and Socket.IO libraries.** `ws` and `socket.io` are picked up from your app's own `node_modules`. They are not dependencies of this package.
- **Redis Cluster.** Keys never contain `{` or `}`, so they spread across all cluster nodes.
- **Keys stay bounded.** IDs are replaced, unknown URLs share `<unmatched>`, and [limits](#limits) cap the rest.
- **Shared totals.** Keep the same `prefix` across services to get one combined `global` total. A different `prefix` gives a separate set of keys.
- **Tested with** Node.js 22, ioredis 5, Express 5, ws 8 and Socket.IO 4.

## More

### Examples

- [examples/express-ts/server.ts](examples/express-ts/server.ts): Express + TypeScript with `statis.init` and a `/api/statistics` endpoint.
- [examples/express-js/server.js](examples/express-js/server.js): the same in JavaScript.
- [html-rpc-calls-demo](html-rpc-calls-demo): an HTML page calling Supra testnet RPC endpoints. The outgoing calls are counted with `track: { OUT: true }`; the handlers have no tracking code.

### TypeScript

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
} from "redis-tracker";
```

### Demo

- TS StackBlitz: <a href="https://stackblitz.com/edit/stackblitz-starters-vfzwhow5?file=server.ts" target="_blank" rel="noopener noreferrer">Open TS demo</a>
- JS StackBlitz: <a href="https://stackblitz.com/edit/stackblitz-starters-akuiwtmr?file=server.js" target="_blank" rel="noopener noreferrer">Open JS demo</a>
