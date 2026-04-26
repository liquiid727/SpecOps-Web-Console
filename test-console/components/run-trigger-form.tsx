import React from "react";
import { triggerTestRunAction } from "@/app/actions";
import type { TestPlan } from "@/lib/types";

export function RunTriggerForm({
  plans,
  defaultSpecId,
}: {
  plans: TestPlan[];
  defaultSpecId?: string;
}) {
  return (
    <form action={triggerTestRunAction} className="grid gap-4 rounded-2xl border border-border bg-panel p-5 shadow-lg shadow-black/20 md:grid-cols-4">
      <div className="space-y-2">
        <label htmlFor="specId" className="text-sm font-medium text-slate-100">
          Spec
        </label>
        <select
          id="specId"
          name="specId"
          defaultValue={defaultSpecId ?? plans[0]?.specId}
          className="w-full rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white"
        >
          {plans.map((plan) => (
            <option key={plan.specId} value={plan.specId}>
              {plan.featureName} · {plan.specId}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="specVersion" className="text-sm font-medium text-slate-100">
          Spec Version
        </label>
        <input
          id="specVersion"
          name="specVersion"
          placeholder="latest"
          className="w-full rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="runScope" className="text-sm font-medium text-slate-100">
          Run Scope
        </label>
        <select
          id="runScope"
          name="runScope"
          defaultValue="all"
          className="w-full rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-white"
        >
          <option value="all">API + Scenario</option>
          <option value="api">API only</option>
          <option value="scenario">Scenario only</option>
        </select>
      </div>

      <div className="flex items-end">
        <button
          type="submit"
          className="w-full rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
        >
          手动触发运行
        </button>
      </div>
    </form>
  );
}

