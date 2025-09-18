import fetch from "node-fetch";
import type {
  Atom,
  MCPResponse,
  ProcessTopology,
  SearchResult
} from "./types.js";

export interface CatalogClientOptions {
  baseUrl: string;
  apiKey: string;
}

export class CatalogClient {
  constructor(private readonly opts: CatalogClientOptions) {}

  private async call<T>(tool: string, input: unknown): Promise<T> {
    const res = await fetch(this.opts.baseUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.opts.apiKey}`
      },
      body: JSON.stringify({ tool, input })
    });

    if (!res.ok) {
      throw new Error(`catalog_mcp_http_${res.status}`);
    }

    const payload = (await res.json()) as MCPResponse<T>;
    if (payload.error) {
      throw new Error(payload.error.message || payload.error.code);
    }

    return payload.content[0]?.json as T;
  }

  async search(input: {
    q?: string;
    domain?: string;
    process_id?: string;
    provider?: string;
    jurisdiction?: string;
    type?: "process" | "agent" | "atom" | "any";
    limit?: number;
  }): Promise<{ results: SearchResult[] }> {
    return this.call("catalog.search", input);
  }

  async listAtoms(input: {
    process_id: string;
    phase_id?: string;
    flow_id?: string;
    provider: string;
    jurisdiction: string;
  }): Promise<{ atoms: Atom[] }> {
    return this.call("atoms.list", input);
  }

  async describeAgent(id: string): Promise<any> {
    return this.call("agents.describe", { id });
  }

  async getTopology(process_id: string): Promise<ProcessTopology> {
    return this.call("process.topology", { process_id });
  }
}
