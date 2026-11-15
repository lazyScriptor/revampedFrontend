import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

const mocks = vi.hoisted(() => ({
  getPhoneAssistantPolicy: vi.fn(),
  updatePhoneAssistantPolicy: vi.fn(),
  patchPhoneAssistantPolicy: vi.fn(),
  getPushTemplates: vi.fn(),
  savePushTemplate: vi.fn(),
  resetPushTemplate: vi.fn(),
  previewPushTemplate: vi.fn(),
  sendPushTemplateTest: vi.fn(),
  sendCallScreenSample: vi.fn(),
}));

vi.mock("../api/phoneAssistantApi", () => ({
  getPhoneAssistantPolicy: mocks.getPhoneAssistantPolicy,
  updatePhoneAssistantPolicy: mocks.updatePhoneAssistantPolicy,
  patchPhoneAssistantPolicy: mocks.patchPhoneAssistantPolicy,
  getPushTemplates: mocks.getPushTemplates,
  savePushTemplate: mocks.savePushTemplate,
  resetPushTemplate: mocks.resetPushTemplate,
  previewPushTemplate: mocks.previewPushTemplate,
  sendPushTemplateTest: mocks.sendPushTemplateTest,
  sendCallScreenSample: mocks.sendCallScreenSample,
}));
vi.mock("@/lib/socket", () => ({ connectSocket: vi.fn(), getSocket: () => null }));
vi.mock("@/components/ui/SinhalaTypingToggle", () => ({ SinhalaTypingToggle: () => null }));

import { CallScreenDesigner } from "../components/CallScreenDesigner";
import { NotificationLanguagePanel } from "../components/NotificationLanguagePanel";
import { ContactsCallsPanel, SyncPrivacyPanel } from "../components/PolicyTabs";
import {
  DEFAULT_CALL_SCREEN,
  SAMPLE_BRIEFS,
  allowedFields,
  effectiveTextScale,
  evaluateRules,
  readDesign,
  renderRows,
} from "../lib/callScreenLayout";

const basePolicy = () => ({
  approval_mode: "auto_approve_admin_phones",
  auto_suspend_days: 30,
  offline_wipe_days: 7,
  capabilities: {},
  brief_profiles: [
    { id: "owner", name: "Owner", fields: ["*"], lock_screen: "name_rating", amounts: "exact", call_screen: JSON.parse(JSON.stringify(DEFAULT_CALL_SCREEN)) },
    { id: "counter", name: "Counter staff", fields: ["name", "company", "rating"], lock_screen: "name_only", amounts: "hidden", call_screen: { ...JSON.parse(JSON.stringify(DEFAULT_CALL_SCREEN)), rows: [{ field: "name", style: "title" }] } },
  ],
  sync: { stale_after_minutes: 60, warn_after_hours: 24, show_sync_footer: "always" },
  call_screen: { allow_phone_text_scale: true, min: 0.8, max: 2, respect_system_font: true },
  notifications: { default_language: "en", allowed_languages: ["en", "si", "ta", "si-Latn"], bilingual: "off", format: { currency: "LKR", date: "dd MMM", time: "24h", digits: "latin" } },
  full_app: { enabled: true, require_app_lock: false, session_minutes: 30, block_screenshots: false },
  contact_sync: { allowed_modes: ["off", "all"], fields: ["name_and_number"] },
  call_logging: { allowed_scopes: ["off", "customers_only"], store_unknown_numbers: false, business_hours_only: false, business_hours: { from: "08:00", to: "18:00" }, retention_days: 180 },
  overlay: { position: "top", auto_dismiss_seconds: 0, show_for: "incoming" },
  unknown_caller: "show_not_in_geargrid",
  shared_number: "list_all",
  desktop_popup: { roles: [], size: "standard" },
});

