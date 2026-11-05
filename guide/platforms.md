# Hosting platforms

system-tracker counts requests as they reach your Node.js server, so it needs three things from the platform you deploy to:

1. Your app runs a real Node.js server (`node:http` or `node:https`). Express, NestJS, Fastify, Koa, `next start` and the other frameworks in [Set up your framework](frameworks.md) all do.
2. The server keeps running between requests, so the counts are saved to Redis after each response.
3. The server can open a connection to your Redis database.

When `statis.init` starts, it checks the platform from the variables the platform sets on its own servers (such as `VERCEL` or `AWS_LAMBDA_FUNCTION_NAME`) and adjusts, as each section below says. Your settings never come from environment variables; only the platform is read. The check is skipped when `NODE_ENV` is `development`, because a local dev server always keeps running.

## Works fully

| Platform | Notes |
| --- | --- |
| Any VPS, Docker host or PM2 | Running `next start`, `node server.js` and so on |
| Any Kubernetes cluster | |
| AWS EC2, ECS and Fargate, Elastic Beanstalk, EKS | |
| DigitalOcean App Platform, Droplets | |
| Google Cloud Run | With **CPU always allocated** turned on |
| Railway | With sleeping turned off |
| Render | Paid plans |
| Fly.io | With machines kept running (auto-stop off) |
| Heroku | Paid dynos |

## Works, but some counts are lost

These platforms pause your server, slow it down or shut it down when there's no traffic. Requests are counted, but counts made just before a pause can be lost, and you may see Redis connection errors such as `ETIMEDOUT` in the logs after a quiet spell.

| Platform | Why |
| --- | --- |
| Google Cloud Run (default setting) | CPU is only given while a request is being answered |
| Google Cloud Functions, Firebase Functions | They run on Cloud Run |
| AWS App Runner | CPU is slowed down when idle |
| AWS Lambda with the Lambda Web Adapter | The server is frozen between requests |
| Fly.io with auto-stop or auto-suspend on | Machines stop or freeze when idle |
| Render free plan, Heroku eco dynos, Railway with sleeping on | The app sleeps when idle |
| Azure Container Apps scaled to zero | The app shuts down when idle |

**Keep it running so nothing is lost** (this can cost more):

| Platform | Setting |
| --- | --- |
| Google Cloud Run | `--no-cpu-throttling --min-instances=1` on `gcloud run deploy` (CPU always allocated) |
| Google Cloud Functions, Firebase Functions | `--min-instances=1`, or `minInstances: 1` in Firebase. CPU is still slowed between requests, so a few counts can be lost |
| Fly.io | `auto_stop_machines = "off"` and `min_machines_running = 1` under `[http_service]` in `fly.toml` |
| Railway | Turn off Serverless (app sleeping) in the service settings |
| Render, Heroku | A paid instance type, or a Basic dyno or higher |
| AWS App Runner | No setting keeps the CPU running, so a few counts can be lost |

**What you'll see:** the dashboard and its sign-in page show a note in the bottom-left corner, with a **Listed servers** link to this page. It appears in two cases:

- Cloud Functions, Firebase Functions and the Lambda Web Adapter are recognised at startup, so the note names the platform.
- On the others, the plan or setting that causes the pauses can't be seen from inside the app. Instead, a timer checks once a second, and when it fires a minute or more late, the server was paused or slowed down. The note then says for how long and when. The last pause is kept in Redis at `system-tracker:paused:{prefix}` for 30 days, so every instance of your app shows it. The timer only runs when the dashboard is on.

Close the note with **×** and it stays closed in that browser. A different note, for example after moving the app to another platform, shows once more.

## Doesn't count anything

On serverless platforms the platform calls your code directly, without a Node.js server in between, so system-tracker never sees a request.

| Platform |
| --- |
| Vercel |
| AWS Lambda with `serverless-http` or `serverless-express` |
| AWS Amplify Hosting (Next.js) |
| Next.js on AWS with OpenNext or SST |
| Netlify Functions, and Next.js on Netlify |
| Azure Functions |
| Servers built on `Bun.serve`, `Deno.serve` or uWebSockets.js (Hono on Bun, HyperExpress) |

**What you'll see:** on Vercel, Netlify, AWS Lambda and Azure Functions (and the platforms built on them), `statis.init` turns system-tracker off, the dashboard included. It doesn't connect to Redis or watch requests, so there are no Redis errors in your logs, and it prints one line in your app's logs saying so:

```
----------------------------------------
[system-tracker] turned off: this app runs on Vercel
Requests here don't reach a Node.js server, so nothing is counted and the dashboard isn't served.
Your app keeps running as normal.

It works on servers that keep running, such as a VPS, Docker, Kubernetes, AWS EC2 or ECS, and DigitalOcean App Platform.

For more details, check these links:
  Servers where it works: https://github.com/NPM-public-repo-Jaykumar/system-tracker/blob/main/guide/platforms.md#works-fully
  All platforms:          https://github.com/NPM-public-repo-Jaykumar/system-tracker/blob/main/guide/platforms.md
----------------------------------------
```

`statRedis` and `searchKeys` then return nothing (`null` and `[]`) without logging errors. The dashboard URL shows your app's own 404 page: the request never reaches system-tracker, so it can't show a page there, and the log line is the only message. To see the counts, run the app (or one copy of it) on a server that keeps running.

`Bun.serve`, `Deno.serve` and uWebSockets.js can't be told apart from a normal server at startup, so there system-tracker starts, but nothing is counted.

## Can't run at all

Edge runtimes have no Node.js server and can't open a connection to Redis.

| Platform |
| --- |
| Cloudflare Workers, including Next.js through OpenNext for Cloudflare |
| Vercel Edge Functions, and Next.js middleware on the Edge runtime |
| Deno Deploy |
| Netlify Edge Functions |

**What you'll see:** edge runtimes and browsers get a small build of system-tracker with no Node.js code in it, so importing it there still builds. `statis.init` prints one line saying nothing is counted there and does nothing else.

## Will it break my build?

No, on any of the platforms above. Your app builds, deploys and answers requests as normal. Where nothing can be counted, system-tracker turns itself off and says so in one log line.

## If the check gets it wrong

If your app runs on a server that keeps running but system-tracker says it turned off (for example, a `.env` copied from Vercel sets `VERCEL=1` on your own server), skip the check:

```ts
statis.init({
  redis: "redis://127.0.0.1:6379",
  prefix: "production",
  platformCheck: false,
});
```

With `platformCheck: false`, system-tracker starts as on any server and the pause timer doesn't run.

## Not sure which kind yours is?

If you start your app with a command such as `npm start` or `node server.js` and it keeps running, system-tracker works. If you upload functions, or your platform describes itself as serverless or edge, it doesn't count traffic there.
