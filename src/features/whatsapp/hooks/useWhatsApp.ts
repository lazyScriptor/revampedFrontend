import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as wa from "../api/whatsapp.api";
import type { ComposeParams, Language, TemplateKey } from "../api/whatsapp.api";

export const WA_KEYS = {
  all: ["whatsapp"] as const,
  worklist: (language?: Language) => ["whatsapp", "worklist", language ?? "auto"] as const,
  compose: (p: Omit<ComposeParams, "custom_text">) => ["whatsapp", "compose", p] as const,
  templates: ["whatsapp", "templates"] as const,
  settings: ["whatsapp", "settings"] as const,
  log: (f: object) => ["whatsapp", "log", f] as const,
};

// The "Today" list changes as staff message people and as invoices are returned/paid elsewhere.
export const useWhatsAppWorklist = (language?: Language) =>
  useQuery({
    queryKey: WA_KEYS.worklist(language),
    queryFn: () => wa.fetchWorklist(language),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  });

// One composed message for the send dialog. Always fresh: balances and dates are live.
export const useWhatsAppCompose = (params: Omit<ComposeParams, "custom_text">, enabled: boolean) =>
  useQuery({
    queryKey: WA_KEYS.compose(params),
    queryFn: () => wa.composeMessage(params),
    enabled,
    staleTime: 0,
    gcTime: 60 * 1000,
    retry: false,
  });

export const useLogWhatsAppMessage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: wa.logMessage,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp", "worklist"] });
      qc.invalidateQueries({ queryKey: ["whatsapp", "log"] });
    },
  });
};

export const useConfirmWhatsAppSent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: wa.confirmSent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp", "worklist"] });
      qc.invalidateQueries({ queryKey: ["whatsapp", "log"] });
    },
  });
};

export const useWhatsAppLog = (filters: { customer_id?: number; invoice_id?: number; template_key?: TemplateKey; limit?: number; offset?: number }) =>
  useQuery({
    queryKey: WA_KEYS.log(filters),
    queryFn: () => wa.fetchLog(filters),
    staleTime: 15 * 1000,
    placeholderData: keepPreviousData,
  });

export const useWhatsAppTemplates = () => useQuery({ queryKey: WA_KEYS.templates, queryFn: wa.fetchTemplates, staleTime: 5 * 60 * 1000 });

export const useSaveWhatsAppTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: wa.saveTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WA_KEYS.templates });
      qc.invalidateQueries({ queryKey: ["whatsapp", "worklist"] });
    },
  });
};

export const useResetWhatsAppTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: wa.resetTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WA_KEYS.templates });
      qc.invalidateQueries({ queryKey: ["whatsapp", "worklist"] });
    },
  });
};

export const useWhatsAppSettings = () => useQuery({ queryKey: WA_KEYS.settings, queryFn: wa.fetchSettings, staleTime: 5 * 60 * 1000 });

export const useUpdateWhatsAppSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: wa.updateSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WA_KEYS.settings });
      qc.invalidateQueries({ queryKey: ["whatsapp", "worklist"] });
    },
  });
};

export const useSetWhatsAppOptOut = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: wa.setOptOut,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp", "worklist"] });
      qc.invalidateQueries({ queryKey: ["whatsapp", "compose"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};
