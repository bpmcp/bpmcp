import { z } from "zod";
import type pg from "pg";
import type { Env } from "./env.js";
import * as PerDiem from "./tools/policy.per_diem_amount.js";
import * as Mileage from "./tools/policy.mileage_amount.js";

const requestSchema = z.object({
  tool: z.string(),
  input: z.unknown().optional()
});

export async function route(body: unknown, env: Env, pool?: pg.Pool) {
  const { tool, input } = requestSchema.parse(body);

  switch (tool) {
    case "policy.per_diem_amount": {
      const parsed = PerDiem.inputSchema.parse(input ?? {});
      const json = await PerDiem.handle(parsed, env, pool);
      return { content: [{ type: "json", json }] };
    }
    case "policy.mileage_amount": {
      const parsed = Mileage.inputSchema.parse(input ?? {});
      const json = await Mileage.handle(parsed, env, pool);
      return { content: [{ type: "json", json }] };
    }
    default:
      throw Object.assign(new Error(`unknown_tool: ${tool}`), { statusCode: 404 });
  }
}
