import { describe, it, expect } from "vitest";
import en from "@/i18n/locales/en.json";
import si from "@/i18n/locales/si.json";
import {
  BLOCKING_WARNINGS,
  CUSTOMER_TEMPLATES,
  INVOICE_TEMPLATES,
  NO_NUMBER_WARNINGS,
  TEMPLATE_I18N,
  WARNING_I18N,
  buildWaLink,
  isBlocked,
  lacksNumber,
  renderTemplate,
  suggestedTemplate,
  timeAgo,
  unknownPlaceholders,
} from "../lib/whatsapp";

const get = (obj: any, path: string) => path.split(".").reduce((o, k) => o?.[k], obj);

describe("buildWaLink", () => {
  it("encodes text and keeps newlines and Sinhala intact", () => {
    const text = "Hello & thanks!\nඉන්වොයිසිය INV-5 — 50% #1";
    const link = buildWaLink("94771234567", text);
    expect(link.startsWith("https://wa.me/94771234567?text=")).toBe(true);
    expect(decodeURIComponent(link.split("?text=")[1])).toBe(text);
    expect(link).not.toMatch(/[ \n]/);
  });
  it("opens the contact picker without a number, and drops ?text for empty text", () => {
    expect(buildWaLink("", "hi")).toBe("https://wa.me/?text=hi");
    expect(buildWaLink("94771234567")).toBe("https://wa.me/94771234567");
  });
});

describe("warning helpers", () => {
  it("only an opt-out blocks sending", () => {
    expect(BLOCKING_WARNINGS).toEqual(["opted_out"]);
    expect(isBlocked(["messaged_recently", "opted_out"])).toBe(true);
    expect(isBlocked(["messaged_recently", "landline"])).toBe(false);
    expect(isBlocked([])).toBe(false);
  });
  it("no usable number means WhatsApp will ask to pick the contact", () => {
    expect(NO_NUMBER_WARNINGS.sort()).toEqual(["invalid_phone", "landline", "no_phone"]);
    expect(lacksNumber(["landline"])).toBe(true);
    expect(lacksNumber(["messaged_recently"])).toBe(false);
  });
});

describe("message types", () => {
  it("suggests a sensible default per invoice status", () => {
    expect(suggestedTemplate("Active")).toBe("receipt");
    expect(suggestedTemplate("PendingPayment")).toBe("payment_reminder");
    expect(suggestedTemplate("Completed")).toBe("thank_you");
    expect(suggestedTemplate(undefined)).toBe("receipt");
    expect(suggestedTemplate("Whatever")).toBe("receipt");
  });
  it("invoices offer every type; a bare customer only a custom message", () => {
    expect(INVOICE_TEMPLATES).toContain("custom");
    expect(INVOICE_TEMPLATES.length).toBe(Object.keys(TEMPLATE_I18N).length);
    expect(CUSTOMER_TEMPLATES).toEqual(["custom"]);
  });
  it("every label key exists in English and Sinhala", () => {
    for (const k of [...Object.values(TEMPLATE_I18N), ...Object.values(WARNING_I18N)]) {
      expect(get(en, k), `en ${k}`).toBeTruthy();
      expect(get(si, k), `si ${k}`).toBeTruthy();
    }
  });
});

describe("renderTemplate (mirror of the server)", () => {
  it("fills placeholders and drops lines whose placeholders are all empty", () => {
    const out = renderTemplate("Hi {{customer_name}}\nCall: {{shop_phone}}\n— {{shop_name}} {{shop_phone}}", { customer_name: "Nimal", shop_phone: "", shop_name: "GearCo" });
    expect(out).toBe("Hi Nimal\n— GearCo");
  });
  it("never prints undefined/null, collapses blank runs, leaves $ patterns alone", () => {
    expect(renderTemplate("A {{total}} B", { total: undefined as any })).not.toMatch(/undefined|null/);
    expect(renderTemplate("\n\nA\n\n\n\nB\n", {})).toBe("A\n\nB");
    expect(renderTemplate("{{items}}", { items: "$& $1" })).toBe("$& $1");
  });
  it("flags unknown placeholders only", () => {
    expect(unknownPlaceholders("{{customer_name}} {{nope}} {{nope}}", ["customer_name"])).toEqual(["nope"]);
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-10-26T12:00:00Z").getTime();
  it("speaks in minutes, hours and days", () => {
    expect(timeAgo("2026-10-26T11:58:00Z", "en", now)).toBe("2 minutes ago");
    expect(timeAgo("2026-10-26T09:00:00Z", "en", now)).toBe("3 hours ago");
    expect(timeAgo("2026-10-24T12:00:00Z", "en", now)).toBe("2 days ago");
    expect(timeAgo("2026-10-26T11:59:50Z", "en", now)).toMatch(/now|seconds? ago/);
  });
  it("does not throw for Sinhala", () => {
    expect(timeAgo("2026-10-26T09:00:00Z", "si", now)).toBeTruthy();
  });
});
