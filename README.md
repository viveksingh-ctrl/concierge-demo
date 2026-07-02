# Concierge Demo — `@contentstack/agents-sdk` streamText

A minimal **Next.js 14 (App Router + TypeScript)** app that calls the
Contentstack **Digital Concierge** through the official
[`@contentstack/agents-sdk`](https://github.com/contentstack/agents-sdk) and
streams the response token-by-token using **`streamText`**.

## What it demonstrates

- Creating a `ConciergeAgent` with `apiKey` (the agent id) + `region`.
- Streaming a response with `agent.streamText(...)` and serving it over SSE
  from a Next.js route handler via `.toSSEResponse()`.
- A browser UI that reads the SSE stream and renders tokens live, plus the
  returned metadata (`content_uid`s) and `threadId`.

## Project layout

| Path | Purpose |
|------|---------|
| `app/agent.ts` | Creates the `ConciergeAgent` once at module scope |
| `app/api/concierge/route.ts` | `POST` → `agent.streamText(...).toSSEResponse()` |
| `app/page.tsx` | Client UI: input box + live-streaming answer |
| `scripts/smoke.mjs` | Standalone `streamText` check (no Next.js) |
| `scripts/test50.mjs` | Runs `streamText` 50× and records the results |
| `vendor/agents-sdk` | The prebuilt SDK (installed via a `file:` dependency) |

## Getting started

```bash
# 1. install deps (the SDK is vendored under ./vendor/agents-sdk)
npm install

# 2. configure env
cp .env.example .env.local   # edit if needed

# 3. run
npm run dev                  # http://localhost:3000
```

Open http://localhost:3000, type a prompt (default is an Italian query for
leather sofas), and watch the answer stream in.

## Verifying the SDK

```bash
# quick one-shot streamText check
npm run smoke

# stress test: 50 streamText runs, recorded to JSON + a crash-safe ledger
node scripts/test50.mjs
```

The `test50` harness prints a summary (success / error / timeout counts,
response times, products recommended) so you can confirm the SDK is behaving.

## The API route (the important bit)

```ts
// app/api/concierge/route.ts
export async function POST(req: Request) {
  const { prompt, userId, threadId } = await req.json();
  return agent.streamText({ prompt, userId, threadId }).toSSEResponse();
}
```

## Notes

- The `apiKey` is the **agent id** (visible in the concierge execute URL), not a
  server secret — but `.env.local` is git-ignored by convention regardless.
- Region must match where the agent lives (`AZURE_EU` or `AWS_NA`).
