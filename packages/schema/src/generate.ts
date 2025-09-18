import fsExtra from "fs-extra";
import { zodToJsonSchema } from "zod-to-json-schema";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AgentManifest, Atom, AtomLink, Binding, Flow, Phase, Process } from "./models.js";

async function main(): Promise<void> {
  const outDir = resolve(dirname(fileURLToPath(import.meta.url)), "../dist/schemas");
  await fsExtra.ensureDir(outDir);

  const entries = [
    ["process.json", Process],
    ["phase.json", Phase],
    ["flow.json", Flow],
    ["atom.json", Atom],
    ["atom_link.json", AtomLink],
    ["binding.json", Binding],
    ["agent_manifest.json", AgentManifest]
  ] as const;

  for (const [filename, schema] of entries) {
    const json = zodToJsonSchema(schema, {
      target: "jsonSchema7",
      name: filename.replace(".json", "")
    });
    await fsExtra.writeJSON(resolve(outDir, filename), json, { spaces: 2 });
    // eslint-disable-next-line no-console
    console.log("✔ schema emitted:", filename);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
