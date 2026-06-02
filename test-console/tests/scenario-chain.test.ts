import { buildScenarioChains } from "@/lib/data";
import { getAllTestPlans, getAllTestRuns } from "@/lib/data";

describe("scenario chain builder", () => {
  it("builds scenario chains from plan steps and run items", async () => {
    const [plans, runs] = await Promise.all([getAllTestPlans(), getAllTestRuns()]);
    const plan = plans.find((item) => item.specId === "reward-order");
    const failedRun = runs.find((item) =>
      item.specId === "reward-order" &&
      item.releaseDecision === "blocked" &&
      item.flowResults?.some((flow) =>
        flow.stages.some((stage) => stage.scenarios.some((scenario) => scenario.status === "fail")),
      ),
    );
    expect(plan).toBeDefined();
    expect(failedRun).toBeDefined();

    const chains = buildScenarioChains(plan, failedRun!);
    expect(chains.length).toBe(2);
    expect(chains[0].steps.length).toBeGreaterThan(0);
    expect(chains.some((item) => item.overallStatus === "fail")).toBe(true);
  });
});
