# system-tracker

See how your Node.js app is used. Every page people open, every API call, and everything else your app answers is counted as it happens, then added up by the minute, hour, day, month and year. You can also count the calls your app makes to other services. A built-in dashboard shows it all as charts.

Add one line when your app starts. You don't change your routes or write any tracking code. All it needs is a Redis database to keep the numbers in.

## Quick start

```bash
npm install system-tracker    # or: yarn add system-tracker
```

Add this at the top of your app's entry file, before your server starts:

```ts
import { statis } from "system-tracker";

statis.init({
  redis: "redis://127.0.0.1:6379",
  prefix: "my-app",
  dashboard: { enable: true, username: "admin", password: "change-me" },
});
```

Start your app and open `/system-tracker` on it, for example `http://localhost:3000/system-tracker`.

Using Next.js, Nuxt, SvelteKit or another framework? See [where to add it](guide/frameworks.md).

## Let your AI assistant set it up

Using Claude Code, Cursor or Copilot? Paste this. It looks through your project, asks you a few simple questions about what to track, and sets everything up:

```
Read and strictly follow the SKILL.md file to implement the npm package "system-tracker".

References:
NPM: https://www.npmjs.com/package/system-tracker
SKILL.md: https://github.com/NPM-public-repo-Jaykumar/system-tracker/blob/main/SKILL.md
```

## What gets counted

| Type | What it is |
| --- | --- |
| `API` | Calls to your API |
| `WEB` | Pages people open in a browser |
| `GRAPHQL` | GraphQL queries and mutations |
| `RPC` | RPC calls, and anything on an `rpc` address |
| `WSS` | Live connections (WebSockets, Socket.IO) |
| `SSE` | Live updates streamed to the browser |
| `GRPC` | gRPC calls |
| `OTHER` | Pages that don't exist, bot scans |
| `STATIC` | Images, scripts and styles (off until you turn it on) |
| `OUT` | Calls your app makes to other services (off until you turn it on) |

The dashboard and its own pages are never counted.

## Works with

Express, NestJS, Fastify, Koa and plain Node, Next.js, Nuxt, SvelteKit, Remix and React Router, Astro, and single-page apps built with React, Vue, Angular or Svelte.

## Learn more

- [Set up your framework](guide/frameworks.md): where to add it, and counting page changes in single-page apps
- [Dashboard](guide/dashboard.md): overview, insights, boards and recent requests
- [Settings](guide/settings.md): connecting to Redis, what to track or skip, and how long counts are kept
- [How it works](guide/how-it-works.md): how each request is sorted, how routes are named, and reading the numbers in your own code

## Try it

- Online demo: <a href="https://stackblitz.com/edit/stackblitz-starters-vfzwhow5?file=server.ts" target="_blank" rel="noopener noreferrer">TypeScript</a> · <a href="https://stackblitz.com/edit/stackblitz-starters-akuiwtmr?file=server.js" target="_blank" rel="noopener noreferrer">JavaScript</a>
- [Express + TypeScript](examples/express-ts/server.ts) and [Express + JavaScript](examples/express-js/server.js): setup plus a `/api/statistics` endpoint that reads the counts
- [A page calling RPC endpoints](html-rpc-calls-demo): counts the calls your server makes to them, with `track: { OUT: true }` and no tracking code in the handlers

If `npm install` stops with `ERESOLVE`, the clash is between other packages in your project (system-tracker has no peer dependencies). Add `--legacy-peer-deps`. TypeScript types are included; see [the list](guide/settings.md#typescript).
