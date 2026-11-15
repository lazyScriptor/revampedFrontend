import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/features/invoices/hooks/usePosSearch";
import { isContactPhoneSearch } from "@/lib/phoneSearch";
import {
  reviewContactInvoice,
  searchPhoneContacts,
  usePhoneContact,
} from "../api/phoneAssistantApi";

export function usePhoneContactSearch(searchTerm: string, enabled = true) {
  const debouncedSearch = useDebounce(searchTerm, 300);
  const trimmed = debouncedSearch.trim();

  return useQuery({
    queryKey: ["phone-contacts", "search", trimmed],
    queryFn: () => searchPhoneContacts(trimmed, 10),
    // Synced phone contacts are searched by phone number only (9+ digits).
    enabled: enabled && isContactPhoneSearch(trimmed),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

export function useUsePhoneContact() {
  return useMutation({
    mutationFn: ({ contactId, phone }: { contactId: number; phone: string }) =>
      usePhoneContact(contactId, phone),
  });
}

export function useReviewContactInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: number) => reviewContactInvoice(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice"] });
    },
  });
}
