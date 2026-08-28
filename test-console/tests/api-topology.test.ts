import { buildApiTopologyTree, buildBusinessFlowMapFromPlan, buildScenarioChains, getSpecBundle } from "@/lib/data";

describe("api topology tree", () => {
  it("builds stage -> scenario -> endpoint tree", async () => {
    const { plan, latestRun } = await getSpecBundle("R002-goalspec-console/S01-evidence-console");
    const chains = buildScenarioChains(plan, latestRun!);
    const businessFlow = buildBusinessFlowMapFromPlan(plan, chains, latestRun!);
    const topology = buildApiTopologyTree(plan, latestRun!, businessFlow);

    expect(topology).toBeDefined();
    expect(topology?.stages.length).toBeGreaterThan(0);
    expect(topology?.stages[0].scenarios.length).toBeGreaterThan(0);
    expect(topology?.stages[0].scenarios[0].endpoints.length).toBeGreaterThan(0);
  });
});
