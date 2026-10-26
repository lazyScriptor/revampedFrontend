import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import type { ComposedMessage } from "../api/whatsapp.api";

// ── mocked data layer: the dialog's own behaviour is what is under test ──
let composeResult: any;
const composeCalls: any[] = [];
const logMutate = vi.fn();
const confirmMutate = vi.fn();
const optOutMutate = vi.fn();
vi.mock("../hooks/useWhatsApp", () => ({
  useWhatsAppCompose: (params: any) => {
    composeCalls.push(params);
    return composeResult(params);
  },
  useLogWhatsAppMessage: () => ({ mutate: logMutate, isPending: false, isSuccess: false }),
  useConfirmWhatsAppSent: () => ({ mutate: confirmMutate, isPending: false }),
  useSetWhatsAppOptOut: () => ({ mutate: optOutMutate, isPending: false }),
}));
vi.mock("@/components/ui/AppToast", () => ({ useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn() }) }));

import { WhatsAppSendDialog } from "../components/WhatsAppSendDialog";

const message = (over: Partial<ComposedMessage> = {}): ComposedMessage => ({
  template_key: "receipt",
  language: "en",
  body: "Hello Nimal Perera,\nTotal: Rs. 12,500",
  link: "https://wa.me/94771234567?text=x",
  to: { digits: "94771234567", display: "+94 77 123 4567", kind: "mobile", valid: true },
  customer: { customer_id: 7, name: "Nimal Perera", opted_out: false },
  invoice: { invoice_id: 50, number: "INV-50", balance: 7500 },
  last_message: null,
  warnings: [],
  ...over,
});

const respond = (fn: (p: any) => Partial<ComposedMessage>) => {
  composeResult = (p: any) => ({ data: message({ template_key: p.template_key, language: p.language ?? "en", ...fn(p) }), isLoading: false, isFetching: false, isError: false });
};

const renderDialog = (props: Record<string, unknown> = {}) => render(<WhatsAppSendDialog open onClose={vi.fn()} invoiceId={50} {...props} />);
const textbox = () => screen.getByRole("textbox", { name: "Message" }) as HTMLTextAreaElement;

let openSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  composeCalls.length = 0;
  logMutate.mockReset();
  confirmMutate.mockReset();
  optOutMutate.mockReset();
  openSpy = vi.spyOn(window, "open").mockReturnValue({} as Window);
  respond(() => ({}));
});

