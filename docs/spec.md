# BPMCP Specification (Open Core)

## 1. Protocol Purpose
BPMCP (Business Process MCP) defines a vendor-neutral contract that lets agents discover, plan, and execute business process “atoms” via the Model Context Protocol. The open core exposes:
- canonical data structures (`Process`, `Phase`, `Flow`, `Atom`, `AtomLink`, `Binding`, `AgentManifest`)
- a 5-phase / 5-flow topology rule that guarantees each process forms a directed cycle
- reference MCP tools (`catalog.search`, `process.topology`, `atoms.list`, `agents.describe`)
- guidelines for provider mappings and agent manifests

## 2. Data Model
| Object | Description | Key Fields |
| --- | --- | --- |
| `Process` | Top-level business process descriptor | `id`, `domain_id`, `title`, `version`, `meta` |
| `Phase` | Ordered stages within a process | `id`, `process_id`, `seq` (1..5), `title` |
| `Flow` | Directed transition between phases | `id`, `process_id`, `from_phase_id`, `to_phase_id` |
| `Atom` | Provider-neutral task snippet with textual steps | `id`, `title`, `type`, `platform`, `steps`, `notes`, `meta` |
| `AtomLink` | Binds an atom to either a phase or flow | `atom_id`, `process_id`, `phase_id?`, `flow_id?` |
| `Binding` | Provider/jurisdiction mapping to actual MCP tool names | `atom_id`, `process_id`, `provider`, `jurisdiction`, `tool_map`, `mcp_server`, `preconditions` |
| `AgentManifest` | Declares agent capabilities for a process | `id`, `process_id`, `capabilities`, `dependencies`, `meta` |

### 2.1 Serialization Rules
- Schemas are authored in Zod and emitted as JSON Schema (`packages/schema/dist/schemas`).
- Optional fields default to sensible empty values (`meta {}`, `notes []`, `capabilities []`).
- All identifiers are lowercase strings with `/` separators (e.g., `p2p/per-diem`).
- Versions follow SemVer but are not strictly validated yet (loose string).

### 2.2 Process Topology Rule (5 + 5)
- Every process MUST have exactly 5 phases with sequence numbers 1..5 (no gaps or duplicates).
- Every process MUST have exactly 5 flows forming a single directed cycle over the phases.
- Enforcement occurs via:
  - CLI `bpmcp-validate --bundle` (schema package)
  - Postgres schema constraints & seed validator
  - Catalog MCP topology tooling (`process.topology`)

## 3. MCP Tools
| Tool | Input | Output | Description |
| --- | --- | --- | --- |
| `catalog.search` | `{ q?, domain?, process_id?, provider?, jurisdiction?, type?, limit? }` | `{ results: SearchResult[] }` | Discover processes, atoms, and agents.
| `process.topology` | `{ process_id }` | `{ phases: {id,seq,title}[], flows: {id,from,to}[], cycle: string[] }` | Retrieves ordered phases + flow cycle.
| `atoms.list` | `{ process_id, phase_id?, flow_id?, provider, jurisdiction }` | `{ atoms: Atom[] }` | Returns atoms bound to a given phase/flow, mapping MCP tools.
| `agents.describe` | `{ id }` | `AgentManifest` | Returns metadata/capabilities for a process-specific agent.
| `policy.per_diem_amount` | `{ destination, start_date, end_date, role?, partial_days? }` | `{ currency, days, daily_amount, amount_total, breakdown }` | Calculates per-diem totals via policy MCP.
| `policy.mileage_amount` | `{ km, vehicle?, date? }` | `{ currency, per_km, km, amount_total }` | Computes mileage reimbursement amounts.

### 3.1 Authentication & Transport
- Reference servers use HTTP+JSON with bearer token (`ARFITI_API_KEY_SINGLE`).
- Production deployments can front servers with MCP stdio or other RPC transports.

## 4. Storage Reference (Postgres)
- `schemas/sql/schema.sql` provides canonical tables with indexes and FTS triggers.
- `scripts/db_apply.sh` applies schema and enables `pgcrypto` for UUID defaults.
- Seeds live under `packages/examples/seeds/bundle` and load via `scripts/load_seeds.ts`.

## 5. Validation & Tooling
- `@bpmcp/schema`: Zod models, JSON Schema generator, `bpmcp-validate` CLI.
- `@bpmcp/catalog-mcp`: Reference Fastify service (memory + Postgres).
- `@bpmcp/mcp-client`: Fetch-based TypeScript SDK for Catalog MCP.
- `@bpmcp/examples`: Runner CLI demonstrating process walkthroughs.
- `docs/quickstart.md`: End-to-end setup guide, CLI usage, IDE snippets.
- `@bpmcp/mock-payhawk-mcp`: Stub provider serving both `payhawk.*` and `brex.*` tools for multi-provider demos.

## 6. Extending BPMCP
- Add new domains/providers by contributing bindings + atoms.
- Extend catalog search filters via additional columns/indices.
- Publish provider-specific MCP servers referencing `tool_map` contracts.
- Inspire adoption by maintaining compatibility docs (see `docs/provider-guidelines.md`).

## 7. Compatibility & Versioning
- Each package uses semantic versioning via Changesets (Phase 7 deliverable).
- MCP tool responses should remain backward-compatible; add new fields as optional.
- The 5+5 topology rule anchors cross-provider workflows—do not break without major version bump.
