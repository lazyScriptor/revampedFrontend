import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateStock } from "../stock/useStockLevels";
import { postSaleReturn } from "./returns.api";
import type { SaleReturnInput } from "./returnsModel";

/** Posts a return, then refreshes the bill, the lists, the customer history and the stock. */
export const useSaleReturn = (invoiceId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: SaleReturnInput; idempotencyKey: string }) => postSaleReturn(invoiceId, input, idempotencyKey),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      void qc.invalidateQueries({ queryKey: ["invoices"] });
      void qc.invalidateQueries({ queryKey: ["invoice-search"] });
      void qc.invalidateQueries({ queryKey: ["customer-invoices"] });
      void qc.invalidateQueries({ queryKey: ["customers"] });
      void qc.invalidateQueries({ queryKey: ["dashboard", "open-invoices"] });
      invalidateStock(qc);
    },
  });
};
