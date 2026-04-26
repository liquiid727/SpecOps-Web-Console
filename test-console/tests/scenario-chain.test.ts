import { buildScenarioChains } from "@/lib/data";
import { getSpecBundle } from "@/lib/data";

describe("scenario chain builder", () => {
  it("builds scenario chains from plan steps and run items", async () => {
    const { plan, latestRun } = await getSpecBundle("reward-order");
    expect(plan).toBeDefined();
    expect(latestRun).toBeDefined();

    const chains = buildScenarioChains(plan, latestRun!);
    expect(chains.length).toBe(2);
    expect(chains[0].steps.length).toBeGreaterThan(0);
    expect(chains.some((item) => item.overallStatus === "fail")).toBe(true);
  });
});
