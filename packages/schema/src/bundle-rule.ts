import type { z } from "zod";
import { Flow, Phase } from "./models.js";

export type BundleContext = {
  processId: string;
  phases: z.infer<typeof Phase>[];
  flows: z.infer<typeof Flow>[];
};

export function validateFivePhaseCycle(ctx: BundleContext): string[] {
  const issues: string[] = [];
  const { processId, phases, flows } = ctx;

  if (phases.length !== 5) {
    issues.push(`expected 5 phases, found ${phases.length}`);
  } else {
    const seqs = phases.map((p) => p.seq).sort((a, b) => a - b);
    const expectedSeqs = [1, 2, 3, 4, 5];
    if (seqs.some((num, idx) => num !== expectedSeqs[idx])) {
      issues.push(`phase seq must be 1..5 (found ${seqs.join(",")})`);
    }
  }

  if (flows.length !== 5) {
    issues.push(`expected 5 flows, found ${flows.length}`);
    return issues;
  }

  const phaseIds = new Set(phases.map((p) => p.id));
  const successors = new Map<string, string>();
  const predecessors = new Map<string, string>();

  for (const flow of flows) {
    const { from_phase_id: from, to_phase_id: to } = flow;
    if (!phaseIds.has(from) || !phaseIds.has(to)) {
      issues.push(`flow ${from}->${to} references unknown phase`);
      continue;
    }
    if (successors.has(from)) {
      issues.push(`phase ${from} has multiple outgoing flows`);
    }
    if (predecessors.has(to)) {
      issues.push(`phase ${to} has multiple incoming flows`);
    }
    successors.set(from, to);
    predecessors.set(to, from);
  }

  if (issues.length) {
    return issues;
  }

  if (successors.size !== 5 || predecessors.size !== 5) {
    issues.push("flows must provide a unique successor and predecessor per phase");
    return issues;
  }

  const start = phases.sort((a, b) => a.seq - b.seq)[0]?.id;
  if (!start) {
    issues.push("unable to determine start phase");
    return issues;
  }

  let current = start;
  for (let i = 0; i < 5; i++) {
    const next = successors.get(current);
    if (!next) {
      issues.push(`phase ${current} does not continue the cycle`);
      break;
    }
    current = next;
  }

  if (issues.length) {
    return issues;
  }

  if (current !== start) {
    issues.push("flows must form a single directed cycle");
  }

  return issues;
}
