import { z } from "zod";
import type pg from "pg";
import type { Env } from "../env.js";
import { memory } from "../memory.js";

const TypeEnum = z.enum(["process", "atom", "agent", "any"]);

export const inputSchema = z.object({
  q: z.string().optional(),
  domain: z.string().optional(),
  process_id: z.string().optional(),
  provider: z.string().optional(),
  jurisdiction: z.string().optional(),
  type: TypeEnum.optional(),
  limit: z.coerce.number().int().positive().max(100).optional()
});

export type Input = z.infer<typeof inputSchema>;

type SearchResult = {
  kind: "process" | "atom" | "agent";
  id: string;
  title: string;
  snippet?: string;
};

function normalize(str: string) {
  return str.toLowerCase();
}

export async function handle(input: Input, env: Env, pool?: pg.Pool) {
  const results: SearchResult[] = [];
  const limit = input.limit ?? 25;
  const q = input.q ? normalize(input.q) : undefined;
  const filterType = input.type ?? "any";

  if (env.MODE === "memory") {
    if (filterType === "any" || filterType === "process") {
      for (const proc of memory.processes) {
        if (input.domain && proc.domain_id !== input.domain) continue;
        if (input.process_id && proc.id !== input.process_id) continue;
        if (q && !proc.title.toLowerCase().includes(q) && !proc.id.toLowerCase().includes(q)) continue;
        results.push({ kind: "process", id: proc.id, title: proc.title });
        if (results.length >= limit) return { results };
      }
    }

    if (filterType === "any" || filterType === "agent") {
      for (const agent of memory.agents) {
        if (input.process_id && agent.process_id !== input.process_id) continue;
        const title = `${agent.id} (${agent.process_id})`;
        if (q && !title.toLowerCase().includes(q)) continue;
        results.push({ kind: "agent", id: agent.id, title });
        if (results.length >= limit) return { results };
      }
    }

    if (filterType === "any" || filterType === "atom") {
      for (const atom of memory.atoms) {
        if (q && !atom.title.toLowerCase().includes(q) && !atom.id.toLowerCase().includes(q)) continue;
        if (input.process_id) {
          const link = memory.atom_links.find(
            (al) => al.atom_id === atom.id && al.process_id === input.process_id
          );
          if (!link) continue;
        }
        if (input.provider || input.jurisdiction) {
          const binding = memory.bindings.find(
            (b) =>
              b.atom_id === atom.id &&
              (!input.process_id || b.process_id === input.process_id) &&
              (!input.provider || b.provider === input.provider) &&
              (!input.jurisdiction || b.jurisdiction === input.jurisdiction)
          );
          if (!binding) continue;
        }
        results.push({ kind: "atom", id: atom.id, title: atom.title, snippet: atom.steps[0]?.text });
        if (results.length >= limit) return { results };
      }
    }

    return { results };
  }

  const client = await pool!.connect();
  try {
    if (filterType === "any" || filterType === "process") {
      type ProcessRow = { id: string; title: string };
      const { rows } = await client.query<ProcessRow>(
        `SELECT id, title
         FROM processes
         WHERE ($1::text IS NULL OR domain_id = $1)
           AND ($2::text IS NULL OR id = $2)
           AND ($3::text IS NULL OR LOWER(title) LIKE '%'||LOWER($3)||'%' OR LOWER(id) LIKE '%'||LOWER($3)||'%')
         ORDER BY title
         LIMIT $4`,
        [input.domain ?? null, input.process_id ?? null, input.q ?? null, limit]
      );
      for (const row of rows) {
        results.push({ kind: "process", id: row.id, title: row.title });
      }
    }

    if (filterType === "any" || filterType === "agent") {
      type AgentRow = { id: string; process_id: string; title: string };
      const { rows } = await client.query<AgentRow>(
        `SELECT a.id, a.process_id, p.title
         FROM agents a
         JOIN processes p ON p.id = a.process_id
         WHERE ($1::text IS NULL OR a.process_id = $1)
           AND ($2::text IS NULL OR LOWER(a.id) LIKE '%'||LOWER($2)||'%' OR LOWER(p.title) LIKE '%'||LOWER($2)||'%')
         ORDER BY a.id
         LIMIT $3`,
        [input.process_id ?? null, input.q ?? null, limit]
      );
      for (const row of rows) {
        results.push({ kind: "agent", id: row.id, title: `${row.id} (${row.process_id})` });
      }
    }

    if (filterType === "any" || filterType === "atom") {
      type AtomRow = { id: string; title: string; snippet: string | null };
      const { rows } = await client.query<AtomRow>(
        `SELECT DISTINCT a.id, a.title, (a.steps->0->>'text') AS snippet
         FROM atoms a
         LEFT JOIN atom_links al ON al.atom_id = a.id
         LEFT JOIN bindings b ON b.atom_id = a.id
         WHERE ($1::text IS NULL OR LOWER(a.title) LIKE '%'||LOWER($1)||'%' OR LOWER(a.id) LIKE '%'||LOWER($1)||'%')
           AND ($2::text IS NULL OR al.process_id = $2 OR b.process_id = $2)
           AND ($3::text IS NULL OR b.provider = $3)
           AND ($4::text IS NULL OR b.jurisdiction = $4)
         ORDER BY a.title
         LIMIT $5`,
        [input.q ?? null, input.process_id ?? null, input.provider ?? null, input.jurisdiction ?? null, limit]
      );
      for (const row of rows) {
        results.push({ kind: "atom", id: row.id, title: row.title, snippet: row.snippet ?? undefined });
      }
    }

    return { results: results.slice(0, limit) };
  } finally {
    client.release();
  }
}
