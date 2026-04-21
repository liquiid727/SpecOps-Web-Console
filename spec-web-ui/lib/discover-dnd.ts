export function getCollectionDropPlacement(
  pointerY: number,
  rect: { top: number; height: number }
) {
  return pointerY < rect.top + rect.height / 2 ? "before" : "after";
}

export function getDragAutoScrollDelta(
  pointerY: number,
  viewport: { top: number; height: number },
  options?: { edgeThreshold?: number; maxStep?: number }
) {
  const edgeThreshold = options?.edgeThreshold ?? 96;
  const maxStep = options?.maxStep ?? 28;
  const distanceFromTop = pointerY - viewport.top;
  const distanceFromBottom = viewport.top + viewport.height - pointerY;

  if (distanceFromTop < edgeThreshold) {
    const ratio = 1 - Math.max(distanceFromTop, 0) / edgeThreshold;
    return -Math.ceil(ratio * maxStep);
  }

  if (distanceFromBottom < edgeThreshold) {
    const ratio = 1 - Math.max(distanceFromBottom, 0) / edgeThreshold;
    return Math.ceil(ratio * maxStep);
  }

  return 0;
}

export function getCollectionDragFeedback(
  dragPayload: { scope: string; itemId: string } | null,
  dropTarget: { scope: string; itemId: string }
) {
  if (!dragPayload) {
    return "ignore" as const;
  }

  if (dragPayload.scope !== dropTarget.scope) {
    return "restricted" as const;
  }

  if (dragPayload.itemId === dropTarget.itemId) {
    return "ignore" as const;
  }

  return "allowed" as const;
}
