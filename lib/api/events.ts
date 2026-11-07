import { API_URL } from "./client.ts";

// EventSource cannot send X-Demo-Role; a streaming fetch preserves the server's auth contract.
export async function streamEvents(role: string, onEvent: (kind: string, id: string) => void, signal: AbortSignal, base = API_URL, lastEventId = "") {
  const response = await fetch(`${base}/api/v1/events`, { headers: { "X-Demo-Role": role, Accept: "text/event-stream", ...(lastEventId ? { "Last-Event-ID": lastEventId } : {}) }, signal, cache: "no-store" });
  if (!response.ok || !response.body) throw new Error(`SSE HTTP ${response.status}`);
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let pending = "";
  try {
    while (!signal.aborted) {
      const { value, done } = await reader.read();
      if (done) break;
      pending += value.replaceAll("\r\n", "\n");
      let end: number;
      while ((end = pending.indexOf("\n\n")) >= 0) {
        const event = pending.slice(0, end).split("\n").find(line => line.startsWith("event:"));
        const idLine = pending.slice(0, end).split("\n").find(line => line.startsWith("id:"));
        const id = idLine ? idLine.slice(3).trim() : "";
        if (event) onEvent(event.slice(6).trim(), id);
        pending = pending.slice(end + 2);
      }
    }
  } finally { reader.releaseLock(); }
}
