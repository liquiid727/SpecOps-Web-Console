import { getAllTestPlans, getAllTestRuns, getLatestRunsBySpec, getSpecBundle } from "@/lib/data";

describe("file-backed data layer", () => {
  it("loads plans and runs from repository test artifacts", async () => {
    const [plans, runs] = await Promise.all([getAllTestPlans(), getAllTestRuns()]);

    expect(plans.length).toBeGreaterThan(0);
    expect(runs.length).toBeGreaterThan(0);
    expect(plans[0]).toHaveProperty("specId");
    expect(runs[0]).toHaveProperty("runId");
  });

  it("returns latest runs grouped by spec", async () => {
    const latestRuns = await getLatestRunsBySpec();
    const specIds = latestRuns.map((item) => item.specId);
    expect(new Set(specIds).size).toBe(specIds.length);
  });

  it("hydrates spec bundle with plan and latest run", async () => {
    const bundle = await getSpecBundle("reward-order");
    expect(bundle.plan?.featureName).toBe("奖励订单发放");
    expect(bundle.latestRun?.specId).toBe("reward-order");
    expect(bundle.latestRun?.flowResults?.length).toBeGreaterThan(0);
  });
});
