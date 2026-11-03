# Dashboard

[← Back to system-tracker](../README.md)

A built-in dashboard shows these counts in your browser. See it in the [walkthrough video](https://youtu.be/8VVgm_3hoZo?t=163), from 2:43. It's off by default. Turn it on in the same `init` call:

```ts
statis.init({
  redis: { host: "127.0.0.1", port: 6379 },
  prefix: "demo",
  dashboard: {
    enable: true,            // default: false
    url: "/system-tracker",  // default: "/system-tracker"
    users: [                 // optional: no login when omitted
      { username: "admin", password: "change-me" },
      { username: "ops", password: "another-strong-one" },
    ],
    saveSampleCurl: true,    // default: true; false keeps no recent requests or failures
  },
});
```

Then open `/system-tracker` on your app's own host and port, for example `http://localhost:4000/system-tracker`. Your app's log prints the full URL once, when its server starts (or, when system-tracker starts after the server, as with Next.js, on the first request):

```text
[system-tracker] dashboard: http://localhost:4000/system-tracker (sign in with a login from dashboard.users)
```

| Option | Default | What it does |
| --- | --- | --- |
| `dashboard.enable` | `false` | Serve the dashboard |
| `dashboard.url` | `"/system-tracker"` | The path it's served at (leading and trailing `/` are optional) |
| `dashboard.users` | — | Who can sign in: a list of `{ username, password }`. Show a sign-in page when set. See [Sign-in](#sign-in) |
| `dashboard.username`, `dashboard.password` | — | A shorthand for a single user. Set both or neither; they're added to `users` |
| `dashboard.saveSampleCurl` | `true` | Keep each route's recent requests and failures (with the error response and stack). `false` keeps none of them. See [Recent requests and failures](#recent-requests-and-failures) |

## Sign-in

With `users` set, the dashboard shows a sign-in page and anyone in the list can sign in.

- A wrong username and a wrong password get the same answer, "Wrong username or password", so the page never tells which usernames exist. Each wrong try also waits 400 ms.
- After 3 wrong tries for a username, that username is blocked for 15 minutes, even with the right password. The page says "Too many failed sign-ins for this username. Try again in 15 minutes." Usernames that aren't in the list are blocked the same way. Other users can still sign in.
- The 3 tries count within 15 minutes of the first one. A successful sign-in clears them.
- The block is kept in your Redis, so every instance of your app shares it: `system-tracker:login-blocked:{prefix}:{username}` exists while the username is blocked, its value is the unlock time (in ms) and it expires at that time. Failed tries are counted at `system-tracker:login-fails:{prefix}:{username}`. To unblock someone early, delete their `login-blocked` key. While Redis can't be reached, both are kept in the app's memory.
- Each user gets their own session. Changing a user's password, or removing them from the list, signs out only that user.

Four tabs, and each part loads only when you open it:

- **Overview**: your default board, when you set one (see [Boards](#boards)). Otherwise the built-in overview, with a range picker at the top: the last minute (per second), hour (per minute), 24 hours, 7 days, 30 days, 12 months or 5 years. Everything on the page covers that range: the requests in it, the current second, minute, hour, day, month or year next to the one before, the average and the busiest one; traffic stacked by type (hover a bar for each type and the total); one row per type with its trend, its current bucket (for example today), its total for the range (for example the last 7 days) and its share of that total; and the top routes, the same way. Outgoing calls (`OUT`) are listed too, split into calls to **your backend** and to **third parties** (see [Your own domains](how-it-works.md#your-own-domains)), but they aren't requests to your app, so they're not part of the total, the stacked chart or the shares, just like `{prefix}:global` leaves them out. The most important insights sit above them. The totals come from the `{prefix}:global` and `{prefix}:{TYPE}:global` keys, read by exact name; the routes of the last minute or hour are read by name for the routes seen in the last two hours, and longer ranges with one `SCAN`, cached for 15 seconds. **Customize** turns it into a board you can rearrange; saving it makes it your Overview.
  - **Type** (click a row or a bar): the same range picker, and for that range its numbers, 5xx rate, share by route, methods (for `OUT`: your backend vs third-party), and every route with its requests, its current bucket and, with `failures: true`, its 5xx. Filter and sort them.
  - **Route** (click a route): one tile per bucket (seconds to years), which also picks the range, with how long each bucket is kept; the total, average, peak and lowest of the range, its failure rate, a chart with 5xx in red, and the raw bucket values. Below them, the route's [recent requests and failures](#recent-requests-and-failures) as curl commands.
- **Insights**: stats and problems for the last 15 minutes, the last hour, today, this week, this month, this quarter or this year, with reports you can export. Problems are grouped as critical, warning, spikes, drops, high traffic, scale, failures and new routes. Click one to open that route or type at the right time range. See [Insights](#insights).
- **Boards**: your own dashboards. See [Boards](#boards).
- **Settings**: try other settings and get the `init()` code for them. See [Settings](#settings-tab).

**Storage**: the top bar shows how much of Redis is in use and the tracker's share, for example `Redis 230 MB / 2 GB · tracker ≈28 MB`. It turns amber when Redis is 80% full. Hover it for the details, or click it for the **Storage in Redis** card on the Settings tab. That card has a bar for the tracker, everything else and the free space, and a table of the tracker's keys by group: each time bucket (with how long it's kept), recent requests, failures, boards and reports, with their key counts and sizes. Redis's own numbers come from `INFO memory` (`used_memory`, and `maxmemory`, or the server's RAM when no `maxmemory` is set) and `DBSIZE`, added up across cluster masters. The tracker's share comes from a `SCAN` of its keys in the background, at most once every 10 minutes and only while the dashboard is open. Sizes are estimated from `MEMORY USAGE` on a random sample of each group, so they're approximate. "Other" is everything else in Redis: other apps' keys and Redis's own overhead. **Recount** starts a new count (at most every 30 seconds). If your Redis provider blocks `INFO` or `MEMORY USAGE`, the card shows what it can, such as key counts only.

Hover any chart, including the small trend lines, to see the time and the value under the cursor. Click a chart's legend to hide or show a series.

## Insights

**Stats by period**: pick the last 15 minutes, the last hour, today, this week (from Monday), this month, this quarter or this year, all in IST. The whole tab follows it: the stats, the three summary cards and the list of problems. You get the requests and how they compare with the period before, 5xx and their share, how many routes were called, the busiest minute, hour, day or month, a chart over the period, the split by type and the top 10 routes. Periods are read from the `min`, `day`, `month` and `year` buckets with one `SCAN` each, cached for 30 seconds, so they need those buckets turned on and kept long enough (a week needs 7 days of `day` buckets).

**Export** (on every screen: the Overview, a type, a route, a board, a template and Settings): downloads what the screen shows, at the range picked on it. That's the numbers at the top, each chart's data over time and each table (for a route: its buckets, newest first; for a board: every chart and table on it; for Settings: storage and what's tracked). Pick CSV, PDF (a print view) or JSON. A route's recent requests and failures are left out, since they can hold tokens. Each export is saved with the reports below, so you can download it again later.

**Export report** (Insights): pick a period, then CSV (for Excel or Google Sheets), PDF (a print view; choose "Save as PDF") or JSON, then click Export. A report has the totals, the chart, the split by type and up to 500 routes with their 5xx. Each export is also saved in your Redis, so the dialog lists earlier reports to download again in any format, or delete. They're kept at `system-tracker:reports:{prefix}` (a list) and `system-tracker:report:{prefix}:{id}` (one string per report), the newest 100.

**Reset data** (on the Overview and Insights): deletes counts for good. Pick what (everything, one type or one route) and when (all time, today, this week, this month, this quarter or this year). The dashboard first shows how many counters it will delete, then asks you to confirm. Only system-tracker's own counter keys under your prefix are deleted, found with `SCAN` and checked against the key format, so other keys stay, and so do your boards and saved reports. Totals that include the deleted counts are lowered to match: deleting today lowers this month and this year, and deleting one route lowers its type's total and the overall total. Reset needs a dashboard login (`dashboard.users`), so a dashboard without one can't delete anything. Each reset is written to your app's log, for example `[system-tracker] dashboard reset (everything, all time): deleted 1345 counters, lowered 0 totals`.

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

## Recent requests and failures

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
- **Recent failures**: the last 20 requests answered with status 500 or above, at most one a second per route. Each also has the start of the error response (up to 2 KB) and, in Express apps, the stack of the error passed to `next(err)` or thrown in a route. For outgoing calls, a call that got no response at all (a reset connection or a timeout) is a failure too, with its error. With `saveSampleCurl: false`, none of this is kept.
- **No duplicates**: a request with the same method, URL (path and query) and body as one already in the list isn't added again. That entry moves to the top with the latest time, response and stack, and shows how many times it was captured (×3). So the list holds different requests, and repeats don't push them out.

What's kept:

- The method, URL, headers and body (up to 16 KB) as they were sent, including `Authorization`, cookies and API keys. Only connection headers (`Host`, `Content-Length`, `Connection`, `Accept-Encoding`, …) are left out; the host is part of the URL. Because of this, set a dashboard login, and keep your Redis private.
- HTTP requests your app receives, and outgoing calls made with `fetch`, `http` or `https` (axios, got and node-fetch use these). An outgoing body is kept when it's text: a string, `URLSearchParams` or a buffer for `fetch`, and whatever is written to the request for `http` and `https`. Form data and streams aren't read. WebSocket traffic and gRPC have no curl.
- Saved in your Redis as lists at `system-tracker:samples:{prefix}:{TYPE}:{ACTION}:{name}` and `system-tracker:failures:{prefix}:{TYPE}:{ACTION}:{name}`, kept 30 days after their last write. Resetting a route, a type or everything for all time deletes them too.
- Only while the dashboard is on. Without `dashboard.enable`, nothing is kept. So a route can have counts but no requests to show: counts from before the dashboard was turned on, or older than 30 days. The next request shows up within a minute.

If you'd rather not keep requests, because they hold tokens, cookies and personal data, turn them off:

```ts
dashboard: { enable: true, users: [/* … */], saveSampleCurl: false },
```

Then nothing about single requests is kept: no recent requests, no failures, no error responses and no stacks, for incoming requests and outgoing calls alike. Request bodies and error responses aren't read for them, the Express error hook isn't installed, and each route's page says they're off. Failed requests are still counted as numbers, with `failures: true`. Counts and charts work as before. Requests kept earlier aren't shown, and they're deleted 30 days after their last write (or right away with **Reset data**).

## Settings tab

Toggle what to track, totals, failures, skipped requests, time buckets and limits. A change is only a preview: the dashboard hides what you turned off, and your app keeps tracking as before. Below the settings, your current `statis.init()` call is shown with the change applied, new lines in green and removed lines in red. Copy it into your code and restart to apply it. Credentials (Redis and dashboard usernames and passwords, and the ones in a Redis URL) are hidden on the server and never reach the browser.

## Boards

Build dashboards of your own. The Boards tab has two parts:

- **Default templates**: ten ready-made boards. Open one to see it with your live data, then **Use this template** (saves a copy) or **Customize** it first. A template itself never changes; saving always creates your own copy. Charts that need a type your app doesn't track, or `failures: true`, are left out.

  | Template | For | Shows |
  | --- | --- | --- |
  | Everyday overview | everyone | insights, totals, traffic by type, the mix, busiest routes, 30 days |
  | DevOps / SRE | on-call, operations | requests per second, 5xx, failure rate, spikes, routes with 5xx |
  | Product owner | product | daily and monthly usage, most used features and pages, pages vs API |
  | Backend developer | developers | API routes with 5xx, calls by HTTP method, GraphQL operations, other requests |
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

Boards are saved in your Redis, as one JSON string at `system-tracker:dashboards:{prefix}` (at most 50 boards and 256 KB). Restarts and redeploys keep them, and every instance of your app and everyone using the dashboard shares them. Each save is also logged to the browser console.

How it behaves:

- Your app's own server answers it (Express, NestJS, Fastify, Koa, Next.js or plain Node). No extra port, no extra dependency. Dashboard requests never reach your routes and are never counted.
- Pick how often it refreshes: live (every second), 5 s, 30 s (the default), 1 min, 5 min, 15 min, or off. ↻ refreshes right away. It doesn't refresh while the tab is hidden. A chart under your mouse pointer waits, so what you're reading holds still; it catches up as soon as the pointer leaves.
- It's dark by default; the theme button switches to light. The browser remembers both choices.
- It works on any screen size: on tablets and phones the layout stacks, tables scroll sideways and charts keep their proportions.
- With `users` set, signing in sets an `HttpOnly`, `SameSite=Strict` cookie for 7 days. See [Sign-in](#sign-in) for blocked usernames.
- Without `users`, anyone who can reach the URL can see your routes and traffic, the recent requests with their headers and bodies, and change your boards. The page shows a warning, and the server logs one at startup. In production, set a login and serve it over HTTPS.
- Times are in IST, like the bucket ids in the keys.
