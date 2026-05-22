import { useRef, useState } from "react";
import {
  Avatar,
  Box,
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
import { useNavigate } from "@tanstack/react-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { resolveAvatarUrl } from "@/features/profile/api/me.api";

export function AppBarUserMenu() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);

  if (!user) return null;

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
          <ListItemText>My profile</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => go("/profile", { tab: "security" })}>
          <ListItemIcon>
            <LockResetIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Change password</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => go("/profile", { tab: "preferences" })}>
          <ListItemIcon>
            <TuneIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Preferences</ListItemText>
        </MenuItem>

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
          <ListItemText>Sign out</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
