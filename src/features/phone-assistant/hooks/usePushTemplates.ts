import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPushTemplates,
  previewPushTemplate,
  resetPushTemplate,
  savePushTemplate,
  sendPushTemplateTest,
  type PushTemplate,
} from "../api/phoneAssistantApi";

export const pushTemplateKeys = { all: ["phone-assistant", "push-templates"] as const };

export function usePushTemplates(enabled = true) {
  return useQuery({
    queryKey: pushTemplateKeys.all,
    queryFn: () => getPushTemplates(),
    enabled,
    staleTime: 30_000,
  });
}

export function useSavePushTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      eventKey: string;
      language: PushTemplate["language"];
      body: { title: string; body: string; title_private?: string | null; body_private?: string | null };
    }) => savePushTemplate(vars.eventKey, vars.language, vars.body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pushTemplateKeys.all }),
  });
}

export function useResetPushTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { eventKey: string; language: PushTemplate["language"] }) =>
      resetPushTemplate(vars.eventKey, vars.language),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pushTemplateKeys.all }),
  });
}

export function usePreviewPushTemplate() {
  return useMutation({ mutationFn: previewPushTemplate });
}

export function useSendPushTemplateTest() {
  return useMutation({ mutationFn: sendPushTemplateTest });
}
