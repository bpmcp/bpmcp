# @bpmcp/catalog-mcp

Reference **Catalog MCP** (HTTP) exposing:
- `catalog.search`
- `atoms.list`
- `agents.describe`

## Run (memory mode)
```bash
ARFITI_API_KEY_SINGLE=arf_live_dev MODE=memory pnpm --filter @bpmcp/catalog-mcp dev
```

## Run (Postgres mode)
```bash
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bpmcp
export MODE=pg
export ARFITI_API_KEY_SINGLE=arf_live_dev
pnpm --filter @bpmcp/catalog-mcp dev
```

## Example call
```bash
curl -sS http://localhost:4000 \
  -H "Authorization: Bearer arf_live_dev" \
  -H "Content-Type: application/json" \
  -d '{"tool":"atoms.list","input":{"process_id":"p2p/per-diem","phase_id":"capture","provider":"payhawk","jurisdiction":"EE"}}' | jq .
```
