import { singlishToSinhala } from "./singlish";

/**
 * Live Sinhala typing for every eligible text field in the app. While enabled, Latin letters typed
 * into a field are transliterated (phonetic "Singlish") as the user types. Numbers, phone, NIC,
 * email, passwords, serials, codes and anything marked `data-no-sinhala` are left alone.
 */
const STORAGE_KEY = "geargrid-sinhala-typing";
const EVENT = "geargrid:sinhala-typing";
const SKIP_NAME = /(nic|phone|mobile|e?mail|user(name)?|pass(word)?|serial|sku|code|url|invoice|amount|qty|quantity|price|rate|number|barcode|date|search_id)/i;
const SKIP_AUTOCOMPLETE = /^(email|username|current-password|new-password|tel|one-time-code|url)$/;

type Field = HTMLInputElement | HTMLTextAreaElement;
type Buf = { raw: string; start: number; len: number };

const buffers = new WeakMap<Field, Buf>();
let enabled = false;
let installed = false;

const readStored = () => {
  try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
};

export const isSinhalaTypingEnabled = () => enabled;

export const setSinhalaTyping = (on: boolean) => {
  enabled = on;
  try { localStorage.setItem(STORAGE_KEY, on ? "1" : "0"); } catch { /* ignore */ }
  window.dispatchEvent(new Event(EVENT));
};

export const subscribeSinhalaTyping = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
};

const eligible = (el: EventTarget | null): el is Field => {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return false;
  if (el.readOnly || el.disabled || el.dataset.noSinhala !== undefined) return false;
  if (el instanceof HTMLInputElement && !["text", "search", ""].includes(el.type)) return false;
  if (["numeric", "decimal", "tel", "email", "url"].includes(el.inputMode)) return false;
  if (SKIP_AUTOCOMPLETE.test(el.autocomplete)) return false;
  if (SKIP_NAME.test(`${el.name} ${el.dataset.field ?? ""}`)) return false;
  return true;
};

const setValue = (el: Field, value: string) => {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
};

const rewrite = (el: Field, b: Buf, base: string) => {
  const out = b.raw ? singlishToSinhala(b.raw) : "";
  setValue(el, base.slice(0, b.start) + out + base.slice(b.start + b.len));
  const caret = b.start + out.length;
  el.setSelectionRange(caret, caret);
  b.len = out.length;
  if (b.raw) buffers.set(el, b); else buffers.delete(el);
  el.dispatchEvent(new Event("input", { bubbles: true })); // lets React / react-hook-form see it
};

const onBeforeInput = (e: Event) => {
  if (!enabled) return;
  const ev = e as InputEvent;
  const el = ev.target;
  if (!eligible(el) || ev.isComposing) return;

  const buf = buffers.get(el);
  if (ev.inputType === "insertText" && ev.data && /^[A-Za-z]$/.test(ev.data)) {
    ev.preventDefault();
    let base = el.value;
    const s = el.selectionStart ?? base.length;
    const end = el.selectionEnd ?? s;
    let b = buf;
    if (s !== end) { base = base.slice(0, s) + base.slice(end); b = undefined; }
    if (!b || s !== b.start + b.len) b = { raw: "", start: s, len: 0 };
    b.raw += ev.data;
    rewrite(el, b, base);
    return;
  }
  if (ev.inputType === "deleteContentBackward" && buf && el.selectionStart === el.selectionEnd && el.selectionStart === buf.start + buf.len) {
    ev.preventDefault();
    buf.raw = buf.raw.slice(0, -1);
    rewrite(el, buf, el.value);
    return;
  }
  buffers.delete(el); // space, digits, punctuation, paste, … start a fresh word
};

const reset = (e: Event) => { if (eligible(e.target)) buffers.delete(e.target); };

const onKeyDown = (e: KeyboardEvent) => {
  if (e.ctrlKey && e.altKey && e.key.toLowerCase() === "s") {
    e.preventDefault();
    setSinhalaTyping(!enabled);
    return;
  }
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "Enter", "Tab", "Escape"].includes(e.key)) reset(e);
};

/** Idempotent: call once when the authenticated app mounts. */
export const installSinhalaTyping = () => {
  if (installed) return;
  installed = true;
  enabled = readStored();
  document.addEventListener("beforeinput", onBeforeInput, true);
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("mousedown", reset, true);
  document.addEventListener("focusout", reset, true);
};
