import { useMemo, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Button,
  Tabs,
  Tab,
  Typography,
  Paper,
  CircularProgress,
  Alert,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import LockResetIcon from "@mui/icons-material/LockReset";
import TuneIcon from "@mui/icons-material/Tune";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import TimelineIcon from "@mui/icons-material/Timeline";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import DrawIcon from "@mui/icons-material/Draw";
import PhoneAndroidOutlinedIcon from "@mui/icons-material/PhoneAndroidOutlined";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { useMyProfile } from "@/features/profile/hooks/useMe";
import { AvatarBlock } from "@/features/profile/components/AvatarBlock";
import { ProfileForm } from "@/features/profile/components/ProfileForm";
import { SecuritySection } from "@/features/profile/components/SecuritySection";
import { PreferencesSection } from "@/features/profile/components/PreferencesSection";
import { NotificationsSection } from "@/features/profile/components/NotificationsSection";
import { ActivitySection } from "@/features/profile/components/ActivitySection";
import { AccessSection } from "@/features/profile/components/AccessSection";
import { SignatureSection } from "@/features/profile/components/SignatureSection";
import { GearGridLoader } from "@/components/ui/GearGridLoader";
import { usePlanChecker } from "@/features/plan/usePlan";
import { DesktopPopupSizeCard } from "@/features/phone-assistant/components/DesktopPopupSizeCard";
import { MyPushPreferences } from "@/features/phone-assistant/components/MyPushPreferences";

/** Every Profile tab. The router validates `?tab=` against this list, so add new tabs here. */
export const PROFILE_TAB_KEYS = [
  "profile",
  "security",
  "signature",
  "phones",
  "preferences",
  "notifications",
  "activity",
  "access",
] as const;

type TabKey = (typeof PROFILE_TAB_KEYS)[number];

const buildTabs = (t: (k: string) => string, showPhonesConsole: boolean) => {
  const tabs: Array<{ key: TabKey; label: string; icon: ReactElement }> = [
    { key: "profile",       label: t("profile.tabs.profile"),       icon: <PersonIcon fontSize="small" /> },
    { key: "security",      label: t("profile.tabs.security"),      icon: <LockResetIcon fontSize="small" /> },
    { key: "signature",     label: t("profile.tabs.signature"),     icon: <DrawIcon fontSize="small" /> },
    ...(showPhonesConsole
      ? [{ key: "phones" as const, label: t("profile.tabs.phones"), icon: <PhoneAndroidOutlinedIcon fontSize="small" /> }]
      : []),
    { key: "preferences",   label: t("profile.tabs.preferences"),   icon: <TuneIcon fontSize="small" /> },
    { key: "notifications", label: t("profile.tabs.notifications"), icon: <NotificationsActiveIcon fontSize="small" /> },
    { key: "activity",      label: t("profile.tabs.activity"),      icon: <TimelineIcon fontSize="small" /> },
    { key: "access",        label: t("profile.tabs.access"),        icon: <VerifiedUserIcon fontSize="small" /> },
  ];
  return tabs;
};

export default function ProfileRoute() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { tab?: TabKey };
  const me = useMyProfile();
  const canPlan = usePlanChecker();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const hasPhoneAssistant = canPlan("phone_assistant");
  const isAdmin = Boolean(
    me.data && (me.data.Roles ?? []).some((r) => Number(r.hierarchy_level) >= 100),
  );
  const canManagePhones = hasPhoneAssistant && (isAdmin || hasPermission("devices:manage"));
  const TABS = buildTabs(t, canManagePhones);

  const activeKey: TabKey = useMemo(() => {
    const requested = search.tab;
    if (requested && TABS.some((tb) => tb.key === requested)) return requested;
    return "profile";
  }, [search.tab, TABS]);

  const activeIdx = Math.max(0, TABS.findIndex((tb) => tb.key === activeKey));

  const handleTabChange = (_: any, idx: number) => {
    navigate({
      to: "/profile",
      search: { tab: TABS[idx].key } as any,
      replace: true,
    });
  };

  if (me.isLoading) {
    return (
      <GearGridLoader centered size="lg" label={t("pages.Profile.loadingUserProfile")} sublabel={t("pages.Profile.fetchingSecurityCredentialsOrganizationP")} sx={{ py: 10 }} />
    );
  }

  if (me.isError || !me.data) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        {t("profile.loadFailed")}{" "}
        {(me.error as any)?.message || t("profile.tryAgain")}
      </Alert>
    );
  }

  const profile = me.data;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pb: 4 }}>
      {/* Header card with avatar + identity */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          border: "1px solid #e2e8f0",
          borderRadius: 2.5,
          bgcolor: "white",
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            color: "#64748b",
            display: "block",
            mb: 1.5,
          }}
        >
          {t("admin.UserFormDrawer.account")}
        </Typography>
        <AvatarBlock profile={profile} />
      </Paper>

      {/* Tab strip */}
      <Box sx={{ borderBottom: "1px solid #e2e8f0", bgcolor: "white", borderRadius: 2 }}>
        <Tabs
          value={activeIdx}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 700,
              minHeight: 56,
              fontSize: "0.9rem",
            },
            "& .MuiTabs-indicator": { height: 3, borderRadius: "3px 3px 0 0" },
          }}
        >
          {TABS.map((tab) => (
            <Tab key={tab.key} icon={tab.icon as any} iconPosition="start" label={tab.label} />
          ))}
        </Tabs>
      </Box>

      {/* Active tab content */}
      {activeKey === "profile" && (
        <Paper
          elevation={0}
          sx={{ p: 3, border: "1px solid #e2e8f0", borderRadius: 2.5, bgcolor: "white" }}
        >
          <ProfileForm profile={profile} />
        </Paper>
      )}
      {activeKey === "security"      && <SecuritySection      profile={profile} />}
      {activeKey === "signature"     && <SignatureSection     profile={profile} />}
      {activeKey === "phones"        && canManagePhones && (
        <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: "divider", borderRadius: 2.5, bgcolor: "background.paper" }}>
          <Typography sx={{ fontWeight: 800 }}>{t("phoneAssistant.settings.movedTitle")}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t("phoneAssistant.settings.movedBody")}</Typography>
          <Button variant="contained" onClick={() => navigate({ to: "/settings/phone-assistant", search: {} as any })}>
            {t("phoneAssistant.settings.openSettings")}
          </Button>
        </Paper>
      )}
      {activeKey === "preferences"   && <PreferencesSection   profile={profile} />}
      {activeKey === "notifications" && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <NotificationsSection profile={profile} />
          {hasPhoneAssistant && <MyPushPreferences />}
          {hasPhoneAssistant && <DesktopPopupSizeCard />}
          {hasPhoneAssistant && isAdmin && (
            <Button variant="outlined" onClick={() => navigate({ to: "/settings/phone-assistant", search: { tab: "notifications" } as any })} sx={{ alignSelf: "flex-start" }}>
              {t("phoneAssistant.settings.openShopNotifications")}
            </Button>
          )}
        </Box>
      )}
      {activeKey === "activity"      && <ActivitySection />}
      {activeKey === "access"        && <AccessSection        profile={profile} />}
    </Box>
  );
}
