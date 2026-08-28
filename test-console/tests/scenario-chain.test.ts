import { buildScenarioChains } from "@/lib/data";
import { getAllTestPlans, getAllTestRuns } from "@/lib/data";

describe("scenario chain builder", () => {
  it("builds scenario chains from plan steps and run items", async () => {
    const [plans, runs] = await Promise.all([getAllTestPlans(), getAllTestRuns()]);
    const plan = plans.find((item) => item.specId === "R002-goalspec-console/S01-evidence-console");
    const failedRun = runs.find((item) => item.specId === "R002-goalspec-console/S01-evidence-console" && item.flowResults?.length);
    expect(plan).toBeDefined();
    expect(failedRun).toBeDefined();

    const chains = buildScenarioChains(plan, failedRun!);
    expect(chains.length).toBe(1);
    expect(chains[0].steps.length).toBeGreaterThan(0);
    expect(chains.some((item) => item.overallStatus === "pass")).toBe(true);
  });
});
