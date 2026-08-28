import { cookies } from "next/headers";
import React from "react";

import { TestUiDemoPanel } from "@/components/about/test-ui-demo-panel";
import { AgentWorkflowPanel } from "@/components/home/agent-workflow-panel";
import { getLocaleCopy, LOCALE_STORAGE_KEY, normalizeLocale } from "@/lib/locale";

export default async function AboutPage() {
  const locale = normalizeLocale((await cookies()).get(LOCALE_STORAGE_KEY)?.value);
  const copy = getLocaleCopy(locale).about;

  return (
    <div className="space-y-6 md:space-y-8">
      <AgentWorkflowPanel copy={copy.agentFlow} />
      <TestUiDemoPanel copy={copy.testUiDemo} />
    </div>
  );
}
