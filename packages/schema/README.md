# @bpmcp/schema

Zod models, JSON Schemas, and a validator CLI for **BPMCP**.

## Installation
```bash
pnpm add @bpmcp/schema
```

## Usage
### Validate BPMCP JSON
```bash
# auto-detect object kinds
bpmcp-validate packages/examples/seeds/**/*.json

# force a specific kind
bpmcp-validate packages/examples/seeds/bindings/*.json --kind binding
```

Pass `--bundle` to enforce the BPMCP protocol rule (5 phases + 5-flow cycle per process):
```bash
bpmcp-validate packages/examples/seeds/bundle --bundle
```

### Generate JSON Schemas
```bash
pnpm --filter @bpmcp/schema build
pnpm --filter @bpmcp/schema generate
# emits dist/schemas/*.json
```

### Programmatic Usage
```ts
import { Atom } from "@bpmcp/schema";

const parsed = Atom.parse(json);
```

## Scripts
- `pnpm build` – compile TypeScript into `dist/`
- `pnpm generate` – emit JSON Schemas to `dist/schemas`
- `pnpm bpmcp-validate -- <paths>` – run the validator CLI from source (after `pnpm build`)