describe("WhatsAppSendDialog", () => {
  it("shows who it is for, their number, the invoice and the composed message", () => {
    renderDialog();
    expect(screen.getByText("Nimal Perera")).toBeInTheDocument();
    expect(screen.getByText("+94 77 123 4567")).toBeInTheDocument();
    expect(screen.getByText("INV-50")).toBeInTheDocument();
    expect(textbox().value).toBe("Hello Nimal Perera,\nTotal: Rs. 12,500");
  });

  it("opens WhatsApp with the number and the text, then logs the chat", () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Open WhatsApp" }));
    expect(openSpy).toHaveBeenCalledTimes(1);
    const link = openSpy.mock.calls[0][0] as string;
    expect(link.startsWith("https://wa.me/94771234567?text=")).toBe(true);
    expect(decodeURIComponent(link.split("?text=")[1])).toBe("Hello Nimal Perera,\nTotal: Rs. 12,500");
    expect(logMutate).toHaveBeenCalledWith(
      { customer_id: 7, invoice_id: 50, template_key: "receipt", language: "en", to_phone: "94771234567", body: "Hello Nimal Perera,\nTotal: Rs. 12,500" },
      expect.any(Object),
    );
  });

  it("sends exactly what staff edited", () => {
    renderDialog();
    fireEvent.change(textbox(), { target: { value: "Custom wording & more" } });
    expect(screen.getByText(/Edited/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open WhatsApp" }));
    expect(decodeURIComponent((openSpy.mock.calls[0][0] as string).split("?text=")[1])).toBe("Custom wording & more");
    expect(logMutate.mock.calls[0][0].body).toBe("Custom wording & more");
  });

  it("asks the server for the other language and discards edits", () => {
    renderDialog();
    fireEvent.change(textbox(), { target: { value: "my edit" } });
    fireEvent.click(screen.getByRole("button", { name: "සිං" }));
    expect(composeCalls.at(-1)).toMatchObject({ template_key: "receipt", invoice_id: 50, language: "si" });
    expect(textbox().value).toBe("Hello Nimal Perera,\nTotal: Rs. 12,500"); // back to the composed text
  });

  it("switches message type and composes that one", () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Payment reminder" }));
    expect(composeCalls.at(-1)).toMatchObject({ template_key: "payment_reminder", invoice_id: 50 });
  });

  it("starts on the requested message type", () => {
    renderDialog({ templateKey: "overdue_return" });
    expect(composeCalls[0]).toMatchObject({ template_key: "overdue_return" });
  });

  it("with only a customer it offers just a custom message and no type chips", () => {
    render(<WhatsAppSendDialog open onClose={vi.fn()} customerId={7} templateKey="custom" />);
    expect(composeCalls[0]).toMatchObject({ template_key: "custom", customer_id: 7 });
    expect(screen.queryByRole("group", { name: "Message type" })).not.toBeInTheDocument();
  });

  describe("problems", () => {
    it("an opted-out customer cannot be messaged until allowed again", () => {
      respond(() => ({ warnings: ["opted_out"], customer: { customer_id: 7, name: "Nimal Perera", opted_out: true } }));
      renderDialog();
      expect(screen.getByRole("button", { name: "Open WhatsApp" })).toBeDisabled();
      fireEvent.click(screen.getByRole("button", { name: "Allow again" }));
      expect(optOutMutate).toHaveBeenCalledWith({ customerId: 7, optOut: false });
    });

    it("no usable number → opens WhatsApp's contact picker instead", () => {
      respond(() => ({ warnings: ["landline"], to: { digits: "94112345678", display: "+94 11 234 5678", kind: "landline", valid: false } }));
      renderDialog();
      fireEvent.click(screen.getByRole("button", { name: "Open WhatsApp (pick contact)" }));
      expect((openSpy.mock.calls[0][0] as string).startsWith("https://wa.me/?text=")).toBe(true);
      expect(screen.getByText(/landline/i)).toBeInTheDocument();
    });

    it("recently messaged is a heads-up, not a block", () => {
      respond(() => ({ warnings: ["messaged_recently"], last_message: { template_key: "receipt", created_at: new Date(Date.now() - 3600_000).toISOString(), status: "opened" } }));
      renderDialog();
      expect(screen.getByText(/already sent this message recently/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Open WhatsApp" })).toBeEnabled();
    });

    it("shows an error when the message cannot be prepared", () => {
      composeResult = () => ({ data: undefined, isLoading: false, isFetching: false, isError: true });
      renderDialog();
      expect(screen.getByText("Could not prepare the message.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Open WhatsApp" })).toBeDisabled();
    });

    it("cannot send an empty message", () => {
      renderDialog();
      fireEvent.change(textbox(), { target: { value: "   " } });
      expect(screen.getByRole("button", { name: "Open WhatsApp" })).toBeDisabled();
    });
  });

  describe("after opening", () => {
    it("lets staff confirm the message was sent", () => {
      logMutate.mockImplementation((_p, opts) => opts?.onSuccess?.({ log_id: 321, status: "opened" }));
      renderDialog();
      fireEvent.click(screen.getByRole("button", { name: "Open WhatsApp" }));
      fireEvent.click(screen.getByRole("button", { name: "Yes, sent" }));
      expect(confirmMutate).toHaveBeenCalledWith(321, expect.any(Object));
    });

    it("offers a plain link when the browser blocks the new tab", () => {
      openSpy.mockReturnValue(null);
      renderDialog();
      fireEvent.click(screen.getByRole("button", { name: "Open WhatsApp" }));
      const fallback = screen.getByRole("link", { name: /open WhatsApp here/ });
      expect(fallback.getAttribute("href")).toContain("https://wa.me/94771234567?text=");
    });
  });

  it("copies the message", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Copy message" }));
    expect(writeText).toHaveBeenCalledWith("Hello Nimal Perera,\nTotal: Rs. 12,500");
  });
});
