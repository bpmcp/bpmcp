import { describe, expect, it } from "vitest";
import { route } from "../apps/policy-mcp/src/router.js";
import type { Env } from "../apps/policy-mcp/src/env.js";

const env: Env = {
  PORT: 4005,
  MODE: "memory",
  ARFITI_API_KEY_SINGLE: "test",
  DATABASE_URL: undefined
};

describe("policy-mcp memory mode", () => {
  it("computes per diem totals", async () => {
    const res = await route({
      tool: "policy.per_diem_amount",
      input: {
        destination: "Germany",
        start_date: "2025-10-02",
        end_date: "2025-10-04"
      }
    }, env);

    const payload = res.content?.[0]?.json as any;
    expect(payload.amount_total).toBeGreaterThan(0);
    expect(payload.days).toBe(3);
  });

  it("computes mileage amount", async () => {
    const res = await route({
      tool: "policy.mileage_amount",
      input: { km: 120, vehicle: "car" }
    }, env);

    const payload = res.content?.[0]?.json as any;
    expect(payload.amount_total).toBeGreaterThan(0);
    expect(payload.per_km).toBeGreaterThan(0);
  });
});
