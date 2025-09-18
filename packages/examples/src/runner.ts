#!/usr/bin/env node
import { Command } from "commander";
import { CatalogClient } from "@bpmcp/mcp-client";

const program = new Command();
program
  .name("bpmcp-runner")
  .description("Walk a BPMCP process and print atoms per phase")
  .requiredOption("-u, --url <url>", "Catalog MCP base URL", process.env.CATALOG_MCP_HTTP || "http://localhost:4000")
  .requiredOption("-k, --key <key>", "API key", process.env.ARFITI_API_KEY || "arf_live_dev")
  .requiredOption("-p, --process <id>", "Process identifier (e.g., p2p/per-diem)")
  .requiredOption("--provider <provider>", "Provider slug (e.g., payhawk)")
  .requiredOption("--jurisdiction <code>", "Jurisdiction code (e.g., EE)")
  .parse(process.argv);

const opts = program.opts<{
  url: string;
  key: string;
  process: string;
  provider: string;
  jurisdiction: string;
}>();

async function main() {
  const client = new CatalogClient({ baseUrl: opts.url, apiKey: opts.key });
  const topology = await client.getTopology(opts.process);
  console.log(`Process: ${opts.process}`);
  console.log(`Phases: ${topology.phases.map((p) => `${p.seq}:${p.id}`).join(" → ")}`);
  console.log("");

  for (const phase of topology.phases.sort((a, b) => a.seq - b.seq)) {
    const { atoms } = await client.listAtoms({
      process_id: opts.process,
      phase_id: phase.id,
      provider: opts.provider,
      jurisdiction: opts.jurisdiction
    });
    if (!atoms.length) continue;
    console.log(`# Phase: ${phase.title} (${phase.id})`);
    for (const atom of atoms) {
      console.log(`- Atom: ${atom.title} (${atom.id})`);
      atom.steps.forEach((step, idx) => {
        const tools = step.mcp_tools?.length ? ` [tools: ${step.mcp_tools.join(", ")}]` : "";
        console.log(`  ${idx + 1}. ${step.text}${tools}`);
      });
      console.log("");
    }
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
