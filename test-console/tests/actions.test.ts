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
    const runRunnerMock = vi.fn().mockResolvedValue(undefined);
    const formData = new FormData();
    formData.set("specId", "reward-order");
    formData.set("specVersion", "1.2.0");
    formData.set("runScope", "scenario");

    await triggerTestRunAction(formData, {
      runRunner: runRunnerMock,
      revalidate: revalidatePathMock,
      goTo: redirectMock,
    });

    expect(runRunnerMock).toHaveBeenCalled();
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
    expect(revalidatePathMock).toHaveBeenCalledWith("/spec/reward-order");
    expect(redirectMock).toHaveBeenCalledWith("/spec/reward-order");
  });
});
