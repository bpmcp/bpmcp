import fetch from "node-fetch";

export interface UpstreamOptions {
  baseUrl: string;
  timeoutMs: number;
  apiKey: string;
}

export async function callUpstream(opts: UpstreamOptions, tool: string, input: unknown) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs);
  try {
    const res = await fetch(opts.baseUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${opts.apiKey}`
      },
      body: JSON.stringify({ tool, input }),
      signal: controller.signal
    });

    const json = await res.json().catch(() => ({ error: { code: "invalid_json", message: "upstream returned invalid JSON" } }));

    if (!res.ok) {
      return { error: { code: `upstream_${res.status}`, message: (json as any)?.error?.message || res.statusText } };
    }

    return json;
  } catch (error: any) {
    if (error.name === "AbortError") {
      return { error: { code: "upstream_timeout", message: "Upstream request timed out" } };
    }
    return { error: { code: "upstream_failure", message: error.message || "Unknown upstream error" } };
  } finally {
    clearTimeout(timeout);
  }
}
