import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type ReviewStage = "handover" | "return" | "followup" | "adhoc";

export interface InvoiceReview {
  review_id: number;
  invoice_id: number;
  customer_id: number;
  author_user_id: number;
  stage: ReviewStage;
  rating: number | null;
  comment: string | null;
  is_primary: boolean;
  visibility: "internal" | "customer_visible";
  createdAt: string;
  updatedAt: string;
  Author?: {
    user_id: number;
    first_name?: string;
    last_name?: string;
  };
}

export interface ReviewDraft {
  rating?: number | null;
  comment?: string | null;
  stage?: ReviewStage;
  is_primary?: boolean;
}

const fetchReviews = async (invoiceId: number): Promise<InvoiceReview[]> => {
  const res = await api.get(`/invoices/${invoiceId}/reviews`);
  return res.data?.reviews || res.data?.data?.reviews || [];
};

export const useInvoiceReviews = (invoiceId: number | null) =>
  useQuery({
    queryKey: ["invoice-reviews", invoiceId],
    queryFn: () => fetchReviews(invoiceId as number),
    enabled: !!invoiceId,
    staleTime: 30_000,
  });

export const useCreateReview = (invoiceId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: ReviewDraft) => {
      const res = await api.post(`/invoices/${invoiceId}/reviews`, draft);
      return res.data?.review || res.data?.data?.review;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice-reviews", invoiceId] });
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};

export const useUpdateReview = (invoiceId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ reviewId, draft }: { reviewId: number; draft: ReviewDraft }) => {
      const res = await api.patch(`/invoices/reviews/${reviewId}`, draft);
      return res.data?.review || res.data?.data?.review;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice-reviews", invoiceId] });
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};

export const useDeleteReview = (invoiceId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reviewId: number) => {
      await api.delete(`/invoices/reviews/${reviewId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice-reviews", invoiceId] });
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};
