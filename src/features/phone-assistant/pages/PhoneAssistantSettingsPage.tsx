import { useMemo, type ReactElement } from "react";
import { Alert, Box, Tab, Tabs, Typography } from "@mui/material";
import PhoneAndroidOutlinedIcon from "@mui/icons-material/PhoneAndroidOutlined";
import PhonelinkRingOutlinedIcon from "@mui/icons-material/PhonelinkRingOutlined";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import TranslateOutlinedIcon from "@mui/icons-material/TranslateOutlined";
import ContactPhoneOutlinedIcon from "@mui/icons-material/ContactPhoneOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import SyncLockOutlinedIcon from "@mui/icons-material/SyncLockOutlined";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useMyProfile } from "@/features/profile/hooks/useMe";
import { useAuthStore } from "@/stores/useAuthStore";
import { usePlanChecker } from "@/features/plan/usePlan";
import { DeviceConsolePage } from "./DeviceConsolePage";
import { CallScreenDesigner } from "../components/CallScreenDesigner";
import { PushSettingsPanel } from "../components/PushSettingsPanel";
import { NotificationLanguagePanel } from "../components/NotificationLanguagePanel";
import { ApprovalsPanel, ContactsCallsPanel, SyncPrivacyPanel } from "../components/PolicyTabs";

export const PHONE_SETTINGS_TABS = [
  "phones",
  "call-screen",
  "notifications",
  "languages",
  "contacts-calls",
  "approvals",
  "sync-privacy",
] as const;
export type PhoneSettingsTab = (typeof PHONE_SETTINGS_TABS)[number];

const ICONS: Record<PhoneSettingsTab, ReactElement> = {
  phones: <PhoneAndroidOutlinedIcon fontSize="small" />,
  "call-screen": <PhonelinkRingOutlinedIcon fontSize="small" />,
  notifications: <NotificationsActiveOutlinedIcon fontSize="small" />,
  languages: <TranslateOutlinedIcon fontSize="small" />,
  "contacts-calls": <ContactPhoneOutlinedIcon fontSize="small" />,
  approvals: <FactCheckOutlinedIcon fontSize="small" />,
  "sync-privacy": <SyncLockOutlinedIcon fontSize="small" />,
};

/** One place for every phone-assistant setting. Tabs scroll sideways on a phone-width screen. */
export default function PhoneAssistantSettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { tab?: PhoneSettingsTab };
  const me = useMyProfile();
  const canPlan = usePlanChecker();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const isAdmin = Boolean(me.data && (me.data.Roles ?? []).some((r) => Number(r.hierarchy_level) >= 100));
  const hasFeature = canPlan("phone_assistant");
  const canManage = hasFeature && (isAdmin || hasPermission("devices:manage"));

  // Only administrators change shop policy; devices:manage holders see the Phones tab alone.
  const visibleTabs = useMemo<PhoneSettingsTab[]>(
    () => (isAdmin ? [...PHONE_SETTINGS_TABS] : ["phones"]),
    [isAdmin],
  );
  const active: PhoneSettingsTab =
    search.tab && visibleTabs.includes(search.tab) ? search.tab : "phones";

  if (me.isLoading) return null;
  if (!canManage) {
    return <Alert severity="info">{t("phoneAssistant.settings.noAccess")}</Alert>;
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pb: 4, minWidth: 0 }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>{t("phoneAssistant.settings.pageTitle")}</Typography>
        <Typography variant="body2" color="text.secondary">{t("phoneAssistant.settings.pageSubtitle")}</Typography>
      </Box>
      <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper", borderRadius: 2 }}>
        <Tabs
          value={visibleTabs.indexOf(active)}
          onChange={(_e, idx) => navigate({ to: "/settings/phone-assistant", search: { tab: visibleTabs[idx] } as any, replace: true })}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          aria-label={t("phoneAssistant.settings.pageTitle")}
          sx={{ "& .MuiTab-root": { textTransform: "none", fontWeight: 700, minHeight: 52 } }}
        >
          {visibleTabs.map((key) => (
            <Tab key={key} icon={ICONS[key]} iconPosition="start" label={t(`phoneAssistant.settings.tab_${key.replace("-", "_")}`)} />
          ))}
        </Tabs>
      </Box>
      {active === "phones" && <DeviceConsolePage canManagePolicy={isAdmin} />}
      {active === "call-screen" && <CallScreenDesigner />}
      {active === "notifications" && <PushSettingsPanel />}
      {active === "languages" && <NotificationLanguagePanel />}
      {active === "contacts-calls" && <ContactsCallsPanel />}
      {active === "approvals" && <ApprovalsPanel />}
      {active === "sync-privacy" && <SyncPrivacyPanel />}
    </Box>
  );
}
