import { QueryClientContext, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useContext } from "react";
import { queryClient as appQueryClient } from "@/app/queryClient";
import { fetchRetailSettings, normalizeReceiptSettings, saveReceiptSettings } from "../api/retail.api";
import { DEFAULT_RECEIPT_SETTINGS, DEFAULT_RETAIL_SETTINGS, type RetailReceiptSettings, type RetailSettings } from "../api/types";
import { RETAIL_SETTINGS_KEY } from "../hooks/useRetailSettings";
import { useRetailEnabled } from "../useRetailEnabled";

/**
 * The shop's receipt choices (short sale receipt, footers, cashier line). Safe to call anywhere a
 * receipt is drawn, even where no QueryClientProvider is mounted (it then uses the app's own client),
 * and it never asks the server when retail is off: a rental-only shop always gets the defaults.
 */
export const useReceiptSettings = (): RetailReceiptSettings => {
  const enabled = useRetailEnabled();
  const ctx = useContext(QueryClientContext);
  const q = useQuery(
    { queryKey: RETAIL_SETTINGS_KEY, queryFn: fetchRetailSettings, enabled, staleTime: 5 * 60 * 1000 },
    ctx ?? appQueryClient,
  );
  return q.data?.receipt ? normalizeReceiptSettings(q.data.receipt) : DEFAULT_RECEIPT_SETTINGS;
};

/** Saves some of the receipt choices and updates the cached shop settings straight away. */
export const useSaveReceiptSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<RetailReceiptSettings>) => saveReceiptSettings(patch),
    onSuccess: (receipt) => {
      qc.setQueryData<RetailSettings>(RETAIL_SETTINGS_KEY, (old) => ({ ...(old ?? DEFAULT_RETAIL_SETTINGS), receipt }));
    },
  });
};
