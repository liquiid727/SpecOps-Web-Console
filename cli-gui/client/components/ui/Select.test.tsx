import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Select } from "./Select";

describe("Select", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("opens with keyboard semantics and selects an option", () => {
    const onChange = vi.fn();
    act(() => root.render(<Select ariaLabel="Group by" value="project" options={[{ value: "project", label: "Project" }, { value: "time", label: "Time" }]} onChange={onChange} />));
    const trigger = container.querySelector(".custom-select-trigger") as HTMLButtonElement;
    act(() => trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })));
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const option = Array.from(container.querySelectorAll("[role='option']")).find((item) => item.textContent === "Time") as HTMLButtonElement;
    act(() => option.click());
    expect(onChange).toHaveBeenCalledWith("time");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });
});
