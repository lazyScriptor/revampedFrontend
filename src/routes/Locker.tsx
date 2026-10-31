import { Alert, Box, CircularProgress, Tab, Tabs, Typography } from "@mui/material";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";

import { useAuthStore } from "@/stores/useAuthStore";
import { useLockerStatus } from "@/features/locker/hooks/useLocker";
import { LockerToday } from "@/features/locker/components/LockerToday";
import { LockerHistory } from "@/features/locker/components/LockerHistory";
import { StartLockerPanel } from "@/features/locker/components/StartLockerPanel";

export const LOCKER_TABS = ["today", "history"] as const;
export type LockerTab = (typeof LOCKER_TABS)[number];

// Cash locker: the shop's one cash drawer. Float + cash advances for open invoices stay;
// everything else goes home each evening.
export default function LockerRoute() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { tab?: LockerTab };
  const canManage = useAuthStore((s) => s.hasPermission("locker:manage"));
  const { data: status, isLoading, isError, error } = useLockerStatus();
  const tab: LockerTab = canManage && search.tab === "history" ? "history" : "today";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pb: 4, maxWidth: 980 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: "primary.main", color: "primary.contrastText", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <PointOfSaleIcon />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
            {t("locker.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("locker.subtitle")}
          </Typography>
        </Box>
      </Box>

      {/* A failed background refresh keeps the last numbers on screen. */}
      {!status ? (
        isLoading || !isError ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Alert severity="error">{(error as any)?.message || t("locker.errors.loadFailed")}</Alert>
        )
      ) : !status.started ? (
        canManage ? (
          <StartLockerPanel />
        ) : (
          <Alert severity="info">{t("locker.notStartedStaff")}</Alert>
        )
      ) : (
        <>
          {canManage && (
            <Tabs
              value={tab}
              onChange={(_, next: LockerTab) => navigate({ to: "/locker", search: { tab: next } as any })}
              aria-label={t("locker.title")}
              sx={{ borderBottom: "1px solid", borderColor: "divider", minHeight: 44 }}
            >
              <Tab value="today" label={t("locker.tabToday")} sx={{ minHeight: 44, textTransform: "none", fontWeight: 700 }} />
              <Tab value="history" label={t("locker.tabHistory")} sx={{ minHeight: 44, textTransform: "none", fontWeight: 700 }} />
            </Tabs>
          )}
          {tab === "today" ? <LockerToday status={status} /> : <LockerHistory float={status.float} />}
        </>
      )}
    </Box>
  );
}
