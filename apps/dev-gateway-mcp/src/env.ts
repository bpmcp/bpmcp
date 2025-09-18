import { z } from "zod";

export const Env = z.object({
  PORT: z.coerce.number().default(4020),
  API_KEY: z.string().default("arf_live_dev"),
  PROVIDERS_FILE: z.string().default("apps/dev-gateway-mcp/providers.yml"),
  UPSTREAM_TIMEOUT_MS: z.coerce.number().default(8000),
  RATE_READ_RPM: z.coerce.number().default(60),
  RATE_WRITE_RPM: z.coerce.number().default(30)
});

export type Env = z.infer<typeof Env>;

export function loadEnv(): Env {
  return Env.parse(process.env);
}
