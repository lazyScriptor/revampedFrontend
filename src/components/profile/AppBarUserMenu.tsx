import { useRef, useState } from "react";
import {
  Avatar,
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Typography,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import LockResetIcon from "@mui/icons-material/LockReset";
import TuneIcon from "@mui/icons-material/Tune";
import LogoutIcon from "@mui/icons-material/Logout";
import LanguageIcon from "@mui/icons-material/Language";
import CheckIcon from "@mui/icons-material/Check";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/useAuthStore";
import { resolveAvatarUrl } from "@/features/profile/api/me.api";
import { changeLanguage, SUPPORTED_LANGUAGES } from "@/i18n";
import { api } from "@/lib/api";

const LANG_LABELS: Record<string, { native: string; english: string }> = {
  en: { native: "English", english: "English" },
  si: { native: "සිංහල", english: "Sinhala" },
};

export function AppBarUserMenu() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const updateUserPartial = useAuthStore((s) => s.updateUserPartial);
  const logout = useAuthStore((s) => s.logout);
  const { t, i18n } = useTranslation();

  const [open, setOpen] = useState(false);
  const [langAnchor, setLangAnchor] = useState<null | HTMLElement>(null);
  const anchorRef = useRef<HTMLButtonElement | null>(null);

  if (!user) return null;

  const handleChangeLanguage = async (lng: string) => {
    setLangAnchor(null);
    setOpen(false);
    await changeLanguage(lng as any);
    updateUserPartial({ language: lng });
    // Persist to backend so it follows the user across devices. Fire-and-forget
    // — the local change has already taken effect.
    api.patch("/me/preferences", { language: lng }).catch(() => {});
  };

  const initials =
    `${(user.first_name as string)?.[0] || ""}${(user.last_name as string)?.[0] || ""}`.toUpperCase() ||
    user.username?.[0]?.toUpperCase() ||
    "U";

  const avatarUrl = resolveAvatarUrl(user.avatar_url || null);

  const go = (to: string, search?: Record<string, string>) => {
    setOpen(false);
    navigate({ to: to as any, search: (search || {}) as any });
  };

  return (
    <>
      <IconButton
        ref={anchorRef}
        onClick={() => setOpen((v) => !v)}
        size="small"
        sx={{ p: 0 }}
      >
        <Avatar
          src={avatarUrl || undefined}
          sx={{
            bgcolor: "primary.main",
            width: 32,
            height: 32,
            fontWeight: 700,
            fontSize: "0.85rem",
          }}
        >
          {initials}
        </Avatar>
      </IconButton>

      <Menu
        anchorEl={anchorRef.current}
        open={open}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 240,
              mt: 1,
              borderRadius: 2,
              boxShadow: "0 12px 32px rgba(15,23,42,0.18)",
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Avatar
              src={avatarUrl || undefined}
              sx={{ bgcolor: "primary.main", width: 36, height: 36, fontWeight: 700 }}
            >
              {initials}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="body2"
                noWrap
                sx={{ fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}
              >
                {user.username}
              </Typography>
              <Typography variant="caption" noWrap sx={{ color: "#64748b" }}>
                {user.email}
              </Typography>
            </Box>
          </Box>
        </Box>
        <Divider />

        <MenuItem onClick={() => go("/profile", { tab: "profile" })}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("nav.profile")}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => go("/profile", { tab: "security" })}>
          <ListItemIcon>
            <LockResetIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("forms.unsavedChanges") === "Unsaved changes" ? "Change password" : "මුරපදය වෙනස් කරන්න"}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => go("/profile", { tab: "preferences" })}>
          <ListItemIcon>
            <TuneIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("nav.settings")}</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem
          onClick={(e) => setLangAnchor(e.currentTarget)}
          sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <ListItemIcon sx={{ minWidth: "auto !important" }}>
              <LanguageIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t("language.title")}</ListItemText>
          </Box>
          <Chip
            label={LANG_LABELS[i18n.language]?.native || i18n.language.toUpperCase()}
            size="small"
            sx={{ height: 20, fontWeight: 700, fontSize: "0.66rem" }}
          />
        </MenuItem>
        <Menu
          anchorEl={langAnchor}
          open={Boolean(langAnchor)}
          onClose={() => setLangAnchor(null)}
          anchorOrigin={{ vertical: "top", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
        >
          {SUPPORTED_LANGUAGES.map((lng) => {
            const active = i18n.language === lng;
            return (
              <MenuItem
                key={lng}
                onClick={() => handleChangeLanguage(lng)}
                selected={active}
                sx={{ minWidth: 180 }}
              >
                <ListItemIcon>
                  {active ? <CheckIcon fontSize="small" color="primary" /> : <Box sx={{ width: 20 }} />}
                </ListItemIcon>
                <ListItemText
                  primary={LANG_LABELS[lng]?.native || lng}
                  secondary={LANG_LABELS[lng]?.english || ""}
                  slotProps={{
                    primary: { sx: { fontWeight: active ? 700 : 500 } },
                    secondary: { sx: { fontSize: "0.7rem" } },
                  }}
                />
              </MenuItem>
            );
          })}
        </Menu>

        <Divider />

        <MenuItem
          onClick={() => {
            setOpen(false);
            logout();
          }}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>{t("nav.logout")}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
