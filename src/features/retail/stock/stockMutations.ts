import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addFamilyVariants } from "../api/catalog.api";
import type { FamilyVariantInput } from "../api/catalog.types";
import {
  createReceive,
  deleteReceiveDraft,
  postAdjust,
  postCount,
  postOpening,
  postReceiveDraft,
  updateReceiveDraft,
  updateStockThresholds,
} from "../api/stock.api";
import type { AdjustInput, CountInput, OpeningInput, ReceiveDocumentInput, ThresholdsInput } from "../api/stock.types";
import { invalidateCatalog, patchCatalog } from "../catalog/useRetailCatalog";
import { invalidateStock } from "./useStockLevels";

export const useCreateReceive = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReceiveDocumentInput) => createReceive(input),
    onSuccess: (doc) => {
      if (doc.status === "posted") invalidateStock(qc);
      else void qc.invalidateQueries({ queryKey: ["retail", "stock", "documents"] });
    },
  });
};

export const useUpdateReceiveDraft = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: ReceiveDocumentInput & { version: number } }) => updateReceiveDraft(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["retail", "stock", "documents"] });
    },
  });
};

export const usePostReceiveDraft = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, version }: { id: number; version: number }) => postReceiveDraft(id, version),
    onSuccess: () => invalidateStock(qc),
  });
};

export const useDeleteReceiveDraft = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteReceiveDraft(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["retail", "stock", "documents"] });
    },
  });
};

export const usePostAdjust = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AdjustInput) => postAdjust(input),
    onSuccess: () => invalidateStock(qc),
  });
};

export const usePostCount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CountInput) => postCount(input),
    onSuccess: () => invalidateStock(qc),
  });
};

export const usePostOpening = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OpeningInput) => postOpening(input),
    onSuccess: () => invalidateStock(qc),
  });
};

export const useUpdateStockThresholds = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, warehouseId, input }: { productId: number; warehouseId: number; input: ThresholdsInput }) =>
      updateStockThresholds(productId, warehouseId, input),
    onSuccess: () => invalidateStock(qc),
  });
};

export const useAddFamilyVariants = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ familyId, variants }: { familyId: number; variants: FamilyVariantInput[] }) =>
      addFamilyVariants(familyId, variants),
    onSuccess: (r) => {
      patchCatalog(qc, r.products);
      invalidateCatalog(qc);
    },
  });
};
