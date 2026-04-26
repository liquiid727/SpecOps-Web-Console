import React from "react";
import { triggerTestRunAction } from "@/app/actions";

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
          <option value="all">API + Scenario</option>
          <option value="api">API only</option>
          <option value="scenario">Scenario only</option>
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
