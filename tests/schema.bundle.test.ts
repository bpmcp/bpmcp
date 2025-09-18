import { describe, expect, it } from "vitest";
import { validateFivePhaseCycle } from "../packages/schema/src/bundle-rule.js";

const phases = [
  { id: "capture", seq: 1, title: "Capture", process_id: "p2p/per-diem" },
  { id: "enrich", seq: 2, title: "Enrich", process_id: "p2p/per-diem" },
  { id: "approval", seq: 3, title: "Approval", process_id: "p2p/per-diem" },
  { id: "posting", seq: 4, title: "Posting", process_id: "p2p/per-diem" },
  { id: "payment", seq: 5, title: "Payment", process_id: "p2p/per-diem" }
];

const flows = [
  { id: "f1", process_id: "p2p/per-diem", from_phase_id: "capture", to_phase_id: "enrich" },
  { id: "f2", process_id: "p2p/per-diem", from_phase_id: "enrich", to_phase_id: "approval" },
  { id: "f3", process_id: "p2p/per-diem", from_phase_id: "approval", to_phase_id: "posting" },
  { id: "f4", process_id: "p2p/per-diem", from_phase_id: "posting", to_phase_id: "payment" },
  { id: "f5", process_id: "p2p/per-diem", from_phase_id: "payment", to_phase_id: "capture" }
];

describe("validateFivePhaseCycle", () => {
  it("accepts valid five-phase cycle", () => {
    const issues = validateFivePhaseCycle({ processId: "p2p/per-diem", phases, flows });
    expect(issues).toHaveLength(0);
  });

  it("rejects bundles without five phases", () => {
    const fewerPhases = phases.slice(0, 4);
    const issues = validateFivePhaseCycle({ processId: "p2p/per-diem", phases: fewerPhases, flows });
    expect(issues).toContain("expected 5 phases, found 4");
  });

  it("rejects flows that break cycle", () => {
    const badFlows = flows.map((flow) =>
      flow.id === "f5"
        ? { ...flow, to_phase_id: "approval" }
        : flow
    );
    const issues = validateFivePhaseCycle({ processId: "p2p/per-diem", phases, flows: badFlows });
    expect(issues.length).toBeGreaterThan(0);
  });
});
