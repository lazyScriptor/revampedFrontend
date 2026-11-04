// What this shop's plan includes. The server refuses anything outside the plan; this keeps the app
// from offering it. With no plan known (just logged in, or the server couldn't say) nothing is
// hidden, so a hiccup here can never lock a shop out of a screen the server would allow.
import { useEffect } from "react";
import type { ReactNode } from "react";
import { Box, Paper, Typography } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { api } from "@/lib/api";
import { useAuthStore, type TenantPlan } from "@/stores/useAuthStore";
import type { PaymentNoticeData } from "./paymentNoticeText";

export type FeatureKeys = string | readonly string[];

/** True when the plan is unknown, or includes any of the keys. */
export const planAllows = (plan: TenantPlan | null | undefined, keys: FeatureKeys) => {
  if (!plan) return true;
  return (typeof keys === "string" ? [keys] : keys).some((k) => plan.features?.[k] !== false);
};

export const usePlanChecker = () => {
  const plan = useAuthStore((s) => s.user?.plan);
  return (keys: FeatureKeys) => planAllows(plan, keys);
};

/** For the menu: nothing plan-limited shows until the plan is known, so it never appears and vanishes. */
export const useMenuPlanChecker = () => {
  const plan = useAuthStore((s) => s.user?.plan);
  return (keys: FeatureKeys) => plan !== undefined && planAllows(plan, keys);
};

export const useFeature = (keys: FeatureKeys) => planAllows(useAuthStore((s) => s.user?.plan), keys);

/** Keeps the plan current while the app is open, so a console change shows up without logging in again. */
export function PlanSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const updateUserPartial = useAuthStore((s) => s.updateUserPartial);
  const { data, isError } = useQuery({
    queryKey: ["my-plan"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const body: any = await api.get("/me/plan");
      return { plan: (body?.data?.plan ?? null) as TenantPlan | null, notice: (body?.data?.notice ?? null) as PaymentNoticeData | null };
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
  useEffect(() => {
    if (!data) return;
    const user = useAuthStore.getState().user;
    if (JSON.stringify(user?.plan) !== JSON.stringify(data.plan)) updateUserPartial({ plan: data.plan });
    if (JSON.stringify(user?.paymentNotice ?? null) !== JSON.stringify(data.notice)) updateUserPartial({ paymentNotice: data.notice });
  }, [data, updateUserPartial]);
  // Couldn't ask: show the menu rather than leave it empty. The server still enforces the plan.
  useEffect(() => {
    if (isError && useAuthStore.getState().user?.plan === undefined) updateUserPartial({ plan: null });
  }, [isError, updateUserPartial]);
  return null;
}

export function FeatureLocked() {
  const { t } = useTranslation();
  const tier = useAuthStore((s) => s.user?.plan?.tier);
  return (
    <Paper variant="outlined" sx={{ p: 4, borderRadius: 3, textAlign: "center", maxWidth: 520, mx: "auto", mt: 4 }}>
      <Box sx={{ width: 48, height: 48, borderRadius: "50%", bgcolor: "action.hover", display: "inline-flex", alignItems: "center", justifyContent: "center", mb: 1.5 }}>
        <LockOutlinedIcon color="action" />
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>
        {t("plan.lockedTitle")}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {t("plan.lockedBody", { tier: tier ?? "" })}
      </Typography>
    </Paper>
  );
}

export function FeatureGate({ feature, children }: { feature: FeatureKeys; children: ReactNode }) {
  return useFeature(feature) ? <>{children}</> : <FeatureLocked />;
}
