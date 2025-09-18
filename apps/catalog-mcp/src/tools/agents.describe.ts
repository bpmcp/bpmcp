import { z } from "zod";
import type pg from "pg";
import type { Env } from "../env.js";
import { memory } from "../memory.js";

export const inputSchema = z.object({ id: z.string() });
export type Input = z.infer<typeof inputSchema>;

export async function handle(input: Input, env: Env, pool?: pg.Pool) {
  if (env.MODE === "memory") {
    const agent = memory.agents.find((a) => a.id === input.id);
    if (!agent) throw new Error("not_found");
    return agent;
  }

  const client = await pool!.connect();
  try {
    const { rows } = await client.query<{
      id: string;
      process_id: string;
      version: string;
      description: string | null;
      capabilities: any[];
      dependencies: any[];
      meta: Record<string, unknown>;
    }>(
      `SELECT id, process_id, version, description, capabilities, dependencies, meta
       FROM agents
       WHERE id = $1
       LIMIT 1`,
      [input.id]
    );
    if (!rows.length) throw new Error("not_found");
    const row = rows[0];
    return {
      id: row.id,
      process_id: row.process_id,
      version: row.version,
      description: row.description ?? undefined,
      capabilities: row.capabilities ?? [],
      dependencies: row.dependencies ?? [],
      meta: row.meta ?? {}
    };
  } finally {
    client.release();
  }
}
