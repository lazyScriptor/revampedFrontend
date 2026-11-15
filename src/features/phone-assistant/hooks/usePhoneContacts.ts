import { useMutation, useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/features/invoices/hooks/usePosSearch";
import { isContactSearch } from "@/lib/phoneSearch";
import {
  searchPhoneContacts,
  usePhoneContact,
} from "../api/phoneAssistantApi";

export function usePhoneContactSearch(searchTerm: string, enabled = true) {
  const debouncedSearch = useDebounce(searchTerm, 300);
  const trimmed = debouncedSearch.trim();

  return useQuery({
    queryKey: ["phone-contacts", "search", trimmed],
    queryFn: () => searchPhoneContacts(trimmed, 10),
    // Contacts are found by phone number only, and only once the full number is typed.
    enabled: enabled && isContactSearch(trimmed),
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
