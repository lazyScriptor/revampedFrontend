import { START_PAGE_OPTIONS, canOpenStartPage } from "@/app/startPage";
import { registerCommand, registerCommandProvider } from "./commandRegistry";

// "Go to <page>" for every page the start-page list knows, with the same permission and plan rules.
START_PAGE_OPTIONS.forEach((option) =>
  registerCommand({
    id: `go-${option.key}`,
    label: option.labelKey,
    keywords: ["go", "open", option.key],
    visible: (user) => canOpenStartPage(user, option),
    perform: ({ navigate }) => navigate({ to: option.path }),
  }),
);

// "Find invoice 1934" (also "inv 1934", "INV-1934", or just a number)
registerCommandProvider("find-invoice", (query) => {
  const m = query.trim().match(/^(?:inv(?:oice)?[\s#:-]*)?(\d{1,9})$/i);
  if (!m) return [];
  const invoiceId = Number(m[1]);
  if (!(invoiceId > 0)) return [];
  return [
    {
      id: `find-invoice-${invoiceId}`,
      labelKey: "command.findInvoice",
      values: { number: invoiceId },
      perform: ({ navigate }) => navigate({ to: "/invoices", search: { mode: "manage", invoiceId } }),
    },
  ];
});
