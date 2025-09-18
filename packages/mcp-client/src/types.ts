export interface MCPResponse<T = unknown> {
  content: Array<{ type: "json"; json: T }>;
  error?: { code: string; message: string };
}

export type SearchResultKind = "process" | "agent" | "atom";

export interface SearchResult {
  kind: SearchResultKind;
  id: string;
  title: string;
  snippet?: string;
}

export interface AtomStep {
  text: string;
  mode: "ui" | "mcp" | "both";
  mcp_tools?: string[];
}

export interface Atom {
  id: string;
  title: string;
  notes: string[];
  steps: AtomStep[];
}

export interface TopologyPhase {
  id: string;
  seq: number;
  title: string;
}

export interface TopologyFlow {
  id: string;
  from: string;
  to: string;
}

export interface ProcessTopology {
  phases: TopologyPhase[];
  flows: TopologyFlow[];
  cycle: string[];
}
