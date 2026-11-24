import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@/i18n";
import i18n from "@/i18n";

let templatesData: any;
const settingsData = { shop_name: "GearCo", shop_phone: "011 555 0000", default_language: "en" };
vi.mock("../hooks/useWhatsApp", () => ({
  useWhatsAppTemplates: () => ({ data: templatesData, isLoading: false, isError: false }),
  useSaveWhatsAppTemplate: () => ({ mutate: vi.fn(), isPending: false }),
  useResetWhatsAppTemplate: () => ({ mutate: vi.fn(), isPending: false }),
  useWhatsAppSettings: () => ({ data: settingsData }),
  useUpdateWhatsAppSettings: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/components/ui/AppToast", () => ({ useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn() }) }));
vi.mock("@/stores/useAuthStore", () => ({ useAuthStore: (selector: any) => selector({ hasPermission: () => true }) }));

import { TemplatesTab } from "../components/TemplatesTab";
import { PLACEHOLDER_I18N } from "../lib/whatsapp";

const entry = (body: string) => ({ body, default_body: body, is_custom: false });
const payload = (samples: Record<string, string> = {}) => ({
  languages: ["en", "si"],
  keys: [{ key: "receipt", group: "order", needs_invoice: true }],
  // the API's own list: the retail placeholders come with it
  placeholders: ["customer_name", "invoice_number", "items", "items_sold", "sale_total", "rent_total"],
  samples: { en: { customer_name: "Mr. Perera", invoice_number: "INV-1042", ...samples }, si: { customer_name: "පෙරේරා මහතා", invoice_number: "INV-1042", ...samples } },
  max_length: 500,
  templates: {
    receipt: {
      en: entry("Hi {{customer_name}}\nGoods: {{items_sold}}\nGoods total {{sale_total}}\nRent total {{rent_total}}"),
      si: entry("{{customer_name}}\n{{items_sold}}"),
    },
  },
});

const editor = () => screen.getByRole("textbox", { name: "Message wording" }) as HTMLTextAreaElement;

beforeEach(() => {
  templatesData = payload();
});

describe("retail placeholders in the WhatsApp template editor", () => {
  it("offers {{items_sold}}, {{sale_total}} and {{rent_total}} as chips, and inserts them where the cursor is", () => {
    render(<TemplatesTab />);
    for (const name of ["items_sold", "sale_total", "rent_total", "items"]) expect(screen.getByRole("button", { name: `{{${name}}}` })).toBeTruthy();
    fireEvent.change(editor(), { target: { value: "Total: " } });
    editor().setSelectionRange(7, 7);
    fireEvent.click(screen.getByRole("button", { name: "{{sale_total}}" }));
    expect(editor().value).toBe("Total: {{sale_total}}");
    expect(screen.queryByText(/Unknown placeholder/)).toBeNull(); // known, so saving stays possible
  });

  it("each new chip is described in words, in English and Sinhala", async () => {
    for (const key of ["items_sold", "sale_total", "rent_total", "items"]) {
      const path = PLACEHOLDER_I18N[key];
      expect(i18n.exists(path, { lng: "en" })).toBe(true);
      expect(i18n.t(path, { lng: "si" })).not.toBe(i18n.t(path, { lng: "en" }));
    }
    render(<TemplatesTab />);
    fireEvent.mouseOver(screen.getByRole("button", { name: "{{items_sold}}" }));
    expect(await screen.findByText("The goods sold on the bill")).toBeTruthy();
  });

  it("the live preview fills them in, using the server's examples when it sends them", () => {
    const { unmount } = render(<TemplatesTab />);
    const preview = screen.getByTestId("template-preview");
    expect(preview.textContent).toContain("Goods total Rs. 4,500"); // the editor's own example
    expect(preview.textContent).toContain("Rent total Rs. 12,000");
    expect(preview.textContent).toContain("Goods: 2 x Cement bag");
    unmount();
    templatesData = payload({ sale_total: "Rs. 99", items_sold: "1 x Hammer" });
    render(<TemplatesTab />);
    expect(screen.getByTestId("template-preview").textContent).toContain("Goods total Rs. 99");
    expect(screen.getByTestId("template-preview").textContent).toContain("Goods: 1 x Hammer");
  });
});
