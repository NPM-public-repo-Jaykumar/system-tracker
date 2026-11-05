# system-tracker

See how your Node.js app is used. Every page people open, every API call, and everything else your app answers is counted as it happens, then added up by the minute, hour, day, month and year. You can also count the calls your app makes to other services. A built-in dashboard shows it all as charts.

Add one line when your app starts. You don't change your routes or write any tracking code. All it needs is a Redis database to keep the numbers in.

## Watch the 8-minute walkthrough on YouTube

<a href="https://youtu.be/8VVgm_3hoZo"><img src="https://raw.githubusercontent.com/NPM-public-repo-Jaykumar/system-tracker/main/guide/images/walkthrough-video.jpg" width="480" alt="Watch the 8-minute walkthrough on YouTube: setup, the dashboard, boards, settings and AI setup"></a>

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
  dashboard: {
    enable: true,
    users: [{ username: "admin", password: "change-me" }], // add more people to the list
    saveSampleCurl: true, // the default; false keeps no recent requests or failures
  },
});
```

Start your app and open `/system-tracker` on it, for example `http://localhost:3000/system-tracker`, and sign in with any user from the list. A wrong username or password gets the same "Wrong username or password", and after 3 wrong tries a username is blocked for 15 minutes, even with the right password.

The dashboard keeps each route's recent requests as curl commands, with their headers and bodies (tokens included), and its recent failures with the error response and stack. If you'd rather not keep any of that, set `saveSampleCurl: false`: no requests, failures, error responses or stacks are kept, and counts and charts work as before. See [Dashboard](guide/dashboard.md#sign-in) for more.

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

## Where you can run it

Anywhere your app runs as a Node.js server that keeps running: a VPS, Docker, Kubernetes, AWS EC2 or ECS, DigitalOcean App Platform, and Railway, Render, Fly.io or Heroku on plans that don't sleep.

On serverless platforms such as Vercel, AWS Lambda, Netlify and Azure Functions, nothing can be counted, so it turns itself off, dashboard included, and says so in one log line. On edge runtimes such as Cloudflare Workers it does nothing. It never breaks your build. On platforms that pause idle servers, the dashboard shows a note that some counts may be lost. See [Hosting platforms](guide/platforms.md) for the full list.

## Learn more

- [Set up your framework](guide/frameworks.md): where to add it, and counting page changes in single-page apps
- [Hosting platforms](guide/platforms.md): where it works, where some counts are lost, and where it can't count
- [Dashboard](guide/dashboard.md): overview, insights, boards and recent requests
- [Settings](guide/settings.md): connecting to Redis, what to track or skip, and how long counts are kept
- [How it works](guide/how-it-works.md): how each request is sorted, how routes are named, and reading the numbers in your own code

## Examples

- [Express with TypeScript or JavaScript](guide/examples.md#express-with-typescript): the dashboard, and an endpoint that reads the counts back
- [Count calls to RPC endpoints](guide/examples.md#count-calls-to-rpc-endpoints): the calls your server makes, with no tracking code in the handler

If `npm install` stops with `ERESOLVE`, the clash is between other packages in your project (system-tracker has no peer dependencies). Add `--legacy-peer-deps`. TypeScript types are included; see [the list](guide/settings.md#typescript).
