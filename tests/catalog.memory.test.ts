import { describe, expect, it } from "vitest";
import { route } from "../apps/catalog-mcp/src/router.js";
import type { Env } from "../apps/catalog-mcp/src/env.js";

const env: Env = {
  PORT: 4000,
  MODE: "memory",
  ARFITI_API_KEY_SINGLE: "test",
  DATABASE_URL: undefined
};

describe("catalog-mcp memory mode", () => {
  it("returns expected topology", async () => {
    const res = await route({
      tool: "process.topology",
      input: { process_id: "p2p/per-diem" }
    }, env);

    const payload = res.content?.[0]?.json as any;
    expect(payload.phases).toHaveLength(5);
    expect(payload.cycle).toEqual(["capture", "enrich", "approval", "posting", "payment"]);
  });

  it("lists atoms for capture phase", async () => {
    const res = await route({
      tool: "atoms.list",
      input: {
        process_id: "p2p/per-diem",
        phase_id: "capture",
        provider: "payhawk",
        jurisdiction: "EE"
      }
    }, env);

    const payload = res.content?.[0]?.json as any;
    expect(payload.atoms).toHaveLength(1);
    expect(payload.atoms[0].steps[0].text).toContain("Open app");
  });

  it("searches across catalog", async () => {
    const res = await route({
      tool: "catalog.search",
      input: { q: "per-diem" }
    }, env);

    const payload = res.content?.[0]?.json as any;
    const processHit = payload.results.find((item: any) => item.kind === "process");
    expect(processHit).toBeDefined();
  });
});
