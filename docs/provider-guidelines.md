# BPMCP Provider Guidelines

These recommendations help vendors expose their MCP tooling so it plugs cleanly into the BPMCP catalog.

## 1. Naming & Versioning
- **Provider slug**: lowercase identifier (`payhawk`, `netsuite`, `sap`).
- **Tool names**: use `provider.action` (e.g., `payhawk.attach_document`).
- **Server name**: expose as `mcp_server` (e.g., `payhawk-mcp`) for routing.
- **Versions**: align MCP tool version with backend API where possible; document breaking changes.

## 2. Tool Contracts
- Return JSON objects that map naturally to atom steps.
- Prefer concise, deterministic shapes to aid agent planning.
- Include `description`, structured input/output schemas, and examples.

## 3. Tool Mapping (`tool_map`)
- Keys correspond to atom step hints (e.g., `capture`, `submit`).
- Values reference actual MCP tool names or fully-qualified operations.
- Include optional fallback logic if multiple tools fulfill the same step.

## 4. Authentication & Secrets
- Keep tokens out of bindings; rely on MCP server configuration.
- Document expected headers, OAuth scopes, or credential rotation strategy.
- Support per-workspace API keys for multitenant deployments.

## 5. Error Handling
- Return structured errors with machine-readable codes (`invalid_state`, `permission_denied`).
- Attach remediation hints (`retry_after`, `contact_support`).
- Avoid leaking provider-specific stack traces.

## 6. Testing & Certification
- Provide mock or sandbox environments aligned with BPMCP seed data.
- Offer automated smoke tests that call the provider MCP via `/mcp` gateways.
- Consider publishing JSON fixtures for providers to aid documentation.

## 7. Contribution Checklist
- Add bindings under `packages/examples` (if open sourcing) or private catalog.
- Supply a short README describing provider prerequisites.
- Validate bundles with `pnpm seed:validate` prior to PR submission.

Following these practices keeps the BPMCP ecosystem consistent and ensures agents can trust provider integrations.
