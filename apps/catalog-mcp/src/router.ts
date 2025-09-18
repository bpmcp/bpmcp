import { z } from "zod";
import type pg from "pg";
import type { Env } from "./env.js";
import * as CatalogSearch from "./tools/catalog.search.js";
import * as AtomsList from "./tools/atoms.list.js";
import * as AgentsDescribe from "./tools/agents.describe.js";
import * as ProcessTopology from "./tools/process.topology.js";

const requestSchema = z.object({
  tool: z.string(),
  input: z.unknown().optional()
});

export async function route(body: unknown, env: Env, pool?: pg.Pool) {
  const { tool, input } = requestSchema.parse(body);

  switch (tool) {
    case "catalog.search": {
      const parsed = CatalogSearch.inputSchema.parse(input ?? {});
      const json = await CatalogSearch.handle(parsed, env, pool);
      return { content: [{ type: "json", json }] };
    }
    case "atoms.list": {
      const parsed = AtomsList.inputSchema.parse(input ?? {});
      const json = await AtomsList.handle(parsed, env, pool);
      return { content: [{ type: "json", json }] };
    }
    case "process.topology": {
      const parsed = ProcessTopology.inputSchema.parse(input ?? {});
      const json = await ProcessTopology.handle(parsed, env, pool);
      return { content: [{ type: "json", json }] };
    }
    case "agents.describe": {
      const parsed = AgentsDescribe.inputSchema.parse(input ?? {});
      const json = await AgentsDescribe.handle(parsed, env, pool);
      return { content: [{ type: "json", json }] };
    }
    default:
      throw Object.assign(new Error(`unknown_tool: ${tool}`), { statusCode: 404 });
  }
}
