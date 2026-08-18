import React from "react";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { RequirementGateStatus, RequirementStatus } from "@/lib/types";

const statusCopy: Record<RequirementStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: "draft", tone: "neutral" },
  review: { label: "review", tone: "yellow" },
  approved: { label: "approved", tone: "blue" },
  implementing: { label: "implementing", tone: "yellow" },
  done: { label: "done", tone: "green" },
  example: { label: "example", tone: "neutral" }
};

const gateCopy: Record<RequirementGateStatus, { label: string; tone: BadgeTone }> = {
  pass: { label: "pass", tone: "green" },
  warn: { label: "warn", tone: "yellow" },
  block: { label: "blocked", tone: "red" }
};

export function RequirementStatusBadge({ status }: { status: RequirementStatus }) {
  const copy = statusCopy[status];
  return <Badge tone={copy.tone}>{copy.label}</Badge>;
}

export function RequirementGateBadge({ status }: { status: RequirementGateStatus }) {
  const copy = gateCopy[status];
  return <Badge tone={copy.tone}>{copy.label}</Badge>;
}
