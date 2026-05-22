import { useRef, useState } from "react";
import { Avatar, Box, Button, IconButton, Tooltip, Typography, CircularProgress, Alert } from "@mui/material";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { MyProfile, resolveAvatarUrl } from "../api/me.api";
import { useDeleteAvatar, useUploadAvatar } from "../hooks/useMe";

export function AvatarBlock({ profile }: { profile: MyProfile }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useUploadAvatar();
  const remove = useDeleteAvatar();

  const avatarUrl = resolveAvatarUrl(profile.avatar_url);
  const initials = `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase()
    || profile.username?.[0]?.toUpperCase()
    || "U";

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      await upload.mutateAsync(file);
    } catch (err: any) {
      setError(err?.message || "Avatar upload failed.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onRemove = async () => {
    setError(null);
    try {
      await remove.mutateAsync();
    } catch (err: any) {
      setError(err?.message || "Failed to remove avatar.");
    }
  };

  const busy = upload.isPending || remove.isPending;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
      <Box sx={{ position: "relative" }}>
        <Avatar
          src={avatarUrl || undefined}
          sx={{
            width: 96,
            height: 96,
            fontSize: "2rem",
            fontWeight: 800,
            bgcolor: "primary.main",
            border: "3px solid white",
            boxShadow: "0 4px 16px rgba(15,23,42,0.12)",
          }}
        >
          {initials}
        </Avatar>
        <Tooltip title="Change photo">
          <IconButton
            size="small"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            sx={{
              position: "absolute",
              right: -4,
              bottom: -4,
              bgcolor: "primary.main",
              color: "white",
              border: "2px solid white",
              "&:hover": { bgcolor: "primary.dark" },
            }}
          >
            {busy ? (
              <CircularProgress size={14} sx={{ color: "white" }} />
            ) : (
              <CameraAltIcon sx={{ fontSize: 16 }} />
            )}
          </IconButton>
        </Tooltip>
        <input
          ref={inputRef}
          type="file"
          hidden
          accept="image/*"
          onChange={onPick}
        />
      </Box>

      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a" }}>
          {profile.first_name} {profile.last_name}
        </Typography>
        <Typography variant="body2" sx={{ color: "#475569" }}>
          {profile.job_title || "—"} · @{profile.username}
        </Typography>
        <Typography variant="caption" sx={{ color: "#64748b" }}>
          {profile.email}
        </Typography>

        <Box sx={{ display: "flex", gap: 1, mt: 1.5, flexWrap: "wrap" }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            Upload photo
          </Button>
          {profile.avatar_url && (
            <Button
              size="small"
              variant="text"
              color="error"
              startIcon={<DeleteOutlineIcon />}
              onClick={onRemove}
              disabled={busy}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              Remove
            </Button>
          )}
        </Box>
        {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
      </Box>
    </Box>
  );
}
