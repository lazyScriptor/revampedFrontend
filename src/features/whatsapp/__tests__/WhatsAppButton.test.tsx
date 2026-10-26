import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useAuthStore } from "@/stores/useAuthStore";

vi.mock("../components/WhatsAppSendDialog", async (orig) => {
  const real = await orig<typeof import("../components/WhatsAppSendDialog")>();
  return { ...real, WhatsAppSendDialog: (p: any) => <div data-testid="send-dialog">{`${p.invoiceId ?? "-"}|${p.customerId ?? "-"}|${p.templateKey ?? "-"}`}</div> };
});

import { WhatsAppButton } from "../components/WhatsAppButton";

const asUser = (permissions: string[], roles: string[] = ["cashier"]) => useAuthStore.setState({ user: { permissions, roles } as any });

beforeEach(() => asUser(["whatsapp:send"]));

describe("WhatsAppButton", () => {
  it("opens the dialog for an invoice with the suggested message", () => {
    render(<WhatsAppButton invoiceId={50} templateKey="payment_reminder" />);
    fireEvent.click(screen.getByRole("button", { name: "Send on WhatsApp" }));
    expect(screen.getByTestId("send-dialog")).toHaveTextContent("50|-|payment_reminder");
  });

  it("opens the dialog for a bare customer", () => {
    render(<WhatsAppButton customerId={7} templateKey="custom" />);
    fireEvent.click(screen.getByRole("button", { name: "Send on WhatsApp" }));
    expect(screen.getByTestId("send-dialog")).toHaveTextContent("-|7|custom");
  });

  it("renders a labelled button variant", () => {
    render(<WhatsAppButton invoiceId={50} variant="button" label="Send receipt" />);
    expect(screen.getByRole("button", { name: "Send receipt" })).toBeInTheDocument();
  });

  it("is hidden for people without the permission", () => {
    asUser(["invoice:view"]);
    render(<WhatsAppButton invoiceId={50} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("administrators always see it", () => {
    asUser([], ["admin"]);
    render(<WhatsAppButton invoiceId={50} />);
    expect(screen.getByRole("button", { name: "Send on WhatsApp" })).toBeInTheDocument();
  });

  it("renders nothing without a target", () => {
    const { container } = render(<WhatsAppButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it("does not trigger a parent row click", () => {
    const parent = vi.fn();
    render(
      <div onClick={parent}>
        <WhatsAppButton invoiceId={50} />
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Send on WhatsApp" }));
    expect(parent).not.toHaveBeenCalled();
  });
});
