# BPMCP — Business Process MCP

BPMCP is an open protocol and reference implementation for describing business processes as structured atoms that agents can discover and execute via the Model Context Protocol (MCP).

## Packages & Apps
- `@bpmcp/schema` – Zod models, JSON Schemas, `bpmcp-validate` CLI enforcing the 5-phase/5-flow rule.
- `@bpmcp/mcp-client` – TypeScript SDK for calling Catalog MCP servers (search/topology/atoms/agents).
- `@bpmcp/catalog-mcp` – Reference Fastify-based MCP server (memory + Postgres modes).
- `@bpmcp/policy-mcp` – Sample policy service providing per-diem and mileage calculators (memory + Postgres).
- `@bpmcp/examples` – CLI runner showcasing end-to-end planning with the seed bundle.
- `docs/` – Specification, quickstart, provider guidelines.
- `apps/dev-gateway-mcp` – Dev proxy for routing catalog/policy/provider MCPs via `/mcp`.
- `@bpmcp/mock-payhawk-mcp` – Stub provider implementing `payhawk.*` and `brex.*` tools for demos.
- `schemas/sql/` – Canonical Postgres schema (FTS trigger + optional pgvector hooks).
- `scripts/` – Database bootstrap and seed loader utilities.
- `docs-oss/` – Nextra-based documentation site (exported and published via GitHub Pages).

## Quick Start
```bash
pnpm install
pnpm seed:validate
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bpmcp
createdb bpmcp || true
pnpm seed:pg
# seeds now include policy per-diem and mileage reference rates
MODE=pg ARFITI_API_KEY_SINGLE=arf_live_dev pnpm --filter @bpmcp/catalog-mcp dev
# optional: policy + provider mocks (memory mode)
ARFITI_API_KEY_SINGLE=arf_live_dev pnpm --filter @bpmcp/policy-mcp dev
ARFITI_API_KEY_SINGLE=arf_live_dev pnpm --filter @bpmcp/mock-payhawk-mcp dev
```

Call the Catalog MCP:
```bash
curl -sS http://localhost:4000 \
  -H "Authorization: Bearer arf_live_dev" \
  -H "Content-Type: application/json" \
  -d '{"tool":"atoms.list","input":{"process_id":"p2p/per-diem","phase_id":"capture","provider":"payhawk","jurisdiction":"EE"}}' | jq .
```

Run the example runner:
```bash
pnpm --filter @bpmcp/examples run -- \
  --url http://localhost:4000 \
  --key arf_live_dev \
  --process p2p/per-diem \
  --provider payhawk \
  --jurisdiction EE
```

More walkthroughs and IDE snippets: `docs/quickstart.md`.
Published docs: https://docs.bpmcp.dev

## Development
- `pnpm build` – build all workspace packages.
- `pnpm lint` / `pnpm typecheck` – repo-wide linting and TS project references.
- `pnpm seed:validate` – run bundle validation with 5-phase/5-flow rule.
- `pnpm seed:pg` – load seed bundle into Postgres (`DATABASE_URL` required).
- `pnpm dev:gateway` – start the dev gateway (ensure upstream MCPs are running).
- `pnpm --filter @bpmcp/policy-mcp dev` – run policy MCP (memory by default).
- `pnpm --filter @bpmcp/mock-payhawk-mcp dev` – run mock provider MCP.

## Documentation
- Specification: `docs/spec.md`
- Provider guidelines: `docs/provider-guidelines.md`
- Quickstart + IDE snippets: `docs/quickstart.md`
- Dev gateway overview: `docs/gateway-shape.md`

## License
Apache-2.0 © Contributors
