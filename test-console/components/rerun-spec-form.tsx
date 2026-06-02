import React from "react";
import { triggerTestRunAction } from "@/app/actions";

const runScopeOptions = [
  ["all", "All scopes"],
  ["unit", "Unit"],
  ["api", "API"],
  ["scenario", "Scenario / E2E"],
  ["performance", "Performance"],
  ["concurrency", "Concurrency"],
  ["gate", "Gate"],
] as const;

export function RerunSpecForm({
  specId,
  specVersion,
}: {
  specId: string;
  specVersion: string;
}) {
  return (
    <form action={triggerTestRunAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="specId" value={specId} />
      <input type="hidden" name="specVersion" value={specVersion} />
      <div className="space-y-2">
        <label htmlFor="rerunScope" className="text-sm font-medium text-slate-100">
          重新运行范围
        </label>
        <select
          id="rerunScope"
          name="runScope"
          defaultValue="all"
          className="rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white"
        >
          {runScopeOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
      >
        重新运行当前 Spec
      </button>
    </form>
  );
}