const wrap = (ui: ReactElement) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset());
  mocks.getPhoneAssistantPolicy.mockResolvedValue({ policy: basePolicy() });
  mocks.updatePhoneAssistantPolicy.mockImplementation(async (body: any) => ({ policy: { ...basePolicy(), ...body } }));
  mocks.patchPhoneAssistantPolicy.mockImplementation(async () => ({ policy: basePolicy() }));
  mocks.sendCallScreenSample.mockResolvedValue({ reached: 1 });
  mocks.getPushTemplates.mockResolvedValue({
    languages: ["en", "si", "ta", "si-Latn"],
    events: [{ key: "invoice_created", placeholders: ["invoice_no", "amount", "customer"] }],
    templates: ["en", "si", "ta", "si-Latn"].map((language) => ({
      event_key: "invoice_created",
      language,
      title: language === "en" ? "New bill #{invoice_no}" : `T-${language}`,
      body: language === "en" ? "{customer}[ · {amount}]" : `B-${language}`,
      title_private: null,
      body_private: null,
      edited: language === "si",
      has_default: true,
    })),
  });
  mocks.previewPushTemplate.mockResolvedValue({
    normal: { title: "New bill #42", body: "Nimal · LKR 12,000" },
    private: { title: "New bill #42", body: "" },
  });
  mocks.savePushTemplate.mockResolvedValue({ template: {} });
  mocks.sendPushTemplateTest.mockResolvedValue({ reached: 1, title: "x", body: "y" });
});

describe("call screen layout rules", () => {
  it("only offers fields the profile may receive", () => {
    expect(allowedFields(["name", "rating"])).toEqual(["name", "rating"]);
    expect(allowedFields(["*"]).length).toBeGreaterThan(10);
  });

  it("scales text from the design, then the phone within the shop's limits, then the system font", () => {
    const d = { ...DEFAULT_CALL_SCREEN, text_scale: 1.2 };
    expect(effectiveTextScale({ design: d })).toBe(1.2);
    expect(effectiveTextScale({ design: d, phoneScale: 1.6 })).toBe(1.6);
    expect(effectiveTextScale({ design: d, phoneScale: 1.9, max: 1.5 })).toBe(1.5);
    expect(effectiveTextScale({ design: d, phoneScale: 1.6, allowPhoneScale: false })).toBe(1.2);
    expect(effectiveTextScale({ design: d, systemFontScale: 1.3 })).toBe(1.56);
    expect(effectiveTextScale({ design: d, systemFontScale: 1.3, respectSystemFont: false })).toBe(1.2);
  });

  it("evaluates warning rules against the sample customer", () => {
    const d = { ...DEFAULT_CALL_SCREEN, rules: [
      { when: "status_blacklisted" as const, accent: "danger" as const, banner: true, vibrate: true },
      { when: "balance_due_over" as const, value: 10000, accent: "warning" as const },
    ] };
    expect(evaluateRules(d, SAMPLE_BRIEFS.blacklisted)).toEqual({ accent: "danger", banner: true, vibrate: true });
    expect(evaluateRules(d, SAMPLE_BRIEFS.dues)).toEqual({ accent: "warning", banner: false, vibrate: false });
    expect(evaluateRules(d, SAMPLE_BRIEFS.good).accent).toBeNull();
  });

  it("hides amounts by profile and limits rows while locked", () => {
    const d = { ...DEFAULT_CALL_SCREEN };
    expect(renderRows(d, SAMPLE_BRIEFS.dues, "hidden").some((r) => r.field === "balance_due")).toBe(false);
    expect(renderRows(d, SAMPLE_BRIEFS.dues, "exact").find((r) => r.field === "balance_due")?.text.plain).toContain("18,500");
    expect(renderRows(d, SAMPLE_BRIEFS.dues, "exact", "name_only").map((r) => r.field)).toEqual(["name"]);
    expect(readDesign({ version: 9 }).version).toBe(1);
  });
});

