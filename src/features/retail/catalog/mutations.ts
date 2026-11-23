import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { archiveProduct, createFamily, createProduct, fetchProduct, learnBarcode, updateProduct } from "../api/catalog.api";
import type { FamilyInput, ProductInput } from "../api/catalog.types";
import { invalidateCatalog, patchCatalog, useRetailPermissions } from "./useRetailCatalog";

/** One product with units, barcodes, family and (with retail:cost_view) its costs. */
export const useProductDetail = (id: number | null | undefined) => {
  const { canView } = useRetailPermissions();
  return useQuery({
    queryKey: ["retail", "product", id],
    queryFn: () => fetchProduct(id as number),
    enabled: canView && !!id,
    staleTime: 60_000,
  });
};

export const useUpdateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: ProductInput }) => updateProduct(id, input),
    onSuccess: (p) => {
      patchCatalog(qc, [p]);
      invalidateCatalog(qc);
    },
  });
};

export const useArchiveProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => archiveProduct(id),
    onSuccess: () => invalidateCatalog(qc),
  });
};

export const useCreateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProductInput) => createProduct(input),
    onSuccess: (p) => {
      patchCatalog(qc, [p]);
      invalidateCatalog(qc);
    },
  });
};

export const useCreateFamily = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: FamilyInput) => createFamily(input),
    onSuccess: (r) => {
      patchCatalog(qc, r.products);
      invalidateCatalog(qc);
    },
  });
};

export const useLearnBarcode = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { barcode: string; product_id: number; unit_id?: number | null }) => learnBarcode(input),
    onSuccess: () => invalidateCatalog(qc),
  });
};
