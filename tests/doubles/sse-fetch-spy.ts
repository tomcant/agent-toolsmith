type Fetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

type SseFetchSpy = Fetch & { readonly calls: SpyCall[] };

type SseEvent = { event: string; data: unknown };

type SpyCall = { url: string; method: string; body: unknown };

export function sseFetchSpy(events: SseEvent[][] = []): SseFetchSpy {
  const calls: SpyCall[] = [];
  let replyIndex = 0;

  const fetch: Fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : input.toString();
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    const rawBody = init?.body ?? (input instanceof Request ? await input.text() : undefined);
    const body = typeof rawBody === "string" ? JSON.parse(rawBody) : undefined;

    calls.push({ url, method, body });

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const { event, data } of events[replyIndex++] ?? []) {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });
  };

  return Object.assign(fetch, { calls });
}