describe("CallScreenDesigner", () => {
  it("changes the preview at once, flags unsaved changes, and saves only that profile's design", async () => {
    wrap(<CallScreenDesigner />);
    expect(await screen.findByTestId("call-screen-preview")).toBeInTheDocument();
    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();

    const before = getComputedStyle(screen.getByText("Kasun Fernando")).fontSize;
    fireEvent.click(screen.getByRole("button", { name: "Extra large" }));
    const after = getComputedStyle(screen.getByText("Kasun Fernando")).fontSize;
    expect(parseFloat(after)).toBeGreaterThan(parseFloat(before));
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(mocks.updatePhoneAssistantPolicy).toHaveBeenCalledTimes(1));
    const body = mocks.updatePhoneAssistantPolicy.mock.calls[0][0];
    expect(body.brief_profiles).toHaveLength(2);
    expect(body.brief_profiles[0].call_screen.size).toBe("extra_large");
    expect(body.brief_profiles[1].call_screen.size).toBe("standard");
    expect(await screen.findByText(/Call screen saved/)).toBeInTheDocument();
  });

  it("removes a row and keeps at least one", async () => {
    wrap(<CallScreenDesigner />);
    await screen.findByTestId("call-screen-preview");
    fireEvent.click(screen.getByRole("button", { name: /Remove Rating/ }));
    expect(screen.queryByTestId("cs-row-rating")).not.toBeInTheDocument();
    expect(screen.getByTestId("cs-row-name")).toBeInTheDocument();
  });

  it("sends a sample call to the administrator's own phone", async () => {
    wrap(<CallScreenDesigner />);
    await screen.findByTestId("call-screen-preview");
    fireEvent.click(screen.getByRole("button", { name: /Send sample to my phone/ }));
    await waitFor(() => expect(mocks.sendCallScreenSample).toHaveBeenCalledWith("owner"));
    expect(await screen.findByText(/Sample call sent to 1/)).toBeInTheDocument();
  });

  it("shows the offline footer in the preview", async () => {
    wrap(<CallScreenDesigner />);
    await screen.findByTestId("call-screen-preview");
    fireEvent.click(screen.getByRole("button", { name: "Offline" }));
    expect(within(screen.getByTestId("call-screen-preview")).getByText(/Offline · data from/)).toBeInTheDocument();
  });
});

describe("NotificationLanguagePanel", () => {
  it("shows default / edited markers and saves a template from the drawer", async () => {
    wrap(<NotificationLanguagePanel />);
    expect(await screen.findByText("Message wording")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New invoice created – සිංහල – Edited/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /New invoice created – English – Default/ }));
    expect(await screen.findByDisplayValue("New bill #{invoice_no}")).toBeInTheDocument();
    await waitFor(() => expect(mocks.previewPushTemplate).toHaveBeenCalled());
    expect(await screen.findByText("Nimal · LKR 12,000")).toBeInTheDocument();

    const title = screen.getByDisplayValue("New bill #{invoice_no}");
    fireEvent.change(title, { target: { value: "Bill #{invoice_no} created" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(mocks.savePushTemplate).toHaveBeenCalledWith(
        "invoice_created",
        "en",
        expect.objectContaining({ title: "Bill #{invoice_no} created" }),
      ),
    );
  });

  it("shows the server's message when a placeholder is unknown", async () => {
    mocks.previewPushTemplate.mockRejectedValue(new Error("Unknown placeholder {nope} for invoice_created."));
    wrap(<NotificationLanguagePanel />);
    fireEvent.click(await screen.findByRole("button", { name: /New invoice created – English/ }));
    expect(await screen.findByText(/Unknown placeholder \{nope\}/)).toBeInTheDocument();
  });

  it("writes a language rule by path so other tabs are untouched", async () => {
    wrap(<NotificationLanguagePanel />);
    await screen.findByText("Message wording");
    fireEvent.click(screen.getByRole("switch", { name: /English text under/ }));
    await waitFor(() =>
      expect(mocks.patchPhoneAssistantPolicy).toHaveBeenCalledWith([{ path: "notifications.bilingual", value: "append_english" }]),
    );
  });
});

describe("policy grids", () => {
  it("Sync & privacy saves one value by path on blur", async () => {
    wrap(<SyncPrivacyPanel />);
    const input = await screen.findByLabelText("Data counts as old after (minutes)");
    fireEvent.change(input, { target: { value: "90" } });
    fireEvent.blur(input);
    await waitFor(() =>
      expect(mocks.patchPhoneAssistantPolicy).toHaveBeenCalledWith([{ path: "sync.stale_after_minutes", value: 90 }]),
    );
  });

  it("rejects an out-of-range number without calling the server", async () => {
    wrap(<SyncPrivacyPanel />);
    const input = await screen.findByLabelText("Data counts as old after (minutes)");
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.blur(input);
    expect(mocks.patchPhoneAssistantPolicy).not.toHaveBeenCalled();
  });

  it("Contacts & calls edits the desktop popup size", async () => {
    wrap(<ContactsCallsPanel />);
    expect(await screen.findByText("Desktop call popup size")).toBeInTheDocument();
    expect(screen.getByText("Business hours")).toBeInTheDocument();
  });
});
