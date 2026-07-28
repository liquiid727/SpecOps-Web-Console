import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AsyncState, DialogActions, ResourceRow, SectionHeader, SettingsSection, ViewHeader } from "../patterns";
import { Badge, Button, Card, EmptyState, IconButton, Menu, Tabs, TextArea, TextField } from ".";

describe("CLI GUI component library", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => { container = document.createElement("div"); document.body.append(container); root = createRoot(container); });
  afterEach(() => { act(() => root.unmount()); container.remove(); });

  it("forwards native button, field and semantic state contracts", () => {
    const onClick = vi.fn();
    act(() => root.render(<>
      <Button variant="primary" loading loadingLabel="Saving" onClick={onClick}>Save</Button>
      <IconButton icon="settings" label="Settings" />
      <TextField label="Name" defaultValue="SpecOS" />
      <TextArea label="Notes" defaultValue="Ready" />
      <Badge>Active</Badge><Card>Card</Card><EmptyState icon="info" title="Empty" description="No data" />
    </>));
    expect(container.querySelector("button")?.getAttribute("aria-busy")).toBe("true");
    expect(container.querySelector("button")?.textContent).toBe("Saving");
    expect(container.querySelector("input")?.value).toBe("SpecOS");
    expect(container.querySelector("textarea")?.value).toBe("Ready");
    expect(container.querySelector("[aria-label='Settings']")).not.toBeNull();
  });

  it("supports transparent compatibility markup", () => {
    act(() => root.render(<><Button unstyled className="legacy-control">Legacy</Button><TextField unstyled className="legacy-field" aria-label="Legacy field" /><TextArea unstyled className="legacy-area" aria-label="Legacy area" /></>));
    const button = container.querySelector("button")!;
    expect(button.className).toBe("legacy-control");
    expect(button.classList.contains("ui-button")).toBe(false);
    expect(container.querySelector("input")?.className).toBe("legacy-field");
    expect(container.querySelector("textarea")?.className).toBe("legacy-area");
  });

  it("provides keyboard tabs with a roving tab stop", () => {
    const onChange = vi.fn();
    act(() => root.render(<Tabs ariaLabel="Views" value="one" onChange={onChange} items={[{ id: "one", label: "One" }, { id: "two", label: "Two" }]} />));
    const list = container.querySelector("[role='tablist']")!;
    act(() => list.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })));
    expect(onChange).toHaveBeenCalledWith("two");
    expect(container.querySelectorAll("[role='tab']")[0].getAttribute("tabindex")).toBe("0");
    act(() => list.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true })));
    expect(onChange).toHaveBeenLastCalledWith("two");
  });

  it("provides an accessible menu and pattern vocabulary", async () => {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    const triggerRef = { current: trigger };
    const close = vi.fn();
    act(() => root.render(<>
      <Menu ariaLabel="Actions" triggerRef={triggerRef} onClose={close} items={[{ id: "rename", label: "Rename", onSelect: vi.fn() }, { id: "delete", label: "Delete", danger: true, onSelect: vi.fn() }]} />
      <ViewHeader title="View" /><SectionHeader title="Section" /><AsyncState message="Loading" kind="loading" />
      <ResourceRow primary="Resource" secondary="Details" /><SettingsSection title="Settings" description="Description" /><DialogActions><span>Action</span></DialogActions>
    </>));
    await act(async () => undefined);
    const menu = container.querySelector("[role='menu']")!;
    expect(document.activeElement).toBe(menu.querySelector("[role='menuitem']"));
    act(() => menu.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(close).toHaveBeenCalled();
    trigger.remove();
  });
});
