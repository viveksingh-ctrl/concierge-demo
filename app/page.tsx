"use client";

import { useRef, useState } from "react";

type Meta = { content_uid: string };
type Source = { key: string; value: string; contentType?: string };

export default function Home() {
  const [prompt, setPrompt] = useState("Voglio Vedere dei divani in pelle");
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<"idle" | "streaming" | "done" | "error">(
    "idle"
  );
  const [meta, setMeta] = useState<Meta[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [threadId, setThreadId] = useState<string | undefined>();
  const [err, setErr] = useState<string>("");
  const [chunks, setChunks] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  async function send() {
    setAnswer("");
    setMeta([]);
    setSources([]);
    setErr("");
    setChunks(0);
    setStatus("streaming");

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch("/api/concierge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt, threadId }),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      // Read the SSE stream produced by streamText().toSSEResponse()
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by a blank line
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          const line = frame.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          const json = line.slice("data:".length).trim();
          if (!json) continue;

          let ev: any;
          try {
            ev = JSON.parse(json);
          } catch {
            continue;
          }

          if (ev.type === "text") {
            setAnswer((a) => a + ev.textDelta);
            setChunks((c) => c + 1);
          } else if (ev.type === "metadata") {
            if (Array.isArray(ev.results)) setMeta(ev.results);
            if (Array.isArray(ev.sources)) setSources(ev.sources);
          } else if (ev.type === "done") {
            setThreadId(ev.threadId);
            if (Array.isArray(ev.metadata)) setMeta(ev.metadata);
            if (Array.isArray(ev.sources)) setSources(ev.sources);
            setStatus("done");
          } else if (ev.type === "error") {
            setErr(ev.message || "stream error");
            setStatus("error");
          }
        }
      }
      setStatus((s) => (s === "error" ? s : "done"));
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setErr(String(e?.message || e));
        setStatus("error");
      }
    }
  }

  function cancel() {
    abortRef.current?.abort();
    setStatus("idle");
  }

  const badge: Record<string, string> = {
    idle: "#6e7681",
    streaming: "#d29922",
    done: "#3fb950",
    error: "#f85149",
  };

  return (
    <main style={{ maxWidth: 780, margin: "0 auto", padding: "40px 20px" }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>
        Contentstack Concierge — <code>streamText</code> demo
      </h1>
      <p style={{ color: "#8b949e", marginTop: 0, fontSize: 14 }}>
        Calls <code>@contentstack/agents-sdk</code> →{" "}
        <code>agent.streamText().toSSEResponse()</code> and renders tokens as
        they stream in.
      </p>

      <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && status !== "streaming") send();
          }}
          placeholder="Ask the concierge…"
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #30363d",
            background: "#161b22",
            color: "#e6edf3",
            fontSize: 14,
          }}
        />
        {status === "streaming" ? (
          <button onClick={cancel} style={btn("#f85149")}>
            Cancel
          </button>
        ) : (
          <button onClick={send} style={btn("#238636")}>
            Send
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 16 }}>
        <span
          style={{
            display: "inline-block",
            padding: "2px 10px",
            borderRadius: 999,
            fontSize: 12,
            background: badge[status],
            color: "#0e1116",
            fontWeight: 600,
          }}
        >
          {status}
        </span>
        <span style={{ color: "#8b949e", fontSize: 12 }}>
          text events: {chunks}
        </span>
        {threadId && (
          <span style={{ color: "#8b949e", fontSize: 12 }}>
            threadId: <code>{threadId}</code>
          </span>
        )}
      </div>

      <section style={panel()}>
        <div style={{ color: "#8b949e", fontSize: 12, marginBottom: 6 }}>
          Streamed answer
        </div>
        <div style={{ whiteSpace: "pre-wrap", fontSize: 15, minHeight: 24 }}>
          {answer || <span style={{ color: "#484f58" }}>—</span>}
          {status === "streaming" && <span className="cursor">▌</span>}
        </div>
      </section>

      {err && (
        <section style={{ ...panel(), borderColor: "#f85149" }}>
          <div style={{ color: "#f85149", fontSize: 13 }}>Error: {err}</div>
        </section>
      )}

      {(meta.length > 0 || sources.length > 0) && (
        <section style={panel()}>
          <div style={{ color: "#8b949e", fontSize: 12, marginBottom: 6 }}>
            Metadata &amp; sources
          </div>
          {meta.length > 0 && (
            <div style={{ fontSize: 13 }}>
              <strong>content_uids:</strong>
              <ul style={{ margin: "6px 0" }}>
                {meta.map((m, i) => (
                  <li key={i}>
                    <code>{m.content_uid}</code>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {sources.length > 0 && (
            <div style={{ fontSize: 13 }}>
              <strong>sources:</strong>
              <ul style={{ margin: "6px 0" }}>
                {sources.map((s, i) => (
                  <li key={i}>
                    <code>{s.key}</code>: {s.value}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <style>{`.cursor{animation:blink 1s steps(2) infinite}@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </main>
  );
}

function btn(bg: string): React.CSSProperties {
  return {
    padding: "10px 18px",
    borderRadius: 8,
    border: "none",
    background: bg,
    color: "white",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
  };
}

function panel(): React.CSSProperties {
  return {
    marginTop: 16,
    padding: 16,
    borderRadius: 10,
    border: "1px solid #30363d",
    background: "#0d1117",
  };
}
