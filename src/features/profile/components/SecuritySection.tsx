import { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Stack,
  InputAdornment,
  IconButton,
  Tooltip,
} from "@mui/material";
import LockResetIcon from "@mui/icons-material/LockReset";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { MyProfile } from "../api/me.api";
import { useChangePassword } from "../hooks/useMe";
import { formatDisplayDate } from "@/lib/dates";

const PasswordField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => {
  const [show, setShow] = useState(false);
  return (
    <TextField
      label={label}
      type={show ? "text" : "password"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      size="small"
      fullWidth
      autoComplete="new-password"
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton onClick={() => setShow((s) => !s)} edge="end" size="small">
              {show ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
};

export function SecuritySection({ profile }: { profile: MyProfile }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const change = useChangePassword();

  const strength = (() => {
    if (!next) return { score: 0, label: "", color: "#cbd5e1" };
    let score = 0;
    if (next.length >= 8) score += 1;
    if (next.length >= 12) score += 1;
    if (/[A-Z]/.test(next) && /[a-z]/.test(next)) score += 1;
    if (/\d/.test(next)) score += 1;
    if (/[^A-Za-z0-9]/.test(next)) score += 1;
    if (score <= 1) return { score, label: "Weak", color: "#ef4444" };
    if (score <= 3) return { score, label: "Okay", color: "#f59e0b" };
    return { score, label: "Strong", color: "#16a34a" };
  })();

  const handleSubmit = async () => {
    setError(null);
    setSaved(false);
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    if (current === next) {
      setError("New password must differ from the current one.");
      return;
    }
    try {
      await change.mutateAsync({ currentPassword: current, newPassword: next });
      setSaved(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err: any) {
      setError(err?.message || "Password change failed.");
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Password card */}
      <Paper
        elevation={0}
        sx={{ p: 3, border: "1px solid #e2e8f0", borderRadius: 2.5, bgcolor: "white" }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          <LockResetIcon color="primary" />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0f172a" }}>
              Change password
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {profile.password_changed_at
                ? `Last changed ${formatDisplayDate(profile.password_changed_at.slice(0, 10))}`
                : "Password has never been changed since this account was created."}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <PasswordField label="Current password" value={current} onChange={setCurrent} />
          <PasswordField label="New password" value={next} onChange={setNext} />
          {next && (
            <Box>
              <Box
                sx={{
                  height: 6,
                  borderRadius: 99,
                  bgcolor: "#e2e8f0",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    width: `${(strength.score / 5) * 100}%`,
                    bgcolor: strength.color,
                    transition: "width 0.2s",
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ color: strength.color, fontWeight: 700 }}>
                {strength.label}
              </Typography>
            </Box>
          )}
          <PasswordField label="Confirm new password" value={confirm} onChange={setConfirm} />

          {error && <Alert severity="error">{error}</Alert>}
          {saved && <Alert severity="success">Password updated.</Alert>}

          <Stack direction="row" justifyContent="flex-end">
            <Button
              variant="contained"
              disableElevation
              onClick={handleSubmit}
              disabled={change.isPending || !current || !next || !confirm}
              startIcon={
                change.isPending ? (
                  <CircularProgress size={14} sx={{ color: "white" }} />
                ) : (
                  <LockResetIcon />
                )
              }
              sx={{ fontWeight: 800 }}
            >
              {change.isPending ? "Updating…" : "Update password"}
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* Session info */}
      <Paper
        elevation={0}
        sx={{ p: 3, border: "1px solid #e2e8f0", borderRadius: 2.5, bgcolor: "white" }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0f172a", mb: 2 }}>
          Sign-in activity
        </Typography>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Last sign-in</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {profile.last_login_at
                ? new Date(profile.last_login_at).toLocaleString()
                : "This is your first sign-in"}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">IP address</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {profile.last_login_ip || "—"}
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
