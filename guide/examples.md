# Examples

[← Back to system-tracker](../README.md)

Each example needs Redis running on `127.0.0.1:6379` and `npm install system-tracker express`.

## Express with TypeScript

An app with two routes, the dashboard, and an endpoint that reads the counts back.

```ts
import express from "express";
import { searchKeys, statis, statRedis } from "system-tracker";

statis.init({
  redis: "redis://127.0.0.1:6379",
  prefix: "demo",
  failures: true, // also count failed requests (status 500 and above)
  dashboard: { enable: true, users: [{ username: "admin", password: "change-me" }] },
});

const app = express();

app.get("/api/users/:id", (req, res) => {
  res.json({ id: req.params.id });
});

app.get("/api/orders", (_req, res) => {
  res.json([]);
});

// Every API count kept per minute, newest first
app.get("/api/statistics", async (_req, res) => {
  const keys = await searchKeys("demo:API:*:min:*");
  const counts = await Promise.all(
    keys.map(async (key) => ({ key, count: Number(await statRedis.get(key)) || 0 })),
  );
  res.json(counts.sort((a, b) => b.key.localeCompare(a.key)));
});

app.listen(4000, () => {
  console.log("http://localhost:4000 · dashboard: http://localhost:4000/system-tracker");
});
```

Open `http://localhost:4000/api/users/7` a few times, then `/api/statistics`:

```json
[
  { "key": "demo:API:global:min:2026-11-02-16-05", "count": 3 },
  { "key": "demo:API:GET:api/users/<id>:min:2026-11-02-16-05", "count": 3 }
]
```

## Express with JavaScript

The same app, with `require`:

```js
const express = require("express");
const { searchKeys, statis, statRedis } = require("system-tracker");

statis.init({
  redis: "redis://127.0.0.1:6379",
  prefix: "demo",
  failures: true,
  dashboard: { enable: true, users: [{ username: "admin", password: "change-me" }] },
});

const app = express();

app.get("/api/users/:id", (req, res) => {
  res.json({ id: req.params.id });
});

app.get("/api/statistics", async (_req, res) => {
  const keys = await searchKeys("demo:API:*:min:*");
  const counts = await Promise.all(
    keys.map(async (key) => ({ key, count: Number(await statRedis.get(key)) || 0 })),
  );
  res.json(counts);
});

app.listen(4000);
```

## Count calls to RPC endpoints

A plain Node server that calls a blockchain RPC endpoint for each request. With `track: { OUT: true }`, the calls your server makes are counted too, with no tracking code in the handler.

```js
const http = require("node:http");
const { statis } = require("system-tracker");

statis.init({
  redis: "redis://127.0.0.1:6379",
  prefix: "local-demo",
  track: { OUT: true }, // count the calls this server makes
});

http
  .createServer(async (req, res) => {
    if (req.url === "/api/call-block") {
      const block = await fetch("https://rpc-testnet.supra.com/rpc/v1/block").then((r) => r.json());
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(block));
    }
    res.writeHead(404).end();
  })
  .listen(4000);
```

Each visit to `/api/call-block` counts twice: once as the request to your server, and once as the call it made. The RPC host has `rpc` in its name, so that call is counted as `RPC` with the action `OUT`. It isn't added to your app's total.

```text
local-demo:API:GET:api/call-block:min:...
local-demo:RPC:OUT:rpc-testnet.supra.com/rpc/v1/block:min:...
```
