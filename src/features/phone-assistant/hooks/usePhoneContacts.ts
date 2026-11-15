import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/features/invoices/hooks/usePosSearch";
import { isPhoneSearch } from "@/lib/phoneSearch";
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
    // Contacts are found by phone number only, like customers.
    enabled: enabled && isPhoneSearch(trimmed),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

export function useUsePhoneContact() {
  return useMutation({
    mutationFn: (contactId: number) => usePhoneContact(contactId),
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
