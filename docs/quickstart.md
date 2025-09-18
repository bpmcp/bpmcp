# BPMCP Quickstart

BPMCP is an open protocol for agents to interact with business processes and software. This guide helps you run the reference Catalog MCP locally using the seed bundle.

## 1. Install dependencies
```bash
pnpm install
```

## 2. Validate the sample bundle
```bash
pnpm seed:validate
```

## 3. Load seeds into Postgres
```bash
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bpmcp
createdb bpmcp || true
pnpm seed:pg
```
> This loads process atoms plus policy per-diem and mileage reference rates.

## 4. Run reference MCPs
```bash
MODE=pg ARFITI_API_KEY_SINGLE=arf_live_dev pnpm --filter @bpmcp/catalog-mcp dev
# policy service (memory mode)
ARFITI_API_KEY_SINGLE=arf_live_dev pnpm --filter @bpmcp/policy-mcp dev
# mock provider (serves payhawk.* and brex.* tools)
ARFITI_API_KEY_SINGLE=arf_live_dev pnpm --filter @bpmcp/mock-payhawk-mcp dev
```

## 5. Try the APIs directly
```bash
curl -sS http://localhost:4000 \
  -H "Authorization: Bearer arf_live_dev" \
  -H "Content-Type: application/json" \
  -d '{"tool":"atoms.list","input":{"process_id":"p2p/per-diem","phase_id":"capture","provider":"payhawk","jurisdiction":"EE"}}' | jq .

curl -sS http://localhost:4000 \
  -H "Authorization: Bearer arf_live_dev" \
  -H "Content-Type: application/json" \
  -d '{"tool":"atoms.list","input":{"process_id":"p2p/per-diem","phase_id":"capture","provider":"brex","jurisdiction":"US"}}' | jq .

curl -sS http://localhost:4005 \
  -H "Authorization: Bearer arf_live_dev" \
  -H "Content-Type: application/json" \
  -d '{"tool":"policy.per_diem_amount","input":{"destination":"Germany","start_date":"2025-10-02","end_date":"2025-10-04"}}' | jq .
```

## 6. Optional: start the dev gateway
```bash
cp apps/dev-gateway-mcp/providers.sample.yml apps/dev-gateway-mcp/providers.yml
API_KEY=arf_live_dev pnpm dev:gateway

curl -sS http://localhost:4020/mcp \
  -H "Authorization: Bearer arf_live_dev" \
  -H "Content-Type: application/json" \
  -d '{"tool":"catalog.search","input":{"q":"per-diem"}}' | jq .
```

## 7. Run the example runner
```bash
pnpm --filter @bpmcp/examples run -- \
  --url http://localhost:4000 \
  --key arf_live_dev \
  --process p2p/per-diem \
  --provider payhawk \
  --jurisdiction EE
```

## IDE snippets
**Claude Desktop (`servers.json`)**
```json
{
  "servers": [
    {
      "name": "bpmcp-catalog",
      "command": "bash",
      "args": ["-lc", "curl -fsS http://localhost:4000/healthz >/dev/null || exit 1; echo 'ready'"],
      "env": {
        "ARFITI_API_KEY": "arf_live_dev",
        "CATALOG_MCP_HTTP": "http://localhost:4000"
      }
    }
  ]
}
```

**VS Code / Cursor (`.vscode/mcp.json`)**
```json
{
  "mcpServers": {
    "bpmcp-catalog": {
      "command": "bash",
      "args": ["-lc", "curl -fsS ${env:CATALOG_MCP_HTTP}/healthz >/dev/null || exit 1; echo 'ready'"],
      "env": {
        "ARFITI_API_KEY": "arf_live_dev",
        "CATALOG_MCP_HTTP": "http://localhost:4000"
      }
    }
  }
}
```
