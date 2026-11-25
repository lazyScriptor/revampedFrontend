import type { TFunction } from "i18next";
import { describeSaleReturnTrace } from "./returnsModel";
import { formatRs } from "../format";

/** "Returned 2 items · Rs 1,180 refunded in cash", or null when the trace is not a sale return. */
export function saleReturnSentence(trace: any, t: TFunction): string | null {
  const d = describeSaleReturnTrace(trace);
  if (!d) return null;
  const amount = formatRs(d.value);
  if (d.credit) return t("retail.returns.traceKept", { count: d.items, amount });
  const method = d.method ? t(`invoices.FinancialPanel.method.${d.method}`, { defaultValue: d.method }).toLowerCase() : "";
  return method ? t("retail.returns.traceRefunded", { count: d.items, amount, method }) : t("retail.returns.traceRefundedNoMethod", { count: d.items, amount });
}
