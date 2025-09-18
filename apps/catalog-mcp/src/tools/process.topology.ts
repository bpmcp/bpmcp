import { z } from "zod";
import type pg from "pg";
import type { Env } from "../env.js";
import { memory } from "../memory.js";

export const inputSchema = z.object({ process_id: z.string() });
export type Input = z.infer<typeof inputSchema>;

export interface TopologyPhase {
  id: string;
  seq: number;
  title: string;
}

export interface TopologyFlow {
  id: string;
  from: string;
  to: string;
}

export interface ProcessTopology {
  phases: TopologyPhase[];
  flows: TopologyFlow[];
  cycle: string[];
}

export async function handle(input: Input, env: Env, pool?: pg.Pool): Promise<ProcessTopology> {
  if (env.MODE === "memory") {
    const phases = memory.phases
      .filter((phase) => phase.process_id === input.process_id)
      .map((phase) => ({ id: phase.id, seq: phase.seq, title: phase.title }))
      .sort((a, b) => a.seq - b.seq);
    const flows = memory.flows
      .filter((flow) => flow.process_id === input.process_id)
      .map((flow) => ({ id: flow.id, from: flow.from_phase_id, to: flow.to_phase_id }));
    const cycle = phases.map((phase) => phase.id);
    if (!phases.length) throw new Error("process_not_found");
    return { phases, flows, cycle };
  }

  const client = await pool!.connect();
  try {
    type PhaseRow = { id: string; seq: number; title: string };
    const { rows: phaseRows } = await client.query<PhaseRow>(
      `SELECT id, seq, title FROM phases WHERE process_id = $1 ORDER BY seq ASC`,
      [input.process_id]
    );
    if (!phaseRows.length) {
      throw new Error("process_not_found");
    }

    type FlowRow = { id: string; from_phase_id: string; to_phase_id: string };
    const { rows: flowRows } = await client.query<FlowRow>(
      `SELECT id, from_phase_id, to_phase_id FROM flows WHERE process_id = $1 ORDER BY id`,
      [input.process_id]
    );

    const phases = phaseRows.map((row) => ({ id: row.id, seq: row.seq, title: row.title }));
    const flows = flowRows.map((row) => ({ id: row.id, from: row.from_phase_id, to: row.to_phase_id }));
    const cycle = phases.map((phase) => phase.id);
    return { phases, flows, cycle };
  } finally {
    client.release();
  }
}
