import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

const saveMutate = vi.fn();
const resetMutate = vi.fn();
const settingsMutate = vi.fn();
let canManage = true;
let templatesData: any;
const settingsData = { shop_name: "GearCo", shop_phone: "011 555 0000", default_language: "en" }; // stable, like react-query's

vi.mock("../hooks/useWhatsApp", () => ({
  useWhatsAppTemplates: () => ({ data: templatesData, isLoading: false, isError: false }),
  useSaveWhatsAppTemplate: () => ({ mutate: saveMutate, isPending: false }),
  useResetWhatsAppTemplate: () => ({ mutate: resetMutate, isPending: false }),
  useWhatsAppSettings: () => ({ data: settingsData }),
  useUpdateWhatsAppSettings: () => ({ mutate: settingsMutate, isPending: false }),
}));
vi.mock("@/components/ui/AppToast", () => ({ useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn() }) }));
vi.mock("@/stores/useAuthStore", () => ({
  useAuthStore: (selector: any) => selector({ hasPermission: (code: string) => (code === "whatsapp:manage" ? canManage : true) }),
}));

import { TemplatesTab } from "../components/TemplatesTab";

const entry = (body: string, is_custom = false) => ({ body, default_body: body, is_custom });
const payload = () => ({
  languages: ["en", "si"],
  keys: [
    { key: "receipt", group: "order", needs_invoice: true },
    { key: "overdue_return", group: "returns", needs_invoice: true },
    { key: "payment_reminder", group: "payments", needs_invoice: true },
    { key: "custom", group: "general", needs_invoice: false },
  ],
  placeholders: ["customer_name", "shop_phone", "invoice_number", "balance"],
  samples: {
    en: { customer_name: "Mr. Perera", shop_phone: "", invoice_number: "INV-1042", balance: "Rs. 7,500" },
    si: { customer_name: "පෙරේරා මහතා", shop_phone: "077 123 4567", invoice_number: "INV-1042", balance: "Rs. 7,500" },
  },
  max_length: 100,
  templates: {
    receipt: { en: entry("Hi {{customer_name}}\nInvoice {{invoice_number}}\nCall {{shop_phone}}"), si: entry("සිංහල {{customer_name}}", true) },
    overdue_return: { en: entry("Overdue {{invoice_number}}"), si: entry("ප්‍රමාදයි") },
    payment_reminder: { en: entry("Owes {{balance}}"), si: entry("ගෙවන්න") },
    custom: { en: entry("Hello {{customer_name}}, "), si: entry("{{customer_name}}, ") },
  },
});

const editor = () => screen.getByRole("textbox", { name: "Message wording" }) as HTMLTextAreaElement;
// the page has two language toggles and two Save buttons: the settings card first, the editor second
const editorLanguage = (label: string) => within(screen.getByRole("group", { name: "Language" })).getByRole("button", { name: label });
const saveButton = () => screen.getAllByRole("button", { name: "Save" }).at(-1)!;

beforeEach(() => {
  saveMutate.mockReset();
  resetMutate.mockReset();
  settingsMutate.mockReset();
  canManage = true;
  templatesData = payload();
});

describe("TemplatesTab", () => {
  it("loads the stored wording and previews it with sample data (empty lines vanish)", () => {
    render(<TemplatesTab />);
    expect(editor().value).toContain("Hi {{customer_name}}");
    const preview = screen.getByTestId("template-preview");
    expect(preview).toHaveTextContent("Hi Mr. Perera");
    expect(preview).toHaveTextContent("Invoice INV-1042");
    expect(preview).not.toHaveTextContent("Call"); // shop_phone sample is empty → that line is dropped
  });

  it("opens another message type", () => {
    render(<TemplatesTab />);
    fireEvent.click(screen.getByRole("button", { name: "Overdue" }));
    expect(editor().value).toBe("Overdue {{invoice_number}}");
  });

  it("switches language", () => {
    render(<TemplatesTab />);
    fireEvent.click(editorLanguage("සිං"));
    expect(editor().value).toBe("සිංහල {{customer_name}}");
    expect(screen.getAllByText("Customised").length).toBeGreaterThan(0);
  });

  it("saving is only possible after a valid change", () => {
    render(<TemplatesTab />);
    expect(saveButton()).toBeDisabled(); // nothing changed yet
    fireEvent.change(editor(), { target: { value: "New wording {{customer_name}}" } });
    expect(saveButton()).toBeEnabled();
    fireEvent.click(saveButton());
    expect(saveMutate).toHaveBeenCalledWith({ key: "receipt", language: "en", body: "New wording {{customer_name}}" }, expect.any(Object));
  });

  it("blocks unknown placeholders, empty text and over-long text", () => {
    render(<TemplatesTab />);
    fireEvent.change(editor(), { target: { value: "Hi {{nickname}}" } });
    expect(saveButton()).toBeDisabled();
    expect(screen.getByText(/Unknown placeholder\(s\): \{\{nickname\}\}/)).toBeInTheDocument();
    fireEvent.change(editor(), { target: { value: "   " } });
    expect(saveButton()).toBeDisabled();
    fireEvent.change(editor(), { target: { value: "x".repeat(101) } });
    expect(saveButton()).toBeDisabled();
  });

  it("inserts a placeholder from the chips", () => {
    render(<TemplatesTab />);
    fireEvent.change(editor(), { target: { value: "Total: " } });
    fireEvent.click(screen.getByRole("button", { name: "{{balance}}" }));
    expect(editor().value).toContain("{{balance}}");
  });

  it("reset is available only for customised wording", () => {
    render(<TemplatesTab />);
    expect(screen.getByRole("button", { name: "Reset to default" })).toBeDisabled(); // receipt/en is the default
    fireEvent.click(editorLanguage("සිං"));
    const reset = screen.getByRole("button", { name: "Reset to default" });
    expect(reset).toBeEnabled();
    fireEvent.click(reset);
    expect(resetMutate).toHaveBeenCalledWith({ key: "receipt", language: "si" }, expect.any(Object));
  });

  it("is read-only without the manage permission", () => {
    canManage = false;
    render(<TemplatesTab />);
    expect(editor()).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument(); // neither settings nor editor
    expect(screen.queryByRole("button", { name: "{{balance}}" })).not.toBeInTheDocument();
    expect(screen.getByText(/view the wording but not change it/)).toBeInTheDocument();
  });

  describe("shop settings", () => {
    it("saves the phone and default language", () => {
      render(<TemplatesTab />);
      const phone = screen.getByLabelText("Shop phone in messages") as HTMLInputElement;
      expect(phone.value).toBe("011 555 0000");
      fireEvent.change(phone, { target: { value: "077 999 8888" } });
      fireEvent.click(within(screen.getByRole("group", { name: "Default language" })).getByRole("button", { name: "සිං" }));
      fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]); // the settings card's Save
      expect(settingsMutate).toHaveBeenCalledWith({ shop_phone: "077 999 8888", default_language: "si" }, expect.any(Object));
    });
  });
});
