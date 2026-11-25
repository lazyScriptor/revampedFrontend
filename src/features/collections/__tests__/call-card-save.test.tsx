import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { api } from "@/lib/api";
import { CallCardPopover } from "../components/CallCardPopover";

vi.mock("@/lib/api", () => ({
  api: { get: vi.fn().mockResolvedValue({ status: "success", data: {} }), post: vi.fn() },
}));

const open = (invoiceIds: number[]) => {
  const anchor = document.createElement("button");
  document.body.appendChild(anchor);
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <I18nextProvider i18n={i18n}>
        <CallCardPopover anchorEl={anchor} open onClose={vi.fn()} customerId={11} customerName="Kasun" invoiceIds={invoiceIds} initialCall={{ call_id: 55 }} />
      </I18nextProvider>
    </QueryClientProvider>,
  );
};
const body = () => vi.mocked(api.post).mock.calls.find(([url]) => url === "/calls/55/note")?.[1] as Record<string, unknown>;

beforeEach(async () => {
  await i18n.changeLanguage("en");
  vi.mocked(api.post).mockReset().mockResolvedValue({ status: "success", data: {} });
});
afterEach(cleanup);

describe("web call card", () => {
  it("sends the return date as the reminder, with the server's result key", async () => {
    open([101]);
    fireEvent.click(screen.getByText("Will bring machines back"));
    fireEvent.change(screen.getByLabelText(/Expected return date/i), { target: { value: "2027-02-01" } });
    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));
    await waitFor(() =>
      expect(body()).toMatchObject({ result: "will_return_machines", follow_up_on: "2027-02-01", invoice_ids: [101], promise_amount: null }),
    );
  });

  it("leaves the bill list out when the row has none, so the call keeps its bills", async () => {
    open([]);
    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));
    await waitFor(() => expect(body()).toBeDefined());
    expect(body().invoice_ids).toBeUndefined();
  });
});
