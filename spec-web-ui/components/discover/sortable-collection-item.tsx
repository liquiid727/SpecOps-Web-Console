"use client";

import { useRef, useState } from "react";

import { moveDiscoverCollectionItemAction } from "@/app/actions";
import {
  getCollectionDragFeedback,
  getCollectionDropPlacement,
  getDragAutoScrollDelta
} from "@/features/catalog/dnd";

const dragType = "application/spec-web-ui-collection-item";
const scopeLabels = {
  compareSets: "saved compare sets",
  favorites: "favorites",
  presets: "preset bundles"
} as const;

export function SortableCollectionItem({
  scope,
  itemId,
  nextItemId,
  dragLabel,
  undoBeforeId,
  redirectTo,
  compact = false,
  children
}: {
  scope: "favorites" | "compareSets" | "presets";
  itemId: string;
  nextItemId?: string;
  dragLabel: string;
  undoBeforeId?: string;
  redirectTo: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const beforeIdRef = useRef<HTMLInputElement>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const [dropPlacement, setDropPlacement] = useState<"before" | "after" | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);

  const clearDragState = () => {
    setDropPlacement(null);
    setIsRestricted(false);
  };

  return (
    <div className={`transition-all duration-200 ease-out ${isDragging ? "opacity-70" : ""}`}>
      {dropPlacement === "before" ? (
        <div className="mb-3 rounded-xl border border-dashed border-accent/50 bg-accent/10 px-4 py-3 text-sm font-medium text-accent-strong transition-all duration-200 ease-out">
          drop here to place before this item
        </div>
      ) : null}
      {isRestricted ? (
        <div className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-300 transition-all duration-200 ease-out">
          reordering stays inside {scopeLabels[scope]}
        </div>
      ) : null}
      <div
        onDragOver={(event) => {
          const payload = event.dataTransfer.getData(dragType);

          if (!payload) {
            return;
          }

          const [dragScope, dragItemId] = payload.split("::");
          const feedback = getCollectionDragFeedback(
            { scope: dragScope, itemId: dragItemId },
            { scope, itemId }
          );

          if (feedback === "restricted") {
            setIsRestricted(true);
            setDropPlacement(null);
            return;
          }

          if (feedback === "ignore") {
            clearDragState();
            return;
          }

          event.preventDefault();
          setIsRestricted(false);
          const delta = getDragAutoScrollDelta(event.clientY, {
            top: 0,
            height: window.innerHeight
          });

          if (delta !== 0) {
            window.scrollBy({
              top: delta,
              behavior: "auto"
            });
          }

          setDropPlacement(
            getCollectionDropPlacement(event.clientY, {
              top: event.currentTarget.getBoundingClientRect().top,
              height: event.currentTarget.getBoundingClientRect().height
            })
          );
        }}
        onDragLeave={clearDragState}
        onDrop={(event) => {
          const payload = event.dataTransfer.getData(dragType);

          if (!payload) {
            return;
          }

          const [dragScope, dragItemId] = payload.split("::");
          const feedback = getCollectionDragFeedback(
            { scope: dragScope, itemId: dragItemId },
            { scope, itemId }
          );

          if (feedback !== "allowed") {
            clearDragState();
            return;
          }

          event.preventDefault();
          const resolvedPlacement =
            dropPlacement ??
            getCollectionDropPlacement(event.clientY, {
              top: event.currentTarget.getBoundingClientRect().top,
              height: event.currentTarget.getBoundingClientRect().height
            });
          clearDragState();

          if (beforeIdRef.current) {
            beforeIdRef.current.value = resolvedPlacement === "after" ? nextItemId ?? "" : itemId;
          }

          if (formRef.current) {
            const itemInput = formRef.current.elements.namedItem("itemId");

            if (itemInput instanceof HTMLInputElement) {
              itemInput.value = dragItemId;
            }

            formRef.current.requestSubmit();
          }
        }}
        className={`transition-all duration-200 ease-out ${
          dropPlacement
            ? "rounded-2xl ring-1 ring-accent/60 ring-offset-2 ring-offset-transparent"
            : ""
        }`}
      >
        <div
          draggable
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData(dragType, `${scope}::${itemId}`);
            const ghost = document.createElement("div");
            ghost.className =
              "rounded-xl border border-line bg-panel px-4 py-3 text-sm font-medium text-ink shadow-panel";
            ghost.textContent = `moving ${dragLabel}`;
            ghost.style.position = "absolute";
            ghost.style.top = "-9999px";
            ghost.style.left = "-9999px";
            document.body.appendChild(ghost);
            ghostRef.current = ghost;
            event.dataTransfer.setDragImage(ghost, 24, 24);
            setIsDragging(true);
          }}
          onDragEnd={() => {
            setIsDragging(false);
            clearDragState();
            ghostRef.current?.remove();
            ghostRef.current = null;
          }}
          className={`inline-flex cursor-grab rounded-md border border-line bg-canvas font-mono font-medium uppercase tracking-[0.12em] text-slate-400 active:cursor-grabbing ${
            compact ? "mb-1.5 px-2 py-0.5 text-[10px]" : "mb-2 px-3 py-1 text-[11px]"
          }`}
        >
          {compact ? "drag" : "drag to reorder"}
        </div>
        {children}
        <form ref={formRef} action={moveDiscoverCollectionItemAction} className="hidden">
          <input type="hidden" name="scope" value={scope} />
          <input type="hidden" name="itemId" value={itemId} />
          <input ref={beforeIdRef} type="hidden" name="beforeId" value={itemId} />
          <input type="hidden" name="undoBeforeId" value={undoBeforeId ?? ""} />
          <input type="hidden" name="itemLabel" value={dragLabel} />
          <input type="hidden" name="redirectTo" value={redirectTo} />
        </form>
      </div>
      {dropPlacement === "after" ? (
        <div className="mt-3 rounded-xl border border-dashed border-accent/50 bg-accent/10 px-4 py-3 text-sm font-medium text-accent-strong transition-all duration-200 ease-out">
          drop here to place after this item
        </div>
      ) : null}
    </div>
  );
}
