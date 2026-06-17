type StreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string | null;
      reasoning?: string | null;
      reasoning_content?: string | null;
    };
    finish_reason?: string | null;
  }>;
  error?: { message?: string };
};

type Listener = (...args: unknown[]) => void;

/**
 * Parses OpenAI-compatible SSE and Together NDJSON streams from the generation API.
 * OpenRouter returns SSE (`data: {...}`); Together returns newline-delimited JSON.
 */
export class ChatCompletionStreamClient {
  private listeners: Record<string, Listener[]> = {};
  private content = "";
  private reasoning = "";

  on(event: string, cb: Listener) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
    return this;
  }

  private emit(event: string, ...args: unknown[]) {
    for (const cb of this.listeners[event] ?? []) cb(...args);
  }

  static fromReadableStream(stream: ReadableStream<Uint8Array>) {
    const client = new ChatCompletionStreamClient();
    void client.consume(stream);
    return client;
  }

  private async consume(stream: ReadableStream<Uint8Array>) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let format: "sse" | "ndjson" | null = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        if (!format) {
          const trimmed = buffer.trimStart();
          if (trimmed.startsWith("data:") || trimmed.includes("\ndata:")) {
            format = "sse";
          } else if (trimmed.startsWith("{")) {
            format = "ndjson";
          }
        }

        if (format === "sse") {
          buffer = this.processSseBuffer(buffer);
        } else if (format === "ndjson") {
          buffer = this.processNdjsonBuffer(buffer);
        } else {
          // Wait for more bytes to detect format
          if (buffer.length > 4096) {
            format = "sse";
            buffer = this.processSseBuffer(buffer);
          }
        }
      }

      if (format === "ndjson" && buffer.trim()) {
        this.processNdjsonLine(buffer.trim());
      } else if (format === "sse" && buffer.trim()) {
        this.processSseEvent(buffer);
      } else if (!format && buffer.trim()) {
        // Fallback: try SSE then NDJSON
        const remaining = this.processSseBuffer(buffer + "\n\n");
        if (!this.content && remaining.trim()) {
          this.processNdjsonLine(remaining.trim());
        }
      }

      this.emit("finalContent", this.content);
    } catch (error) {
      this.emit("error", error);
      if (this.content) this.emit("finalContent", this.content);
    }
  }

  private processSseBuffer(buffer: string): string {
    let rest = buffer;
    while (true) {
      const boundary = rest.indexOf("\n\n");
      if (boundary === -1) break;
      const event = rest.slice(0, boundary);
      rest = rest.slice(boundary + 2);
      this.processSseEvent(event);
    }
    return rest;
  }

  private processSseEvent(event: string) {
    for (const line of event.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        this.processChunk(JSON.parse(data) as StreamChunk);
      } catch {
        // skip malformed chunks
      }
    }
  }

  private processNdjsonBuffer(buffer: string): string {
    let rest = buffer;
    while (true) {
      const newline = rest.indexOf("\n");
      if (newline === -1) break;
      const line = rest.slice(0, newline).trim();
      rest = rest.slice(newline + 1);
      if (line) this.processNdjsonLine(line);
    }
    return rest;
  }

  private processNdjsonLine(line: string) {
    try {
      this.processChunk(JSON.parse(line) as StreamChunk);
    } catch {
      // skip malformed lines
    }
  }

  private processChunk(chunk: StreamChunk) {
    if (chunk.error?.message) {
      throw new Error(chunk.error.message);
    }

    const delta = chunk.choices?.[0]?.delta;
    if (!delta) return;

    const textDelta = delta.content;
    if (textDelta) {
      this.content += textDelta;
      this.emit("content", textDelta, this.content);
    }

    const reasoningDelta = delta.reasoning ?? delta.reasoning_content;
    if (reasoningDelta) {
      this.reasoning += reasoningDelta;
      this.emit("reasoning", reasoningDelta);
    }
  }
}