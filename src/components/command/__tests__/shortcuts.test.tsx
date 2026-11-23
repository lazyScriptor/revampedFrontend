import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { useShortcut, dispatchShortcut, comboFromEvent, formatCombo, __resetShortcutHandlers, SHORTCUT_DEFS } from "../shortcuts";

const key = (init: KeyboardEventInit, target: Element | Window = window) => {
  const e = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
  (target as any).dispatchEvent(e);
  return e;
};

function Harness({ id, fn, enabled = true }: { id: string; fn: () => void; enabled?: boolean }) {
  useShortcut(id, fn, enabled);
  return <input data-testid="box" />;
}

const run = (init: KeyboardEventInit, target?: Element, overrides?: Record<string, string>) => {
  const e = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
  Object.defineProperty(e, "target", { value: target ?? document.body });
  return { fired: dispatchShortcut(e, overrides), prevented: e.defaultPrevented };
};

describe("shortcuts", () => {
  beforeEach(() => __resetShortcutHandlers());

  it("lists the plan's defaults, with F2/F3/F4/F8/F9 registered but pending", () => {
    const byId = Object.fromEntries(SHORTCUT_DEFS.map((d) => [d.id, d]));
    expect(byId["stock-in"].defaultCombo).toBe("F2");
    expect(byId["find-item"].defaultCombo).toBe("F3");
    expect(byId["correct-stock"].defaultCombo).toBe("F4");
    expect(byId["walk-in"].defaultCombo).toBe("F8");
    expect(byId["sell-print"].defaultCombo).toBe("F9");
    expect(["stock-in", "find-item", "correct-stock", "sell-print"].every((id) => byId[id].pending)).toBe(true);
  });

  it("normalises key events and formats combos", () => {
    expect(comboFromEvent({ key: "k", ctrlKey: true, metaKey: false, shiftKey: false, altKey: false })).toBe("Mod+K");
    expect(comboFromEvent({ key: "K", ctrlKey: false, metaKey: true, shiftKey: true, altKey: false })).toBe("Mod+Shift+K");
    expect(comboFromEvent({ key: "F2", ctrlKey: false, metaKey: false, shiftKey: false, altKey: false })).toBe("F2");
    expect(comboFromEvent({ key: "+", ctrlKey: false, metaKey: false, shiftKey: true, altKey: false })).toBe("Plus");
    expect(comboFromEvent({ key: "Shift", ctrlKey: false, metaKey: false, shiftKey: true, altKey: false })).toBeNull();
    expect(formatCombo("Mod+K", false)).toBe("Ctrl K");
    expect(formatCombo("Mod+K", true)).toBe("⌘ K");
  });

  it("runs the handler of a registered shortcut and cancels the browser action", () => {
    const fn = vi.fn();
    render(<Harness id="stock-in" fn={fn} />);
    expect(run({ key: "F2" })).toEqual({ fired: true, prevented: true });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does nothing, and leaves the browser key alone, when no handler is registered", () => {
    expect(run({ key: "F3" })).toEqual({ fired: false, prevented: false });
  });

  it("never fires while typing in a field, except actions allowed to", () => {
    const f2 = vi.fn();
    const k = vi.fn();
    render(
      <>
        <Harness id="stock-in" fn={f2} />
        <Harness id="command-bar" fn={k} />
      </>,
    );
    const input = document.querySelector("input")!;
    expect(run({ key: "F2" }, input).fired).toBe(false);
    expect(f2).not.toHaveBeenCalled();
    expect(run({ key: "k", ctrlKey: true }, input).fired).toBe(true);
    expect(k).toHaveBeenCalledTimes(1);
  });

  it("uses a user's remapped key instead of the default", () => {
    const fn = vi.fn();
    render(<Harness id="stock-in" fn={fn} />);
    expect(run({ key: "F2" }, undefined, { "stock-in": "F6" }).fired).toBe(false);
    expect(run({ key: "F6" }, undefined, { "stock-in": "F6" }).fired).toBe(true);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("stops handling once the component unmounts, or when disabled", () => {
    const fn = vi.fn();
    const { unmount } = render(<Harness id="stock-in" fn={fn} />);
    unmount();
    expect(run({ key: "F2" }).fired).toBe(false);
    render(<Harness id="walk-in" fn={fn} enabled={false} />);
    expect(run({ key: "F8" }).fired).toBe(false);
  });

  it("the newest registration wins", () => {
    const a = vi.fn();
    const b = vi.fn();
    render(
      <>
        <Harness id="walk-in" fn={a} />
        <Harness id="walk-in" fn={b} />
      </>,
    );
    run({ key: "F8" });
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
  });

  it("a real window keydown reaches the host listener path", () => {
    // sanity: keydown on window with no handlers is a no-op and does not throw
    const e = key({ key: "F9" });
    expect(e.defaultPrevented).toBe(false);
    fireEvent.keyDown(document.body, { key: "F9" });
  });
});
