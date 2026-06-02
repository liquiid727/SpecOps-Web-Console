import { triggerTestRunAction } from "@/app/actions";

const redirectMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (value: string) => redirectMock(value),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (value: string) => revalidatePathMock(value),
}));

describe("triggerTestRunAction", () => {
  beforeEach(() => {
    redirectMock.mockReset();
    revalidatePathMock.mockReset();
  });

  it("runs the orchestration script and redirects to the spec page", async () => {
    const runRunnerMock = vi.fn().mockResolvedValue({ exitCode: 0, stdout: "ok", stderr: "" });
    const writeSessionMock = vi.fn().mockResolvedValue(undefined);
    const formData = new FormData();
    formData.set("specId", "reward-order");
    formData.set("specVersion", "1.2.0");
    formData.set("runScope", "scenario");

    await triggerTestRunAction(formData, {
      runRunner: runRunnerMock,
      writeSession: writeSessionMock,
      revalidate: revalidatePathMock,
      goTo: redirectMock,
      now: () => new Date("2026-05-30T00:00:00.000Z"),
    });

    expect(runRunnerMock).toHaveBeenCalledWith(
      "node",
      expect.arrayContaining(["reward-order", "1.2.0", "scenario"]),
      expect.any(String),
    );
    expect(writeSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        specId: "reward-order",
        scope: "scenario",
        status: "pass",
      }),
      expect.any(String),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
    expect(revalidatePathMock).toHaveBeenCalledWith("/spec/reward-order");
    expect(redirectMock).toHaveBeenCalledWith("/spec/reward-order");
  });

  it("runs all developer test scopes in fixed order and records a session", async () => {
    const runRunnerMock = vi.fn().mockResolvedValue({ exitCode: 0, stdout: "ok", stderr: "" });
    const writeSessionMock = vi.fn().mockResolvedValue(undefined);
    const formData = new FormData();
    formData.set("specId", "reward-order");
    formData.set("specVersion", "1.2.0");
    formData.set("runScope", "all");

    await triggerTestRunAction(formData, {
      runRunner: runRunnerMock,
      writeSession: writeSessionMock,
      revalidate: revalidatePathMock,
      goTo: redirectMock,
      now: () => new Date("2026-05-30T00:00:00.000Z"),
    });

    expect(runRunnerMock.mock.calls.map((call) => call[1].at(-1))).toEqual([
      "test",
      "api",
      "scenario",
      "performance",
      "concurrency",
      "reward-order-ready",
    ]);
    expect(writeSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: "all",
        status: "pass",
        commands: expect.arrayContaining([
          expect.objectContaining({ scope: "unit", exitCode: 0 }),
          expect.objectContaining({ scope: "gate", exitCode: 0 }),
        ]),
      }),
      expect.any(String),
    );
  });

  it("keeps writing a blocked session when a scoped command fails", async () => {
    const runRunnerMock = vi
      .fn()
      .mockResolvedValueOnce({ exitCode: 1, stdout: "", stderr: "p95 exceeded" });
    const writeSessionMock = vi.fn().mockResolvedValue(undefined);
    const formData = new FormData();
    formData.set("specId", "reward-order");
    formData.set("specVersion", "1.2.0");
    formData.set("runScope", "performance");

    await triggerTestRunAction(formData, {
      runRunner: runRunnerMock,
      writeSession: writeSessionMock,
      revalidate: revalidatePathMock,
      goTo: redirectMock,
      now: () => new Date("2026-05-30T00:00:00.000Z"),
    });

    expect(writeSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: "performance",
        status: "blocked",
        stderrSummary: "p95 exceeded",
      }),
      expect.any(String),
    );
    expect(redirectMock).toHaveBeenCalledWith("/spec/reward-order");
  });
});
