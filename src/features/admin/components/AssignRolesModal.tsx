import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
  FormDialogShell,
  FormFooterMeta,
  FormSection,
} from "@/components/forms/FormDialogShell";
import { userApi, roleApi } from "../api/admin.api";

interface Props {
  open: boolean;
  onClose: () => void;
  user: any;
  onSuccess: () => void;
}

export default function AssignRolesModal({ open, onClose, user, onSuccess }: Props) {
  const theme = useTheme();
  const [allRoles, setAllRoles] = useState<any[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<number>>(new Set());
  const [initialIds, setInitialIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        const rolesRes = await roleApi.getRoles(false);
        const roles = rolesRes.data.roles || [];
        setAllRoles(roles);
        const currentRoleIds = new Set<number>(
          (user.Roles || []).map((r: any) => r.role_id),
        );
        setSelectedRoleIds(currentRoleIds);
        setInitialIds(currentRoleIds);
      } catch (err: any) {
        setError(err.message || "Failed to load roles.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [open, user]);

  const toggle = (roleId: number) => {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await userApi.assignRoles(user.user_id, Array.from(selectedRoleIds));
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to assign roles.");
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.first_name
    ? `${user.first_name[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase()
    : user?.username?.[0]?.toUpperCase() || "U";

  const dirty =
    selectedRoleIds.size !== initialIds.size ||
    Array.from(selectedRoleIds).some((id) => !initialIds.has(id));

  return (
    <FormDialogShell
      open={open}
      onClose={onClose}
      maxWidth="sm"
      eyebrow="Assign Roles"
      title={user?.username || "User"}
      subtitle="Toggle the roles that govern this user's permissions."
      avatarText={initials}
      footer={
        <>
          <FormFooterMeta>
            {dirty && !saving && !error
              ? `${selectedRoleIds.size} role${selectedRoleIds.size === 1 ? "" : "s"} selected`
              : ""}
          </FormFooterMeta>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button onClick={onClose} disabled={saving} color="inherit">
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving || loading || !dirty}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {saving ? "Saving…" : "Save roles"}
            </Button>
          </Box>
        </>
      }
    >
      {error && (
        <Alert severity="error" variant="outlined" icon={<WarningAmberIcon />}>
          {error}
        </Alert>
      )}

      <FormSection
        icon={<VerifiedUserIcon />}
        title="Available roles"
        hint="Selected roles will be granted; unchecked roles will be removed."
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={20} />
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            {allRoles.map((role) => {
              const selected = selectedRoleIds.has(role.role_id);
              return (
                <Box
                  key={role.role_id}
                  onClick={() => toggle(role.role_id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggle(role.role_id);
                    }
                  }}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    p: 1.25,
                    borderRadius: 1.5,
                    cursor: "pointer",
                    bgcolor: selected
                      ? alpha(theme.palette.primary.main, 0.06)
                      : "transparent",
                    border: `1px solid ${selected ? alpha(theme.palette.primary.main, 0.4) : theme.palette.border.subtle}`,
                    transition: "border-color 150ms, background-color 150ms",
                    "&:hover": {
                      borderColor: theme.palette.border.strong,
                    },
                  }}
                >
                  <Checkbox
                    checked={selected}
                    size="small"
                    sx={{ p: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggle(role.role_id)}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                      {role.role_name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                      {role.description || `Hierarchy level ${role.hierarchy_level}`}
                    </Typography>
                  </Box>
                  {role.is_system_default && (
                    <Chip
                      label="System"
                      size="small"
                      color="warning"
                      sx={{ height: 20, fontSize: 10 }}
                    />
                  )}
                </Box>
              );
            })}
          </Box>
        )}
      </FormSection>
    </FormDialogShell>
  );
}
