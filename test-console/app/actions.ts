"use server";

import { execFile } from "node:child_process";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAllTestPlans } from "@/lib/data";

function normalizeRunScope(rawValue: string): "api" | "scenario" | "all" {
  if (rawValue === "api" || rawValue === "scenario") {
    return rawValue;
  }

  return "all";
}

async function runTestRunner(args: string[], cwd: string) {
  await new Promise<void>((resolve, reject) => {
    execFile("node", args, { cwd }, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

type TriggerDeps = {
  runRunner?: (args: string[], cwd: string) => Promise<void>;
  revalidate?: (path: string) => void;
  goTo?: (path: string) => never | void;
};

export async function triggerTestRunAction(formData: FormData, deps?: TriggerDeps) {
  const specId = String(formData.get("specId") ?? "").trim();
  const rawVersion = String(formData.get("specVersion") ?? "latest").trim();
  const runScope = normalizeRunScope(String(formData.get("runScope") ?? "all"));

  const plans = await getAllTestPlans();
  const plan = plans.find((item) => item.specId === specId);

  if (!plan) {
    throw new Error(`Unknown specId: ${specId}`);
  }

  const specVersion = rawVersion || plan.specVersion || "latest";
  const repoRoot = path.resolve(process.cwd(), "..");
  const runnerPath = path.join(repoRoot, "scripts", "orchestration", "test-runner.mjs");

  await (deps?.runRunner ?? runTestRunner)(
    [runnerPath, specId, specVersion, runScope],
    repoRoot,
  );

  (deps?.revalidate ?? revalidatePath)("/");
  (deps?.revalidate ?? revalidatePath)(`/spec/${specId}`);
  return (deps?.goTo ?? redirect)(`/spec/${specId}`);
}
