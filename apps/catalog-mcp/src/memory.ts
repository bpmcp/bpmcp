export type MemoryDataset = {
  processes: Array<{ id: string; domain_id: string; title: string; version: string }>;
  phases: Array<{ id: string; process_id: string; seq: number; title: string }>;
  flows: Array<{ id: string; process_id: string; from_phase_id: string; to_phase_id: string }>;
  atoms: Array<{ id: string; title: string; type: string; platform: string; steps: any[]; notes: any[] }>;
  atom_links: Array<{ atom_id: string; process_id: string; phase_id?: string; flow_id?: string }>;
  bindings: Array<{
    atom_id: string;
    process_id: string;
    provider: string;
    jurisdiction: string;
    mcp_server: string;
    tool_map: Record<string, string>;
  }>;
  agents: Array<{
    id: string;
    process_id: string;
    version: string;
    description?: string;
    capabilities: Array<{ name: string }>;
    dependencies: string[];
    meta?: Record<string, unknown>;
  }>;
};

// Minimal demo dataset (mirrors packages/examples/seeds bundle)
export const memory: MemoryDataset = {
  processes: [
    { id: "p2p/per-diem", domain_id: "p2p", title: "Per-Diem Reimbursement", version: "1.0.0" }
  ],
  phases: [
    { id: "capture", process_id: "p2p/per-diem", seq: 1, title: "Capture" },
    { id: "enrich", process_id: "p2p/per-diem", seq: 2, title: "Enrich" },
    { id: "approval", process_id: "p2p/per-diem", seq: 3, title: "Approval" },
    { id: "posting", process_id: "p2p/per-diem", seq: 4, title: "Posting" },
    { id: "payment", process_id: "p2p/per-diem", seq: 5, title: "Payment" }
  ],
  flows: [
    { id: "f1", process_id: "p2p/per-diem", from_phase_id: "capture", to_phase_id: "enrich" },
    { id: "f2", process_id: "p2p/per-diem", from_phase_id: "enrich", to_phase_id: "approval" },
    { id: "f3", process_id: "p2p/per-diem", from_phase_id: "approval", to_phase_id: "posting" },
    { id: "f4", process_id: "p2p/per-diem", from_phase_id: "posting", to_phase_id: "payment" },
    { id: "f5", process_id: "p2p/per-diem", from_phase_id: "payment", to_phase_id: "capture" }
  ],
  atoms: [
    {
      id: "atom_capture_receipt",
      title: "Capture receipt",
      type: "procedure",
      platform: "Mobile",
      steps: [
        { text: "Open app and take photo of the receipt", mode: "ui" },
        { text: "Attach image to the per-diem entry", mode: "ui" }
      ],
      notes: []
    }
  ],
  atom_links: [
    { atom_id: "atom_capture_receipt", process_id: "p2p/per-diem", phase_id: "capture" }
  ],
  bindings: [
    {
      atom_id: "atom_capture_receipt",
      process_id: "p2p/per-diem",
      provider: "payhawk",
      jurisdiction: "EE",
      mcp_server: "payhawk-mcp",
      tool_map: { capture: "payhawk.attach_document" }
    },
    {
      atom_id: "atom_capture_receipt",
      process_id: "p2p/per-diem",
      provider: "brex",
      jurisdiction: "US",
      mcp_server: "brex-mcp",
      tool_map: { capture: "brex.attach_receipt" }
    }
  ],
  agents: [
    {
      id: "per-diem-agent",
      process_id: "p2p/per-diem",
      version: "1.0.0",
      description: "Example per-diem agent with two basic capabilities.",
      capabilities: [{ name: "request_per_diem" }, { name: "settle_per_diem" }],
      dependencies: [],
      meta: {}
    }
  ]
};
