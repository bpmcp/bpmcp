import { z } from "zod";

export const Env = z.object({
  PORT: z.coerce.number().default(4000),
  MODE: z.enum(["memory", "pg"]).default("memory"),
  ARFITI_API_KEY_SINGLE: z.string().default("arf_live_dev"),
  DATABASE_URL: z.string().optional()
});

export type Env = z.infer<typeof Env>;

export function loadEnv(): Env {
  return Env.parse(process.env);
}
