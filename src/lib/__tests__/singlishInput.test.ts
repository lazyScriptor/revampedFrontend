import { beforeAll, describe, expect, it } from "vitest";
import { installSinhalaTyping, setSinhalaTyping } from "../singlishInput";

// jsdom fires beforeinput but doesn't apply default typing, so emulate it when not cancelled.
const type = (el: HTMLInputElement, text: string) => {
  for (const ch of text) {
    const ev = new InputEvent("beforeinput", { inputType: "insertText", data: ch, bubbles: true, cancelable: true });
    el.dispatchEvent(ev);
    if (!ev.defaultPrevented) {
      let s = el.value.length;
      try { s = el.selectionStart ?? s; } catch { /* ignore */ }
      el.value = el.value.slice(0, s) + ch + el.value.slice(s);
      try { el.setSelectionRange(s + 1, s + 1); } catch { /* email inputs have no selection in jsdom */ }
    }
  }
};
const backspace = (el: HTMLInputElement) => {
  const ev = new InputEvent("beforeinput", { inputType: "deleteContentBackward", bubbles: true, cancelable: true });
  el.dispatchEvent(ev);
};
const field = (attrs: Record<string, string> = {}) => {
  const el = document.createElement("input");
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  document.body.appendChild(el);
  el.focus();
  return el;
};

describe("live Sinhala typing", () => {
  beforeAll(() => {
    installSinhalaTyping();
    setSinhalaTyping(true);
  });

  it("transliterates as you type, word by word", () => {
    const el = field({ name: "first_name" });
    type(el, "mama gedara");
    expect(el.value).toBe("මම ගෙදර");
  });

  it("backspace removes one Latin letter of the current word", () => {
    const el = field({ name: "notes" });
    type(el, "kamal");
    backspace(el);
    expect(el.value).toBe("කම");
  });

  it("leaves phone / NIC / email / opted-out fields alone", () => {
    for (const attrs of <Record<string, string>[]>[{ name: "phone_number" }, { name: "nic_number" }, { type: "email", name: "x" }, { name: "x", "data-no-sinhala": "" }]) {
      const el = field(attrs);
      type(el, "abc");
      expect(el.value).toBe("abc");
    }
  });

  it("does nothing when switched off", () => {
    setSinhalaTyping(false);
    const el = field({ name: "notes" });
    type(el, "mama");
    expect(el.value).toBe("mama");
    setSinhalaTyping(true);
  });
});
