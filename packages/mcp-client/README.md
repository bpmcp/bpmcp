# @bpmcp/mcp-client

TypeScript client SDK for BPMCP Catalog MCP servers.

## Install
```bash
pnpm add @bpmcp/mcp-client
```

## Usage
```ts
import { CatalogClient } from "@bpmcp/mcp-client";

const client = new CatalogClient({
  baseUrl: "http://localhost:4000",
  apiKey: "arf_live_dev"
});

const search = await client.search({ q: "per-diem" });
const atoms = await client.listAtoms({
  process_id: "p2p/per-diem",
  phase_id: "capture",
  provider: "payhawk",
  jurisdiction: "EE"
});
```

## API
- `search({ q?, domain?, process_id?, provider?, jurisdiction?, type?, limit? })`
- `listAtoms({ process_id, phase_id?, flow_id?, provider, jurisdiction })`
- `describeAgent(id)`
- `getTopology(process_id)`
