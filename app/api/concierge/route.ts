import { agent, DEFAULT_USER_ID } from "@/app/agent";

// Stream must run on the Node.js runtime (the SDK uses fetch + async iterables).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { prompt, userId, threadId } = await req.json().catch(() => ({}));

  if (!prompt || typeof prompt !== "string") {
    return new Response(JSON.stringify({ error: "`prompt` is required" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // ── This is the streamText part of the SDK ──────────────────────────────
  // streamText() kicks off the streaming run and returns a helper object.
  // .toSSEResponse() turns it into a ready-to-return SSE HTTP Response that
  // emits `text`, `metadata`, `done`, and `error` events as they arrive.
  const run = agent.streamText({
    prompt,
    userId: userId || DEFAULT_USER_ID,
    threadId, // omit on first turn; the SDK generates and returns one
  });

  return run.toSSEResponse();
}
