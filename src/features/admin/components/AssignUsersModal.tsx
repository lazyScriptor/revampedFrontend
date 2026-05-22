import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Link,
  TextField,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutlineOutlined";
import SearchIcon from "@mui/icons-material/Search";
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
  role: any;
  onSuccess: () => void;
}

export default function AssignUsersModal({ open, onClose, role, onSuccess }: Props) {
  const theme = useTheme();
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [initialIds, setInitialIds] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        const usersRes = await userApi.getUsers(false);
        const users = usersRes.data.users || [];
        setAllUsers(users);
        const roleUsersRes = await roleApi.getUsersForRole(role.role_id);
        const assignedUsers = roleUsersRes.data.users || [];
        const currentIds = new Set<number>(assignedUsers.map((u: any) => u.user_id));
        setSelectedUserIds(currentIds);
        setInitialIds(currentIds);
      } catch (err: any) {
        setError(err.message || "Failed to load users.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [open, role]);

  const toggle = (userId: number) => {
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
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = allUsers.filter((u) => {
    if (!filter.trim()) return true;
    const q = filter.trim().toLowerCase();
    return (
      (u.first_name || "").toLowerCase().includes(q) ||
      (u.last_name || "").toLowerCase().includes(q) ||
      (u.username || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q)
    );
  });

  const dirty =
    selectedUserIds.size !== initialIds.size ||
    Array.from(selectedUserIds).some((id) => !initialIds.has(id));

  return (
    <FormDialogShell
      open={open}
      onClose={onClose}
      maxWidth="sm"
      eyebrow="Assign Users"
      title={role?.role_name || "Role"}
      subtitle="Toggle users in or out of this role."
      avatarText={(role?.role_name || "R")[0]?.toUpperCase()}
      footer={
        <>
          <FormFooterMeta>
            {dirty && !saving
              ? `${selectedUserIds.size} of ${allUsers.length} users selected`
              : `${selectedUserIds.size} assigned`}
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
              {saving ? "Saving…" : "Save users"}
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
        icon={<PeopleOutlineIcon />}
        title="Team members"
        hint={`${selectedUserIds.size} of ${allUsers.length} users selected.`}
      >
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <TextField
            placeholder="Search by name, username or email"
            size="small"
            fullWidth
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <SearchIcon sx={{ color: theme.palette.text.disabled, mr: 1, fontSize: 18 }} />
                ),
              },
            }}
          />
          <Link
            component="button"
            type="button"
            onClick={handleSelectAll}
            sx={{ flexShrink: 0, fontSize: "0.78rem", fontWeight: 700 }}
          >
            {selectedUserIds.size === allUsers.length ? "Deselect all" : "Select all"}
          </Link>
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={20} />
          </Box>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 0.5,
              maxHeight: 320,
              overflowY: "auto",
              pr: 0.5,
            }}
          >
            {filteredUsers.length === 0 ? (
              <Typography variant="body2" sx={{ color: theme.palette.text.disabled, py: 2, textAlign: "center" }}>
                No users match "{filter}"
              </Typography>
            ) : (
              filteredUsers.map((u) => {
                const selected = selectedUserIds.has(u.user_id);
                const displayName =
                  `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username;
                return (
                  <Box
                    key={u.user_id}
                    onClick={() => toggle(u.user_id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggle(u.user_id);
                      }
                    }}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      p: 1,
                      borderRadius: 1.5,
                      cursor: "pointer",
                      bgcolor: selected
                        ? alpha(theme.palette.primary.main, 0.06)
                        : "transparent",
                      border: `1px solid ${selected ? alpha(theme.palette.primary.main, 0.4) : theme.palette.border.subtle}`,
                      transition: "border-color 150ms, background-color 150ms",
                      "&:hover": { borderColor: theme.palette.border.strong },
                    }}
                  >
                    <Checkbox
                      checked={selected}
                      size="small"
                      sx={{ p: 0 }}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggle(u.user_id)}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                        {displayName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                        {u.email}
                      </Typography>
                    </Box>
                    {!u.is_active && (
                      <Chip label="Inactive" size="small" sx={{ height: 20, fontSize: 10 }} />
                    )}
                  </Box>
                );
              })
            )}
          </Box>
        )}
      </FormSection>
    </FormDialogShell>
  );
}
