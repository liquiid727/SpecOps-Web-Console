import { buildBusinessFlowMapFromPlan, buildScenarioChains, getSpecBundle } from "@/lib/data";

describe("business flow map", () => {
  it("prefers explicit flow stages from the plan", async () => {
    const { plan, latestRun } = await getSpecBundle("reward-order");
    const chains = buildScenarioChains(plan, latestRun!);
    const flow = buildBusinessFlowMapFromPlan(plan, chains, latestRun!);

    expect(flow).toBeDefined();
    expect(flow?.stages.length).toBeGreaterThan(0);
    expect(flow?.name).toBe("奖励领取业务流");
    expect(flow?.stages.some((stage) => stage.name === "提交请求")).toBe(true);
  });
});
