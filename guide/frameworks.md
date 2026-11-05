# Set up your framework

[← Back to system-tracker](../README.md)

Two parts, both in this section for each framework:

- **Server**: call `statis.init(...)` once, as early as possible, in the process that serves your requests. This counts every request.
- **Browser**: only for apps where moving to another page doesn't reload it (React, Vue, Angular, Svelte, Next.js, Nuxt, SvelteKit, Remix). Add one script to the HTML every page shares, so page changes are counted too. system-tracker serves it from your server; there's nothing else to install. See [Page views in single-page apps](#page-views-in-single-page-apps) for how it works.

| Framework | Server: `statis.init` in | Browser: script in |
| --- | --- | --- |
| [Express](#express) | `server.ts` / `index.js` | not needed |
| [NestJS](#nestjs) | `main.ts` | not needed |
| [Fastify, Koa, plain Node](#fastify-koa-plain-node) | `server.ts` / `index.js` | not needed |
| [Next.js, App Router](#nextjs-app-router) | `instrumentation.ts` | `app/layout.tsx` |
| [Next.js, Pages Router](#nextjs-pages-router) | `instrumentation.ts` | `pages/_app.tsx` |
| [Nuxt](#nuxt) | `server/plugins/system-tracker.ts` | `nuxt.config.ts` |
| [SvelteKit](#sveltekit) | `src/hooks.server.ts` | `src/app.html` |
| [Remix, React Router](#remix-react-router) | `app/entry.server.tsx` | `app/root.tsx` |
| [Astro](#astro) | `src/middleware.ts` | your layout, with `<ClientRouter />` only |
| [React, Vue, Angular, Svelte (Vite, CRA, Angular CLI)](#react-vue-angular-svelte-spa) | your API server | `index.html` |

The examples use `{ redis: { host: "127.0.0.1", port: 6379 }, prefix: "demo" }`; see [Connect to Redis](settings.md#connect-to-redis) for the other ways to connect.

## Express

Server (`server.ts`):

```ts
import express from "express";
import { statis } from "system-tracker";

statis.init({ redis: { host: "127.0.0.1", port: 6379 }, prefix: "demo" });

const app = express();
app.use(express.json());

app.get("/api/users/:id", (req, res) => {
  res.json({ id: req.params.id }); // counted as demo:API:GET:api/users/<id>
});

app.listen(4000);
```

Browser: not needed for pages rendered on the server (EJS, Pug, Handlebars), since every link loads a new page. If Express serves a React, Vue or Angular build, add the script to that app's `index.html` as in [React, Vue, Angular, Svelte](#react-vue-angular-svelte-spa).

## NestJS

Server (`main.ts`):

```ts
import { NestFactory } from "@nestjs/core";
import { statis } from "system-tracker";
import { AppModule } from "./app.module";

statis.init({ redis: { host: "127.0.0.1", port: 6379 }, prefix: "demo" });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
```

Browser: not needed; same as Express.

## Fastify, Koa, plain Node

Server: put the same call at the top of `server.ts` / `index.js`, before the server starts listening:

```ts
import { statis } from "system-tracker";

statis.init({ redis: { host: "127.0.0.1", port: 6379 }, prefix: "demo" });

// ...create and start your server
```

Browser: not needed; same as Express.

## Next.js, App Router

Server (`instrumentation.ts`, next to `app/` or in `src/`):

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { statis } = await import("system-tracker");
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
        {/* system-tracker: counts page changes made in the browser */}
        <Script src="/system-tracker/view.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
```

If your app sets a Content Security Policy with a nonce, pass it to the `<Script>`; see [Content Security Policy](#content-security-policy).

Run it with `next start` (or the standalone server) on a host that keeps it running. On Vercel and other serverless platforms nothing can be counted, so system-tracker and its dashboard turn themselves off there; see [Hosting platforms](platforms.md).

## Next.js, Pages Router

Server (`instrumentation.ts`): the same as the [App Router](#nextjs-app-router).

Browser (`pages/_app.tsx`):

```tsx
import Script from "next/script";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <Script src="/system-tracker/view.js" strategy="afterInteractive" />
    </>
  );
}
```

## Nuxt

Server (`server/plugins/system-tracker.ts`):

```ts
import { statis } from "system-tracker";

export default defineNitroPlugin(() => {
  statis.init({ redis: { host: "127.0.0.1", port: 6379 }, prefix: "demo" });
});
```

Browser (`nuxt.config.ts`):

```ts
export default defineNuxtConfig({
  app: {
    head: {
      script: [{ src: "/system-tracker/view.js", defer: true }],
    },
  },
});
```

## SvelteKit

Server (`src/hooks.server.ts`, with `@sveltejs/adapter-node`):

```ts
import { statis } from "system-tracker";

statis.init({ redis: { host: "127.0.0.1", port: 6379 }, prefix: "demo" });
```

Browser (`src/app.html`), inside `<head>`:

```html
<script src="/system-tracker/view.js" defer></script>
```

## Remix, React Router

Server (`app/entry.server.tsx`), at the top:

```ts
import { statis } from "system-tracker";

statis.init({ redis: { host: "127.0.0.1", port: 6379 }, prefix: "demo" });
```

Browser (`app/root.tsx`), inside `<head>`:

```tsx
<script src="/system-tracker/view.js" defer />
```

## Astro

Server (`src/middleware.ts`, with `@astrojs/node`):

```ts
import { defineMiddleware } from "astro:middleware";
import { statis } from "system-tracker";

statis.init({ redis: { host: "127.0.0.1", port: 6379 }, prefix: "demo" });

export const onRequest = defineMiddleware((_context, next) => next());
```

Browser: only needed with `<ClientRouter />` (view transitions), which changes pages without a reload. Then add it to the layout every page uses, inside `<head>`:

```astro
<script is:inline src="/system-tracker/view.js" defer></script>
```

## React, Vue, Angular, Svelte (SPA)

These apps are built into static files, so there's no server of their own to call `init` in. Call it in the API server they talk to (see [Express](#express), [NestJS](#nestjs) or [Fastify, Koa, plain Node](#fastify-koa-plain-node)).

Browser (`index.html` for Vite and Create React App, `src/index.html` for Angular), inside `<head>`:

```html
<!-- the API server also serves the app's files -->
<script src="/system-tracker/view.js" defer></script>

<!-- the app is served from somewhere else (a CDN, or a dev server on another port) -->
<script src="https://api.example.com/system-tracker/view.js" data-count-first defer></script>
```

Use the API server's full URL when the pages come from somewhere else. `data-count-first` also counts the first page, since the API server never sees that page load.

## What works where

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


## Page views in single-page apps

In single-page apps, moving to another page happens in the browser without a reload, so your server sees only the first page load. The script added in [Set up your framework](#set-up-your-framework) reports each page change to your server.

Each time the path changes (`history.pushState`, `replaceState`, the back and forward buttons, or a `#/...` hash route), the script sends the new path to `POST /system-tracker/view` with `navigator.sendBeacon`. It's counted as a `WEB` page view under the same name as a full page load, so `/products/12` and `/products/7` both count as `products/<id>`. Only the path counts: a new query string or `#section` on the same page doesn't. `track.WEB`, `ignore.paths` and `ignore.bots` apply as usual. The first page load is counted by your server, as before, so it isn't counted twice. Requests for the script and its reports never reach your routes and aren't counted as requests of their own.

With `enabled: false`, the script isn't served. The tag then gets a 404, which doesn't affect your pages.

Frameworks fetch a page's data or HTML from a script when the browser moves to it: Next.js (`RSC: 1`, `/_next/data/...`), SvelteKit (`__data.json`), Nuxt (`_payload.json`), Remix and React Router (`.data`, `?_data=`), Gatsby (`/page-data/`), Inertia (`X-Inertia`), htmx boost (`HX-Boosted`), pjax (`X-PJAX`) and Turbo Drive. Those aren't counted as `API` calls or page views; the script counts the page change instead.

### Content Security Policy

If your app sets one:

- With a list of allowed sources, allow the script's origin in `script-src` and, when it's another server, in `connect-src`.
- With a nonce (`'nonce-…'`, often with `'strict-dynamic'`), pass the same nonce your other scripts get. In Next.js, read it in the layout and hand it to `<Script>`:

  ```tsx
  import { headers } from "next/headers";
  import Script from "next/script";

  // inside your async RootLayout
  const nonce = (await headers()).get("x-nonce") ?? undefined; // the header your middleware sets
  // ...
  <Script src="/system-tracker/view.js" strategy="afterInteractive" nonce={nonce} />
  ```

  Without it, the browser blocks the script and page changes aren't counted.
