#!/usr/bin/env node
import { Command } from "commander";
import fg from "fast-glob";
import { readFile } from "node:fs/promises";
import { BPMCPKind, Flow, Phase, Schemas, detectKind } from "./models.js";
import type { z } from "zod";
import { validateFivePhaseCycle } from "./bundle-rule.js";

type BundleStats = {
  processes: Set<string>;
  phases: Map<string, z.infer<typeof Phase>[]>;
  flows: Map<string, z.infer<typeof Flow>[]>;
};

const program = new Command();
program
  .name("bpmcp-validate")
  .description("Validate BPMCP JSON files against open schemas")
  .argument("<paths...>", "file or directory globs (e.g., atoms/*.json)")
  .option("-k, --kind <kind>", "force kind: atom|binding|process|phase|flow|agent|atom_link")
  .option("-b, --bundle", "enforce BPMCP bundle rules (5 phases + 5-flow cycle per process)")
  .action(async (paths: string[], opts: { kind?: string; bundle?: boolean }) => {
    const files = await fg(paths, { onlyFiles: true, dot: false, unique: true });
    if (!files.length) {
      console.error("No files matched.");
      process.exit(2);
    }

    let okCount = 0;
    let errCount = 0;
    const bundleStats: BundleStats | undefined = opts.bundle
      ? { processes: new Set(), phases: new Map(), flows: new Map() }
      : undefined;

    for (const filePath of files) {
      try {
        const raw = await readFile(filePath, "utf8");
        const obj = JSON.parse(raw);
        const forced = opts.kind as BPMCPKind | undefined;
        const kind = forced ?? detectKind(obj);
        if (!kind) {
          throw new Error("Unable to detect kind; pass --kind to force");
        }

        const parsed = Schemas[kind].safeParse(obj);
        if (!parsed.success) {
          errCount++;
          console.error(`✖ ${filePath}  [${kind}]`);
          for (const issue of parsed.error.issues) {
            console.error(`  - ${issue.path.join(".") || "(root)"}: ${issue.message}`);
          }
          continue;
        }

        okCount++;
        console.log(`✔ ${filePath}  [${kind}]`);

        if (!bundleStats) continue;
        const data = parsed.data as any;
        switch (kind) {
          case "process": {
            bundleStats.processes.add(data.id);
            break;
          }
          case "phase": {
            const phases = bundleStats.phases.get(data.process_id) ?? [];
            phases.push(data);
            bundleStats.phases.set(data.process_id, phases);
            bundleStats.processes.add(data.process_id);
            break;
          }
          case "flow": {
            const flows = bundleStats.flows.get(data.process_id) ?? [];
            flows.push(data);
            bundleStats.flows.set(data.process_id, flows);
            bundleStats.processes.add(data.process_id);
            break;
          }
          default:
            break;
        }
      } catch (error: any) {
        errCount++;
        console.error(`✖ ${filePath}: ${error.message}`);
      }
    }

    if (bundleStats) {
      for (const processId of bundleStats.processes) {
        const phases = bundleStats.phases.get(processId) ?? [];
        const flows = bundleStats.flows.get(processId) ?? [];

        const issues = validateFivePhaseCycle({
          processId,
          phases,
          flows
        });
        if (issues.length) {
          errCount += issues.length;
          for (const issue of issues) {
            console.error(`✖ bundle[${processId}]: ${issue}`);
          }
        }
      }
    }

    console.log(`\nSummary: ${okCount} ok, ${errCount} errors`);
    process.exit(errCount ? 1 : 0);
  });

program.parseAsync().catch((error) => {
  console.error(error);
  process.exit(1);
});
