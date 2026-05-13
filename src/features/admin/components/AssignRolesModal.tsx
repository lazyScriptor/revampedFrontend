import { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Checkbox, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Typography, Box, Chip, Alert, CircularProgress,
} from "@mui/material";
import { userApi, roleApi } from "../api/admin.api";

interface Props {
  open: boolean;
  onClose: () => void;
  user: any;
  onSuccess: () => void;
}

export default function AssignRolesModal({ open, onClose, user, onSuccess }: Props) {
  const [allRoles, setAllRoles] = useState<any[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const init = async () => {
      setLoading(true);
      try {
        const rolesRes = await roleApi.getRoles(false);
        const roles = rolesRes.data.roles || [];
        setAllRoles(roles);

        // Pre-select the roles the user already has
        const currentRoleIds = new Set<number>(
          (user.Roles || []).map((r: any) => r.role_id)
        );
        setSelectedRoleIds(currentRoleIds);
      } catch (err: any) {
        setError(err.message || "Failed to load roles.");
      }
      setLoading(false);
    };
    init();
  }, [open, user]);

  const handleToggle = (roleId: number) => {
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
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Assign Roles to {user?.username}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Select the roles you want to assign. Uncheck to remove.
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <List dense>
            {allRoles.map((role) => (
              <ListItem key={role.role_id} disablePadding>
                <ListItemButton onClick={() => handleToggle(role.role_id)} dense>
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={selectedRoleIds.has(role.role_id)}
                      tabIndex={-1}
                      disableRipple
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={role.role_name}
                    secondary={role.description || `Hierarchy Level: ${role.hierarchy_level}`}
                  />
                  {role.is_system_default ? (
                    <Chip label="System" size="small" color="warning" variant="outlined" />
                  ) : null}
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || loading}>
          {saving ? "Saving..." : "Save Roles"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
