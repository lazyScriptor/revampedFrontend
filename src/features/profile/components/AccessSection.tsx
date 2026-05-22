import { Box, Paper, Typography, Chip, Divider } from "@mui/material";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import KeyIcon from "@mui/icons-material/Key";
import { MyProfile } from "../api/me.api";

export function AccessSection({ profile }: { profile: MyProfile }) {
  const roles = profile.Roles || [];
  const permissions = profile.permissions || [];

  // Group permissions by their entity prefix ("invoice:edit" → "invoice")
  const grouped = permissions.reduce<Record<string, string[]>>((acc, code) => {
    const key = code.includes(":") ? code.split(":")[0] : "general";
    acc[key] = acc[key] || [];
    acc[key].push(code);
    return acc;
  }, {});
  const groups = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      <Paper
        elevation={0}
        sx={{ p: 3, border: "1px solid #e2e8f0", borderRadius: 2.5, bgcolor: "white" }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          <VerifiedUserIcon color="primary" />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0f172a" }}>
              Your roles
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Assigned by an administrator. Contact admin to change.
            </Typography>
          </Box>
        </Box>
        {roles.length === 0 ? (
          <Typography variant="body2" sx={{ color: "#94a3b8" }}>
            No roles assigned.
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {roles.map((r) => (
              <Chip
                key={r.role_id}
                label={`${r.role_name} · L${r.hierarchy_level}`}
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 700 }}
              />
            ))}
          </Box>
        )}
      </Paper>

      <Paper
        elevation={0}
        sx={{ p: 3, border: "1px solid #e2e8f0", borderRadius: 2.5, bgcolor: "white" }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          <KeyIcon color="primary" />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0f172a" }}>
              Effective permissions ({permissions.length})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Computed from your roles + per-user overrides.
            </Typography>
          </Box>
        </Box>
        {permissions.length === 0 ? (
          <Typography variant="body2" sx={{ color: "#94a3b8" }}>
            No permissions assigned.
          </Typography>
        ) : (
          <Box>
            {groups.map(([group, codes], i) => (
              <Box key={group}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 800,
                    letterSpacing: 1.2,
                    color: "#475569",
                    textTransform: "uppercase",
                    display: "block",
                    mb: 0.5,
                    mt: i === 0 ? 0 : 1.5,
                  }}
                >
                  {group}
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {codes.sort().map((c) => (
                    <Chip
                      key={c}
                      label={c}
                      size="small"
                      sx={{
                        bgcolor: "#f1f5f9",
                        color: "#0f172a",
                        fontWeight: 600,
                        fontSize: "0.7rem",
                      }}
                    />
                  ))}
                </Box>
                {i < groups.length - 1 && <Divider sx={{ mt: 1.25 }} />}
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
}
