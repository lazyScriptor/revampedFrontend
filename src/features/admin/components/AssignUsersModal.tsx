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
  role: any;
  onSuccess: () => void;
}

export default function AssignUsersModal({ open, onClose, role, onSuccess }: Props) {
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const init = async () => {
      setLoading(true);
      try {
        // Fetch all active users
        const usersRes = await userApi.getUsers(false);
        const users = usersRes.data.users || [];
        setAllUsers(users);

        // Fetch users currently assigned to this role
        const roleUsersRes = await roleApi.getUsersForRole(role.role_id);
        const assignedUsers = roleUsersRes.data.users || [];
        const currentUserIds = new Set<number>(
          assignedUsers.map((u: any) => u.user_id)
        );
        setSelectedUserIds(currentUserIds);
      } catch (err: any) {
        setError(err.message || "Failed to load users.");
      }
      setLoading(false);
    };
    init();
  }, [open, role]);

  const handleToggle = (userId: number) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedUserIds.size === allUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(allUsers.map((u) => u.user_id)));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await roleApi.assignUsers(role.role_id, Array.from(selectedUserIds));
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to assign users.");
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Assign Users to "{role?.role_name}"
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Select users to add to this role. Uncheck to remove.
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2" color="text.secondary">
                {selectedUserIds.size} of {allUsers.length} users selected
              </Typography>
              <Button size="small" onClick={handleSelectAll}>
                {selectedUserIds.size === allUsers.length ? "Deselect All" : "Select All"}
              </Button>
            </Box>
            <List dense sx={{ maxHeight: 400, overflow: "auto" }}>
              {allUsers.map((user) => (
                <ListItem key={user.user_id} disablePadding>
                  <ListItemButton onClick={() => handleToggle(user.user_id)} dense>
                    <ListItemIcon>
                      <Checkbox
                        edge="start"
                        checked={selectedUserIds.has(user.user_id)}
                        tabIndex={-1}
                        disableRipple
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username}
                      secondary={user.email}
                    />
                    {!user.is_active && (
                      <Chip label="Inactive" size="small" color="default" />
                    )}
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || loading}>
          {saving ? "Saving..." : "Save Users"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
