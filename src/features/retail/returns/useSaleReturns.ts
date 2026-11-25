import { useQuery } from "@tanstack/react-query";
import { fetchSaleReturns } from "./returns.api";

export const saleReturnsKey = (invoiceId: number) => ["invoice", invoiceId, "sale-returns"] as const;

/** The returns of sold items on a bill, newest first. Only asked when `enabled` (a bill with goods, a slip wanted). */
export const useSaleReturns = (invoiceId: number | null | undefined, enabled = true) =>
  useQuery({
    queryKey: saleReturnsKey(Number(invoiceId)),
    queryFn: () => fetchSaleReturns(Number(invoiceId)),
    enabled: enabled && !!invoiceId,
    staleTime: 0,
  });
