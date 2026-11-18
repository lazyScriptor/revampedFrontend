import { describe, expect, it } from "vitest";
import { startPageOptionsFor, startPathFor } from "@/app/startPage";

const counter = { permissions: ["inventory_permission"] };

describe("startPathFor", () => {
  it("opens Invoicing by default", () => {
    expect(startPathFor(counter)).toBe("/invoices");
    expect(startPathFor({ ...counter, start_page: null })).toBe("/invoices");
  });

  it("opens the page the user chose", () => {
    expect(startPathFor({ ...counter, start_page: "customers" })).toBe("/customers");
    expect(startPathFor({ ...counter, start_page: "dashboard" })).toBe("/dashboard");
  });

  it("falls back to Invoicing when the chosen page is unknown or not allowed", () => {
    expect(startPathFor({ ...counter, start_page: "nonsense" })).toBe("/invoices");
    expect(startPathFor({ ...counter, start_page: "messages" })).toBe("/invoices");
  });

  it("falls back to the Dashboard when the role cannot open Invoicing", () => {
    expect(startPathFor({ permissions: [] })).toBe("/dashboard");
    expect(startPathFor(null)).toBe("/dashboard");
  });

  it("respects the shop's plan", () => {
    const plan = { features: { maintenance: false } } as any;
    expect(startPathFor({ ...counter, plan, start_page: "maintenance" })).toBe("/invoices");
  });
});

describe("startPageOptionsFor", () => {
  it("lists only pages the role can open", () => {
    expect(startPageOptionsFor({ permissions: [] }).map((o) => o.key)).toEqual(["dashboard"]);
    const keys = startPageOptionsFor(counter).map((o) => o.key);
    expect(keys[0]).toBe("invoices");
    expect(keys).not.toContain("messages");
  });
});
