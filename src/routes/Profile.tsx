import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
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
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useMyProfile } from "@/features/profile/hooks/useMe";
import { AvatarBlock } from "@/features/profile/components/AvatarBlock";
import { ProfileForm } from "@/features/profile/components/ProfileForm";
import { SecuritySection } from "@/features/profile/components/SecuritySection";
import { PreferencesSection } from "@/features/profile/components/PreferencesSection";
import { NotificationsSection } from "@/features/profile/components/NotificationsSection";
import { ActivitySection } from "@/features/profile/components/ActivitySection";
import { AccessSection } from "@/features/profile/components/AccessSection";

const buildTabs = (t: (k: string) => string) => [
  { key: "profile",       label: t("profile.tabs.profile"),       icon: <PersonIcon fontSize="small" /> },
  { key: "security",      label: t("profile.tabs.security"),      icon: <LockResetIcon fontSize="small" /> },
  { key: "preferences",   label: t("profile.tabs.preferences"),   icon: <TuneIcon fontSize="small" /> },
  { key: "notifications", label: t("profile.tabs.notifications"), icon: <NotificationsActiveIcon fontSize="small" /> },
  { key: "activity",      label: t("profile.tabs.activity"),      icon: <TimelineIcon fontSize="small" /> },
  { key: "access",        label: t("profile.tabs.access"),        icon: <VerifiedUserIcon fontSize="small" /> },
] as const;

type TabKey = "profile" | "security" | "preferences" | "notifications" | "activity" | "access";

export default function ProfileRoute() {
  const { t } = useTranslation();
  const TABS = buildTabs(t);
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { tab?: TabKey };
  const me = useMyProfile();

  const activeKey: TabKey = useMemo(() => {
    const requested = search.tab;
    if (requested && TABS.some((tb) => tb.key === requested)) return requested;
    return "profile";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.tab]);

  const activeIdx = TABS.findIndex((tb) => tb.key === activeKey);

  const handleTabChange = (_: any, idx: number) => {
    navigate({
      to: "/profile",
      search: { tab: TABS[idx].key } as any,
      replace: true,
    });
  };

  if (me.isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (me.isError || !me.data) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        Failed to load profile.{" "}
        {(me.error as any)?.message || "Please try again."}
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
          Account
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
      {activeKey === "preferences"   && <PreferencesSection   profile={profile} />}
      {activeKey === "notifications" && <NotificationsSection profile={profile} />}
      {activeKey === "activity"      && <ActivitySection />}
      {activeKey === "access"        && <AccessSection        profile={profile} />}
    </Box>
  );
}
