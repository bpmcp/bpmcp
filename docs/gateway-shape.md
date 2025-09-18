# Dev Gateway MCP

The dev gateway provides a single `/mcp` endpoint that proxies requests to the Catalog MCP, optional Policy MCP, and provider MCP servers.

## Responsibilities
- Verify an external API key (`API_KEY` env var).
- Map `catalog.*`, `process.topology`, `agents.describe` to the Catalog MCP.
- Map `policy.*` tools to the Policy MCP (if configured).
- Route `<provider>.*` tools to provider MCPs defined in `providers.yml`.
- Apply lightweight per-key rate limits (separate read/write RPM).

## Configuration
- Copy `apps/dev-gateway-mcp/providers.sample.yml` to `providers.yml` and set upstream URLs.
- Environment variables:
  - `PORT` (default `4020`)
  - `API_KEY` (default `arf_live_dev`)
  - `PROVIDERS_FILE` (path to YAML config)
  - `UPSTREAM_TIMEOUT_MS`, `RATE_READ_RPM`, `RATE_WRITE_RPM`

## Run
```bash
cp apps/dev-gateway-mcp/providers.sample.yml apps/dev-gateway-mcp/providers.yml
API_KEY=arf_live_dev pnpm dev:gateway
```

Ensure upstream services are running:
```bash
MODE=pg ARFITI_API_KEY_SINGLE=arf_live_dev pnpm --filter @bpmcp/catalog-mcp dev
ARFITI_API_KEY_SINGLE=arf_live_dev pnpm --filter @bpmcp/policy-mcp dev
ARFITI_API_KEY_SINGLE=arf_live_dev pnpm --filter @bpmcp/mock-payhawk-mcp dev  # serves payhawk.* and brex.* tools
```

Example call:
```bash
curl -sS http://localhost:4020/mcp \
  -H "Authorization: Bearer arf_live_dev" \
  -H "Content-Type: application/json" \
  -d '{"tool":"catalog.search","input":{"q":"per-diem"}}'
```

> ⚠️ The dev gateway is for local development only. Production-grade routing (billing, secure credential storage, observability) belongs in the managed Arfiti stack.
