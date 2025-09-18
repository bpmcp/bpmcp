import { z } from "zod";

/** ----- Common primitives ----- */
export const Id = z.string().min(1);
export const ISODate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const ISODateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T/);
export const Semver = z.string().min(1); // loosened until version policy finalizes

/** ----- Process & topology ----- */
export const Process = z.object({
  id: Id, // e.g., "p2p/employee-expenses/per-diem"
  domain_id: Id,
  title: z.string().min(1),
  description: z.string().optional(),
  version: Semver.default("1.0.0"),
  meta: z.record(z.any()).default({})
});

export const Phase = z.object({
  id: Id,
  process_id: Id,
  seq: z.number().int().min(1),
  title: z.string().min(1)
});

export const Flow = z.object({
  id: Id,
  process_id: Id,
  from_phase_id: Id,
  to_phase_id: Id
});

/** ----- Atoms ----- */
export const AtomType = z.enum(["procedure", "reference", "concept"]);
export const AtomPlatform = z.enum(["Mobile", "Web", "API", "Mixed"]);

export const AtomStep = z.object({
  text: z.string().min(1),
  mode: z.enum(["ui", "mcp", "both"]),
  mcp_tools: z.array(z.string()).optional()
});

export const Atom = z.object({
  id: Id,
  title: z.string().min(1),
  type: AtomType,
  platform: AtomPlatform,
  source_url: z.string().url().optional(),
  source_rev: z.string().optional(),
  prereq: z.string().optional(),
  notes: z.array(z.string()).default([]),
  steps: z.array(AtomStep).min(1),
  meta: z.record(z.any()).default({})
});

export const AtomLink = z
  .object({
    atom_id: Id,
    process_id: Id,
    phase_id: Id.optional(),
    flow_id: Id.optional()
  })
  .refine(
    (value) => (value.phase_id ? !value.flow_id : value.flow_id ? !value.phase_id : false),
    { message: "Provide exactly one of phase_id or flow_id" }
  );

/** ----- Bindings (provider/jurisdiction) ----- */
export const Binding = z.object({
  atom_id: Id,
  process_id: Id,
  provider: z.string().min(1),
  jurisdiction: z.string().min(2),
  mcp_server: z.string().min(1),
  tool_map: z
    .record(z.string(), z.string())
    .refine((map) => Object.keys(map).length > 0, { message: "tool_map must have at least one mapping" }),
  preconditions: z.array(z.string()).default([]),
  version: Semver.default("1.0.0"),
  valid_from: ISODateTime.optional(),
  valid_to: ISODateTime.optional()
});

/** ----- Agent manifest (capability surface) ----- */
export const AgentCapability = z.object({
  name: z.string().min(1),
  input_schema: z.any().optional(),
  output_schema: z.any().optional()
});

export const AgentManifest = z.object({
  id: Id,
  process_id: Id,
  version: Semver.default("1.0.0"),
  description: z.string().optional(),
  capabilities: z.array(AgentCapability).default([]),
  dependencies: z.array(z.string()).default([]),
  meta: z.record(z.any()).default({})
});

/** ----- Discriminated helper: best-effort kind detection ----- */
export type BPMCPKind = "process" | "phase" | "flow" | "atom" | "atom_link" | "binding" | "agent";
export const Schemas: Record<BPMCPKind, z.ZodTypeAny> = {
  process: Process,
  phase: Phase,
  flow: Flow,
  atom: Atom,
  atom_link: AtomLink,
  binding: Binding,
  agent: AgentManifest
};

export function detectKind(obj: unknown): BPMCPKind | null {
  const o = obj as Record<string, unknown>;
  if (o?.steps && o?.title && o?.type) return "atom";
  if (o?.atom_id && (o?.phase_id || o?.flow_id)) return "atom_link";
  if (o?.tool_map && o?.provider) return "binding";
  if (o?.from_phase_id && o?.to_phase_id) return "flow";
  if (o?.seq && o?.process_id && o?.title) return "phase";
  if (o?.capabilities && o?.process_id && o?.version) return "agent";
  if (o?.domain_id && o?.title) return "process";
  return null;
}
