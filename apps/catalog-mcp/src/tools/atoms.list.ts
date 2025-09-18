import { z } from "zod";
import type pg from "pg";
import type { Env } from "../env.js";
import { memory } from "../memory.js";

export const inputSchema = z.object({
  process_id: z.string(),
  phase_id: z.string().optional(),
  flow_id: z.string().optional(),
  provider: z.string(),
  jurisdiction: z.string(),
  workspace_id: z.string().optional()
});

export type Input = z.infer<typeof inputSchema>;

export async function handle(input: Input, env: Env, pool?: pg.Pool) {
  if (!!input.phase_id === !!input.flow_id) {
    throw new Error("Provide exactly one of phase_id or flow_id");
  }

  if (env.MODE === "memory") {
    const links = memory.atom_links.filter((link) => {
      if (link.process_id !== input.process_id) return false;
      if (input.phase_id) return link.phase_id === input.phase_id;
      if (input.flow_id) return link.flow_id === input.flow_id;
      return false;
    });

    const atoms = links
      .map((link) => {
        const atom = memory.atoms.find((a) => a.id === link.atom_id);
        if (!atom) return null;
      const binding = memory.bindings.find(
        (b) =>
          b.atom_id === atom.id &&
          b.process_id === input.process_id &&
          b.provider === input.provider &&
          b.jurisdiction === input.jurisdiction
      );
      if (!binding) return null;
      const toolMap = binding.tool_map || {};
      const steps = atom.steps.map((step: any) =>
        step.mode === "mcp" || step.mode === "both"
          ? {
              ...step,
              mcp_tools: (step.mcp_tools || []).map((tool: string) => toolMap[tool] || tool)
            }
          : step
      );
        return { id: atom.id, title: atom.title, notes: atom.notes ?? [], steps };
      })
      .filter((value): value is { id: string; title: string; notes: any[]; steps: any[] } => value !== null);

    return { atoms };
  }

  const client = await pool!.connect();
  try {
    type DbAtomRow = {
      id: string;
      title: string;
      notes: any[];
      steps: any[];
      tool_map: Record<string, string>;
    };

    const { rows } = await client.query<DbAtomRow>(
      `SELECT a.id, a.title, a.notes, a.steps, b.tool_map
       FROM atoms a
       JOIN atom_links al ON al.atom_id = a.id AND al.process_id = $1
       JOIN bindings b ON b.atom_id = a.id AND b.process_id = $1
       WHERE (
         ($2::text IS NOT NULL AND al.phase_id = $2)
         OR
         ($3::text IS NOT NULL AND al.flow_id = $3)
       )
         AND b.provider = $4
         AND b.jurisdiction = $5
       ORDER BY a.id`,
      [
        input.process_id,
        input.phase_id ?? null,
        input.flow_id ?? null,
        input.provider,
        input.jurisdiction
      ]
    );

    const atoms = rows.map((row) => {
      const toolMap = row.tool_map || {};
      const steps = (row.steps || []).map((step: any) =>
        step.mode === "mcp" || step.mode === "both"
          ? {
              ...step,
              mcp_tools: (step.mcp_tools || []).map((tool: string) => toolMap[tool] || tool)
            }
          : step
      );
      return { id: row.id, title: row.title, notes: row.notes || [], steps };
    });

    return { atoms };
  } finally {
    client.release();
  }
}
