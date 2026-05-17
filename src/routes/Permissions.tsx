import React, { useState, useMemo, useEffect } from "react";
import {
  Box,
  Tabs,
  Tab,
  Paper,
  Typography,
  Chip,
  Button,
  Avatar,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  Grid,
  Badge,
  Checkbox,
  useMediaQuery,
  useTheme,
  Drawer,
} from "@mui/material";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { roleApi, userApi } from "@/features/admin/api/admin.api";
import { useToast } from "@/components/ui/AppToast";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import PermissionMatrix from "@/features/permissions/components/PermissionMatrix";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Permission {
  permission_id: number;
  permission_code: string;
  module_name: string;
  description?: string;
}

interface RoleInfo {
  role_id: number;
  role_name: string;
  is_system_default: boolean;
  is_active: boolean;
  hierarchy_level: number;
  Permissions?: Permission[];
  description?: string;
}

interface UserData {
  user_id: number;
  username: string;
  first_name: string;
  last_name: string;
  is_active: boolean | number;
  Roles: { role_id: number; role_name: string }[];
}

interface Override {
  id: number;
  user_id: number;
  permission_id: number;
  grant_type: "grant" | "revoke";
}

interface MatrixData {
  permissions: Permission[];
  roles: RoleInfo[];
  overrides: Override[];
  users: UserData[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HIERARCHY_COLORS: [number, string][] = [
  [80, "#7c3aed"],
  [50, "#2563eb"],
  [30, "#0891b2"],
  [10, "#059669"],
  [0, "#94a3b8"],
];

const getHierarchyColor = (level: number) =>
  (HIERARCHY_COLORS.find(([min]) => level >= min) ?? HIERARCHY_COLORS[4])[1];

const getUserInitials = (u: Pick<UserData, "first_name" | "last_name">) =>
  `${u.first_name?.[0] ?? ""}${u.last_name?.[0] ?? ""}`.toUpperCase() || "?";

// ─── Role Form Dialog ─────────────────────────────────────────────────────────

interface RoleFormDialogProps {
  open: boolean;
  onClose: () => void;
  roleToEdit: RoleInfo | null;
  onSubmit: (data: {
    roleName: string;
    description: string;
    hierarchyLevel: number;
  }) => void;
  isSubmitting: boolean;
}

function RoleFormDialog({
  open,
  onClose,
  roleToEdit,
  onSubmit,
  isSubmitting,
}: RoleFormDialogProps) {
  const isEdit = Boolean(roleToEdit);
  const [form, setForm] = useState({
    roleName: "",
    description: "",
    hierarchyLevel: 10,
  });
  const [err, setErr] = useState("");

  useEffect(() => {
    if (roleToEdit) {
      setForm({
        roleName: roleToEdit.role_name,
        description: roleToEdit.description ?? "",
        hierarchyLevel: roleToEdit.hierarchy_level,
      });
    } else {
      setForm({ roleName: "", description: "", hierarchyLevel: 10 });
    }
    setErr("");
  }, [roleToEdit, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.roleName.trim()) {
      setErr("Role name is required.");
      return;
    }
    if (form.hierarchyLevel < 1 || form.hierarchyLevel > 99) {
      setErr("Hierarchy level must be between 1 and 99.");
      return;
    }
    onSubmit(form);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          fontWeight: 700,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          py: 1.5,
        }}
      >
        {isEdit ? "Edit Role" : "Create New Role"}
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box component="form" id="role-form" onSubmit={handleSubmit}>
          {err && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {err}
            </Alert>
          )}
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <TextField
              label="Role Name"
              fullWidth
              required
              size="small"
              value={form.roleName}
              onChange={(e) =>
                setForm((f) => ({ ...f, roleName: e.target.value }))
              }
              disabled={isEdit && Boolean(roleToEdit?.is_system_default)}
              helperText={
                isEdit && roleToEdit?.is_system_default
                  ? "System role names cannot be changed."
                  : ""
              }
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              size="small"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
            <TextField
              label="Hierarchy Level"
              type="number"
              fullWidth
              required
              size="small"
              value={form.hierarchyLevel}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  hierarchyLevel: parseInt(e.target.value) || 0,
                }))
              }
              helperText="1–99. Higher = more privileged. Users can only manage roles strictly below their own level."
              slotProps={{ htmlInput: { min: 1, max: 99 } }}
            />
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="role-form"
          variant="contained"
          disableElevation
          disabled={isSubmitting}
          onClick={handleSubmit}
          startIcon={
            isSubmitting ? (
              <CircularProgress size={16} color="inherit" />
            ) : undefined
          }
        >
          {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Create Role"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Assign Users Dialog ──────────────────────────────────────────────────────

interface AssignUsersDialogProps {
  open: boolean;
  role: RoleInfo;
  allUsers: UserData[];
  onClose: () => void;
  onSubmit: (userIds: number[]) => void;
  isSubmitting: boolean;
}

function AssignUsersDialog({
  open,
  role,
  allUsers,
  onClose,
  onSubmit,
  isSubmitting,
}: AssignUsersDialogProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const { data: roleUsersData, isLoading } = useQuery({
    queryKey: ["role-users", role.role_id],
    queryFn: async () => {
      const res = (await roleApi.getUsersForRole(role.role_id)) as any;
      return (res.data?.users ?? []) as { user_id: number }[];
    },
    enabled: open,
  });

  useEffect(() => {
    if (roleUsersData) {
      setSelected(new Set(roleUsersData.map((u) => u.user_id)));
    }
  }, [roleUsersData]);

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    return allUsers.filter(
      (u) =>
        u.first_name?.toLowerCase().includes(q) ||
        u.last_name?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q),
    );
  }, [allUsers, search]);

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          fontWeight: 700,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          py: 1.5,
        }}
      >
        Assign Users — {role.role_name}
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <Box sx={{ px: 2, pt: 2, pb: 1 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Search users…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 16, color: "#94a3b8" }} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>
        {isLoading ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <Box sx={{ maxHeight: 320, overflow: "auto" }}>
            {filteredUsers.map((user) => {
              const checked = selected.has(user.user_id);
              return (
                <Box
                  key={user.user_id}
                  onClick={() => toggle(user.user_id)}
                  sx={{
                    px: 2,
                    py: 0.75,
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    cursor: "pointer",
                    borderBottom: "1px solid #f1f5f9",
                    bgcolor: checked ? "#eff6ff" : "transparent",
                    "&:hover": { bgcolor: checked ? "#eff6ff" : "#f8fafc" },
                  }}
                >
                  <Checkbox
                    size="small"
                    checked={checked}
                    readOnly
                    sx={{ p: 0.25 }}
                  />
                  <Avatar
                    sx={{
                      width: 30,
                      height: 30,
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      bgcolor: checked ? "#3b82f6" : "#e2e8f0",
                      color: checked ? "#fff" : "#64748b",
                    }}
                  >
                    {getUserInitials(user)}
                  </Avatar>
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        lineHeight: 1.2,
                      }}
                    >
                      {user.first_name} {user.last_name}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "#64748b", fontSize: "0.65rem" }}
                    >
                      @{user.username}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
        <Box
          sx={{
            px: 2,
            py: 1,
            borderTop: "1px solid #f1f5f9",
            bgcolor: "#f8fafc",
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: "#64748b", fontSize: "0.65rem" }}
          >
            {selected.size} user{selected.size !== 1 ? "s" : ""} selected
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={() => onSubmit(Array.from(selected))}
          variant="contained"
          disableElevation
          disabled={isSubmitting}
          startIcon={
            isSubmitting ? (
              <CircularProgress size={16} color="inherit" />
            ) : undefined
          }
        >
          {isSubmitting ? "Saving…" : "Save Assignments"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Tab 1: User Permissions ──────────────────────────────────────────────────

function UserPermissionsTab({
  matrixData,
  isLoading,
}: {
  matrixData?: MatrixData;
  isLoading: boolean;
}) {
  const qc = useQueryClient();
  const { showSuccess, showError } = useToast();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [addRoleOpen, setAddRoleOpen] = useState(false);
  const [roleToAdd, setRoleToAdd] = useState<number | "">("");

  const permissions = matrixData?.permissions ?? [];
  const roles = matrixData?.roles ?? [];
  const overrides = matrixData?.overrides ?? [];
  const users = matrixData?.users ?? [];

  const selectedUser = useMemo(
    () => users.find((u) => u.user_id === selectedUserId) ?? null,
    [users, selectedUserId],
  );

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.first_name?.toLowerCase().includes(q) ||
        u.last_name?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q),
    );
  }, [users, search]);

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    permissions.forEach((p) => {
      (groups[p.module_name] ??= []).push(p);
    });
    return groups;
  }, [permissions]);

  const rolePermMap = useMemo(() => {
    const map: Record<number, Set<number>> = {};
    roles.forEach((r) => {
      map[r.role_id] = new Set(
        r.Permissions?.map((p) => p.permission_id) ?? [],
      );
    });
    return map;
  }, [roles]);

  const overrideMap = useMemo(() => {
    const map: Record<string, Override> = {};
    overrides.forEach((o) => {
      map[`${o.user_id}-${o.permission_id}`] = o;
    });
    return map;
  }, [overrides]);

  // ── Mutations ──
  const assignRolesMutation = useMutation({
    mutationFn: async ({
      userId,
      roleIds,
    }: {
      userId: number;
      roleIds: number[];
    }) => {
      await userApi.assignRoles(userId, roleIds);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permission-matrix"] });
      showSuccess("User roles updated.");
      setAddRoleOpen(false);
      setRoleToAdd("");
    },
    onError: (err: Error) => showError(err.message),
  });

  const setOverrideMutation = useMutation({
    mutationFn: async ({
      userId,
      permissionId,
      grantType,
    }: {
      userId: number;
      permissionId: number;
      grantType: "grant" | "revoke";
    }) => {
      await api.post("/permission-management/user-override", {
        userId,
        permissionId,
        grantType,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["permission-matrix"] }),
    onError: (err: Error) => showError(err.message),
  });

  const removeOverrideMutation = useMutation({
    mutationFn: async ({
      userId,
      permissionId,
    }: {
      userId: number;
      permissionId: number;
    }) => {
      await api.delete("/permission-management/user-override", {
        data: { userId, permissionId },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["permission-matrix"] }),
    onError: (err: Error) => showError(err.message),
  });

  // Cycle: no override → grant/revoke (opposite of inherited) → flip → clear
  const handleOverrideCycle = (userId: number, permId: number) => {
    const key = `${userId}-${permId}`;
    const existing = overrideMap[key];
    const user = users.find((u) => u.user_id === userId);
    const fromRole =
      user?.Roles?.some((r) => rolePermMap[r.role_id]?.has(permId)) ?? false;

    if (!existing) {
      setOverrideMutation.mutate({
        userId,
        permissionId: permId,
        grantType: fromRole ? "revoke" : "grant",
      });
    } else if (existing.grant_type === "grant") {
      setOverrideMutation.mutate({
        userId,
        permissionId: permId,
        grantType: "revoke",
      });
    } else {
      removeOverrideMutation.mutate({ userId, permissionId: permId });
    }
  };

  const handleRemoveRole = (roleId: number) => {
    if (!selectedUser) return;
    const newIds = selectedUser.Roles.filter((r) => r.role_id !== roleId).map(
      (r) => r.role_id,
    );
    assignRolesMutation.mutate({
      userId: selectedUser.user_id,
      roleIds: newIds,
    });
  };

  const handleAddRole = () => {
    if (!selectedUser || !roleToAdd) return;
    const existing = new Set(selectedUser.Roles.map((r) => r.role_id));
    if (existing.has(roleToAdd as number)) {
      showError("User already has this role.");
      return;
    }
    assignRolesMutation.mutate({
      userId: selectedUser.user_id,
      roleIds: [...Array.from(existing), roleToAdd as number],
    });
  };

  const availableRolesToAdd = useMemo(() => {
    if (!selectedUser) return roles.filter((r) => r.is_active);
    const currentIds = new Set(selectedUser.Roles.map((r) => r.role_id));
    return roles.filter((r) => !currentIds.has(r.role_id) && r.is_active);
  }, [roles, selectedUser]);

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Sidebar content (shared between desktop Paper and mobile Drawer)
  const sidebarContent = (
    <>
      <Box sx={{ p: 1.25, borderBottom: "1px solid #e2e8f0" }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search users…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 15, color: "#94a3b8" }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ "& .MuiInputBase-input": { fontSize: "0.78rem", py: 0.75 } }}
        />
      </Box>
      <Box sx={{ overflow: "auto", flex: 1 }}>
        {filteredUsers.map((user) => {
          const isSelected = user.user_id === selectedUserId;
          return (
            <Box
              key={user.user_id}
              onClick={() => {
                setSelectedUserId(user.user_id);
                // Close drawer on mobile after selection
                if (isMobile) setSidebarOpen(false);
              }}
              sx={{
                px: 1.5,
                py: 1,
                cursor: "pointer",
                borderBottom: "1px solid #f1f5f9",
                bgcolor: isSelected ? "#eff6ff" : "transparent",
                borderLeft: `3px solid ${isSelected ? "#3b82f6" : "transparent"}`,
                "&:hover": { bgcolor: isSelected ? "#eff6ff" : "#f8fafc" },
                transition: "0.1s",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Avatar
                  sx={{
                    width: 30,
                    height: 30,
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    bgcolor: isSelected ? "#3b82f6" : "#e2e8f0",
                    color: isSelected ? "#fff" : "#64748b",
                    flexShrink: 0,
                  }}
                >
                  {getUserInitials(user)}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      fontSize: "0.76rem",
                      lineHeight: 1.2,
                      color: "#0f172a",
                    }}
                    noWrap
                  >
                    {user.first_name} {user.last_name}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: "#64748b", fontSize: "0.62rem" }}
                    noWrap
                  >
                    @{user.username}
                  </Typography>
                </Box>
              </Box>
              {user.Roles?.length > 0 && (
                <Box
                  sx={{
                    mt: 0.5,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 0.4,
                  }}
                >
                  {user.Roles.slice(0, 2).map((r) => (
                    <Chip
                      key={r.role_id}
                      label={r.role_name}
                      size="small"
                      sx={{
                        height: 14,
                        fontSize: "0.52rem",
                        "& .MuiChip-label": { px: 0.6 },
                      }}
                    />
                  ))}
                  {user.Roles.length > 2 && (
                    <Chip
                      label={`+${user.Roles.length - 2}`}
                      size="small"
                      sx={{
                        height: 14,
                        fontSize: "0.52rem",
                        bgcolor: "#f1f5f9",
                        "& .MuiChip-label": { px: 0.6 },
                      }}
                    />
                  )}
                </Box>
              )}
            </Box>
          );
        })}
        {filteredUsers.length === 0 && (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="caption" sx={{ color: "#94a3b8" }}>
              No users found
            </Typography>
          </Box>
        )}
      </Box>
    </>
  );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        gap: { xs: 2, md: 2 },
        minHeight: { xs: "auto", md: 500 },
      }}
    >
      {/* Mobile: Drawer | Desktop: Fixed Sidebar */}
      {isMobile ? (
        <Drawer
          anchor="left"
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          sx={{
            "& .MuiDrawer-paper": {
              width: { xs: "85vw", sm: 320 },
              maxWidth: 360,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              height: "100%",
            },
          }}
        >
          {sidebarContent}
        </Drawer>
      ) : (
        <Paper
          elevation={0}
          sx={{
            width: { md: 240, lg: 260 },
            flexShrink: 0,
            border: "1px solid #e2e8f0",
            borderRadius: 2,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            height: { md: "calc(100vh - 240px)" },
            position: { md: "sticky" },
            top: 0,
          }}
        >
          {sidebarContent}
        </Paper>
      )}

      {/* ── Right: User Detail Panel ── */}
      {selectedUser ? (
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            minWidth: 0,
          }}
        >
          {/* User Header */}
          <Paper
            elevation={0}
            sx={{ p: 2, border: "1px solid #e2e8f0", borderRadius: 2 }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Avatar
                sx={{
                  width: 42,
                  height: 42,
                  bgcolor: "#3b82f6",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                }}
              >
                {getUserInitials(selectedUser)}
              </Avatar>
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 700, lineHeight: 1.2 }}
                >
                  {selectedUser.first_name} {selectedUser.last_name}
                </Typography>
                <Typography variant="caption" sx={{ color: "#64748b" }}>
                  @{selectedUser.username}
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Role Assignments */}
          <Paper
            elevation={0}
            sx={{ p: 2, border: "1px solid #e2e8f0", borderRadius: 2 }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1.5,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <ShieldOutlinedIcon sx={{ fontSize: 15, color: "#3b82f6" }} />
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, fontSize: "0.8rem" }}
                >
                  Assigned Roles
                </Typography>
              </Box>
              <Button
                size="small"
                startIcon={<AddIcon sx={{ fontSize: "14px !important" }} />}
                variant="outlined"
                onClick={() => setAddRoleOpen(true)}
                sx={{
                  fontSize: "0.7rem",
                  py: 0.3,
                  px: 1,
                  textTransform: "none",
                  minWidth: 0,
                }}
              >
                Add Role
              </Button>
            </Box>
            <Box
              sx={{ display: "flex", flexWrap: "wrap", gap: 1, minHeight: 28 }}
            >
              {selectedUser.Roles?.length === 0 && (
                <Typography
                  variant="caption"
                  sx={{ color: "#94a3b8", fontStyle: "italic" }}
                >
                  No roles assigned
                </Typography>
              )}
              {selectedUser.Roles?.map((role) => {
                const rd = roles.find((r) => r.role_id === role.role_id);
                return (
                  <Chip
                    key={role.role_id}
                    label={role.role_name}
                    size="small"
                    onDelete={
                      rd?.is_system_default
                        ? undefined
                        : () => handleRemoveRole(role.role_id)
                    }
                    deleteIcon={
                      <CloseIcon sx={{ fontSize: "11px !important" }} />
                    }
                    icon={
                      rd?.is_system_default ? (
                        <LockOutlinedIcon
                          sx={{ fontSize: "11px !important" }}
                        />
                      ) : undefined
                    }
                    sx={{
                      fontWeight: 600,
                      fontSize: "0.72rem",
                      bgcolor: "#eff6ff",
                      color: "#1d4ed8",
                      "& .MuiChip-deleteIcon": {
                        color: "#93c5fd",
                        "&:hover": { color: "#ef4444" },
                      },
                    }}
                  />
                );
              })}
            </Box>
          </Paper>

          {/* Permission Overrides */}
          <Paper
            elevation={0}
            sx={{
              border: "1px solid #e2e8f0",
              borderRadius: 2,
              overflow: "hidden",
              flex: 1,
            }}
          >
            {/* Header/Legend */}
            <Box
              sx={{
                px: 2,
                py: 1,
                borderBottom: "1px solid #e2e8f0",
                bgcolor: "#f8fafc",
                display: "flex",
                alignItems: "center",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <PersonOutlinedIcon sx={{ fontSize: 14, color: "#64748b" }} />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color: "#0f172a",
                    fontSize: "0.72rem",
                  }}
                >
                  Permission Overrides
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />
              {[
                { color: "#94a3b8", label: "Inherited" },
                { color: "#10b981", label: "Explicitly Granted" },
                { color: "#ef4444", label: "Explicitly Revoked" },
              ].map(({ color, label }) => (
                <Box
                  key={label}
                  sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: color,
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{ color: "#64748b", fontSize: "0.62rem" }}
                  >
                    {label}
                  </Typography>
                </Box>
              ))}
              <Typography
                variant="caption"
                sx={{ color: "#94a3b8", fontSize: "0.6rem", ml: "auto" }}
              >
                Click a row to cycle: Inherited → Override → Flip → Clear
              </Typography>
            </Box>

            {/* Permission rows by module */}
            <Box
              sx={{
                overflow: "auto",
                maxHeight: { xs: 360, sm: 420, md: "calc(100vh - 470px)" },
                minHeight: 200,
              }}
            >
              {Object.entries(groupedPermissions).map(([module, perms]) => (
                <React.Fragment key={module}>
                  <Box
                    sx={{
                      px: 2,
                      py: 0.6,
                      bgcolor: "#f1f5f9",
                      borderBottom: "1px solid #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.65rem",
                        color: "#475569",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {module}
                    </Typography>
                    <Badge
                      badgeContent={perms.length}
                      color="primary"
                      sx={{
                        "& .MuiBadge-badge": {
                          fontSize: "0.5rem",
                          height: 14,
                          minWidth: 14,
                        },
                      }}
                    />
                  </Box>
                  {perms.map((perm) => {
                    const key = `${selectedUser.user_id}-${perm.permission_id}`;
                    const override = overrideMap[key];
                    const fromRole =
                      selectedUser.Roles?.some((r) =>
                        rolePermMap[r.role_id]?.has(perm.permission_id),
                      ) ?? false;

                    let statusColor = "#94a3b8";
                    let statusLabel = fromRole ? "Inherited ✓" : "Inherited ✗";
                    let rowBg = "transparent";

                    if (override?.grant_type === "grant") {
                      statusColor = "#10b981";
                      statusLabel = "Granted";
                      rowBg = "#f0fdf4";
                    } else if (override?.grant_type === "revoke") {
                      statusColor = "#ef4444";
                      statusLabel = "Revoked";
                      rowBg = "#fff5f5";
                    }

                    const roleSource =
                      !override && fromRole
                        ? selectedUser.Roles?.filter((r) =>
                            rolePermMap[r.role_id]?.has(perm.permission_id),
                          )
                            .map((r) => r.role_name)
                            .join(", ")
                        : "";

                    return (
                      <Box
                        key={perm.permission_id}
                        onClick={() =>
                          handleOverrideCycle(
                            selectedUser.user_id,
                            perm.permission_id,
                          )
                        }
                        sx={{
                          px: 2,
                          py: 0.625,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          borderBottom: "1px solid #f1f5f9",
                          cursor: "pointer",
                          bgcolor: rowBg,
                          "&:hover": { filter: "brightness(0.97)" },
                          transition: "0.1s",
                        }}
                      >
                        <Box>
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: "0.7rem",
                              color: "#334155",
                              fontFamily: "monospace",
                            }}
                          >
                            {perm.permission_code}
                          </Typography>
                          {perm.description && (
                            <Typography
                              variant="caption"
                              sx={{ fontSize: "0.58rem", color: "#94a3b8" }}
                            >
                              {perm.description}
                            </Typography>
                          )}
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            flexShrink: 0,
                            ml: 1,
                          }}
                        >
                          {roleSource && (
                            <Typography
                              variant="caption"
                              sx={{
                                fontSize: "0.58rem",
                                color: "#94a3b8",
                                fontStyle: "italic",
                              }}
                            >
                              via {roleSource}
                            </Typography>
                          )}
                          <Chip
                            label={statusLabel}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: "0.58rem",
                              fontWeight: 700,
                              color: statusColor,
                              bgcolor: `${statusColor}15`,
                              border: `1px solid ${statusColor}40`,
                              "& .MuiChip-label": { px: 0.75 },
                            }}
                          />
                        </Box>
                      </Box>
                    );
                  })}
                </React.Fragment>
              ))}
            </Box>
          </Paper>

          {/* Add Role Dialog */}
          <Dialog
            open={addRoleOpen}
            onClose={() => {
              setAddRoleOpen(false);
              setRoleToAdd("");
            }}
            maxWidth="xs"
            fullWidth
          >
            <DialogTitle
              sx={{
                fontWeight: 700,
                fontSize: "0.95rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                py: 1.5,
              }}
            >
              Add Role to {selectedUser.first_name}
              <IconButton
                size="small"
                onClick={() => {
                  setAddRoleOpen(false);
                  setRoleToAdd("");
                }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <FormControl fullWidth size="small">
                <Select
                  value={roleToAdd}
                  displayEmpty
                  onChange={(e) => setRoleToAdd(e.target.value as number)}
                  renderValue={(v) =>
                    v ? (
                      availableRolesToAdd.find((r) => r.role_id === v)
                        ?.role_name
                    ) : (
                      <em style={{ color: "#94a3b8" }}>Select a role…</em>
                    )
                  }
                >
                  {availableRolesToAdd.map((r) => (
                    <MenuItem key={r.role_id} value={r.role_id}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        {r.role_name}
                        <Chip
                          label={`L${r.hierarchy_level}`}
                          size="small"
                          sx={{
                            height: 16,
                            fontSize: "0.58rem",
                            color: getHierarchyColor(r.hierarchy_level),
                            bgcolor: `${getHierarchyColor(r.hierarchy_level)}15`,
                            "& .MuiChip-label": { px: 0.75 },
                          }}
                        />
                      </Box>
                    </MenuItem>
                  ))}
                  {availableRolesToAdd.length === 0 && (
                    <MenuItem disabled>
                      User already has all available roles
                    </MenuItem>
                  )}
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button
                onClick={() => {
                  setAddRoleOpen(false);
                  setRoleToAdd("");
                }}
                color="inherit"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddRole}
                variant="contained"
                disableElevation
                disabled={!roleToAdd || assignRolesMutation.isPending}
              >
                Add Role
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      ) : isMobile ? (
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 2,
            minHeight: 300,
          }}
        >
          <PersonOutlinedIcon sx={{ fontSize: 48, color: "#cbd5e1" }} />
          <Typography variant="body2" sx={{ color: "#94a3b8" }}>
            Select a user to manage their permissions
          </Typography>
          <Button
            variant="contained"
            disableElevation
            onClick={() => setSidebarOpen(true)}
            sx={{ mt: 1 }}
          >
            Select User
          </Button>
        </Box>
      ) : (
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            border: "1px solid #e2e8f0",
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 1,
          }}
        >
          <PersonOutlinedIcon sx={{ fontSize: 40, color: "#cbd5e1" }} />
          <Typography variant="body2" sx={{ color: "#94a3b8" }}>
            Select a user to manage their permissions
          </Typography>
        </Paper>
      )}
    </Box>
  );
}

// ─── Tab 2: Role Management ───────────────────────────────────────────────────

function RoleManagementTab({ allUsers }: { allUsers: UserData[] }) {
  const qc = useQueryClient();
  const { showSuccess, showError } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const [showInactive, setShowInactive] = useState(false);
  const [roleFormOpen, setRoleFormOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<RoleInfo | null>(null);
  const [assignUsersRole, setAssignUsersRole] = useState<RoleInfo | null>(null);
  const [cloneFrom, setCloneFrom] = useState<number | "">("");
  const [cloneTo, setCloneTo] = useState<number | "">("");

  const { data: rolesData, isLoading } = useQuery({
    queryKey: ["roles", showInactive],
    queryFn: async () => {
      const res = (await roleApi.getRoles(showInactive)) as any;
      return (res.data?.roles ?? []) as RoleInfo[];
    },
  });
  const roles: RoleInfo[] = rolesData ?? [];

  const sortedRoles = useMemo(
    () => [...roles].sort((a, b) => b.hierarchy_level - a.hierarchy_level),
    [roles],
  );

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: (data: any) => roleApi.createRole(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      qc.invalidateQueries({ queryKey: ["permission-matrix"] });
      showSuccess("Role created.");
      setRoleFormOpen(false);
    },
    onError: (err: Error) => showError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      roleApi.updateRole(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      qc.invalidateQueries({ queryKey: ["permission-matrix"] });
      showSuccess("Role updated.");
      setRoleFormOpen(false);
      setRoleToEdit(null);
    },
    onError: (err: Error) => showError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => roleApi.deleteRole(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      showSuccess("Role deactivated.");
    },
    onError: (err: Error) => showError(err.message),
  });

  const assignUsersMutation = useMutation({
    mutationFn: ({ id, userIds }: { id: number; userIds: number[] }) =>
      roleApi.assignUsers(id, userIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      qc.invalidateQueries({ queryKey: ["permission-matrix"] });
      qc.invalidateQueries({ queryKey: ["role-users"] });
      showSuccess("Users assigned to role.");
      setAssignUsersRole(null);
    },
    onError: (err: Error) => showError(err.message),
  });

  const cloneMutation = useMutation({
    mutationFn: async ({
      sourceRoleId,
      targetRoleId,
    }: {
      sourceRoleId: number;
      targetRoleId: number;
    }) => {
      await api.post("/permission-management/clone-role", {
        sourceRoleId,
        targetRoleId,
      });
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      qc.invalidateQueries({ queryKey: ["permission-matrix"] });
      const from = roles.find(
        (r) => r.role_id === vars.sourceRoleId,
      )?.role_name;
      const to = roles.find((r) => r.role_id === vars.targetRoleId)?.role_name;
      showSuccess(`Permissions cloned from "${from}" to "${to}".`);
      setCloneFrom("");
      setCloneTo("");
    },
    onError: (err: Error) => showError(err.message),
  });

  const handleDelete = async (role: RoleInfo) => {
    const ok = await confirm({
      title: "Deactivate Role",
      message: `Deactivate "${role.role_name}"? Users assigned to this role will lose its permissions.`,
      confirmLabel: "Deactivate",
      severity: "error",
    });
    if (ok) deleteMutation.mutate(role.role_id);
  };

  return (
    <Box>
      {/* Toolbar */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2.5,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        {/* Clone Permissions */}
        <Paper
          elevation={0}
          sx={{
            px: 2,
            py: 1.25,
            border: "1px solid #e2e8f0",
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <ContentCopyOutlinedIcon sx={{ fontSize: 14, color: "#3b82f6" }} />
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, color: "#334155", fontSize: "0.7rem" }}
            >
              Clone Permissions
            </Typography>
          </Box>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select
              value={cloneFrom}
              displayEmpty
              onChange={(e) => setCloneFrom(e.target.value as number)}
              renderValue={(v) =>
                v ? (
                  roles.find((r) => r.role_id === v)?.role_name
                ) : (
                  <em style={{ color: "#94a3b8", fontSize: "0.72rem" }}>
                    From role
                  </em>
                )
              }
              sx={{ fontSize: "0.72rem" }}
            >
              {roles.map((r) => (
                <MenuItem
                  key={r.role_id}
                  value={r.role_id}
                  sx={{ fontSize: "0.75rem" }}
                >
                  {r.role_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography
            variant="caption"
            sx={{ color: "#94a3b8", fontWeight: 700 }}
          >
            →
          </Typography>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select
              value={cloneTo}
              displayEmpty
              onChange={(e) => setCloneTo(e.target.value as number)}
              renderValue={(v) =>
                v ? (
                  roles.find((r) => r.role_id === v)?.role_name
                ) : (
                  <em style={{ color: "#94a3b8", fontSize: "0.72rem" }}>
                    To role
                  </em>
                )
              }
              sx={{ fontSize: "0.72rem" }}
            >
              {roles
                .filter((r) => !r.is_system_default && r.role_id !== cloneFrom)
                .map((r) => (
                  <MenuItem
                    key={r.role_id}
                    value={r.role_id}
                    sx={{ fontSize: "0.75rem" }}
                  >
                    {r.role_name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          <Button
            size="small"
            variant="contained"
            disableElevation
            disabled={!cloneFrom || !cloneTo || cloneMutation.isPending}
            onClick={() =>
              cloneMutation.mutate({
                sourceRoleId: cloneFrom as number,
                targetRoleId: cloneTo as number,
              })
            }
            sx={{ fontSize: "0.7rem", textTransform: "none", minWidth: 56 }}
          >
            {cloneMutation.isPending ? "…" : "Clone"}
          </Button>
        </Paper>

        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
          <Chip
            label={showInactive ? "Showing All" : "Active Only"}
            onClick={() => setShowInactive((v) => !v)}
            size="small"
            variant={showInactive ? "filled" : "outlined"}
            color={showInactive ? "default" : "primary"}
            sx={{ cursor: "pointer", fontSize: "0.72rem" }}
          />
          <Button
            variant="contained"
            disableElevation
            startIcon={<AddIcon />}
            onClick={() => {
              setRoleToEdit(null);
              setRoleFormOpen(true);
            }}
            sx={{ textTransform: "none" }}
          >
            Create Role
          </Button>
        </Box>
      </Box>

      {/* Role Cards */}
      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={{ xs: 1.5, md: 2 }}>
          {sortedRoles.map((role) => {
            const hColor = getHierarchyColor(role.hierarchy_level);
            return (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={role.role_id}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.25,
                    border: `1px solid ${role.is_active ? "#e2e8f0" : "#f1f5f9"}`,
                    borderRadius: 2,
                    opacity: role.is_active ? 1 : 0.55,
                    transition: "0.2s",
                    "&:hover": role.is_active
                      ? {
                          borderColor: `${hColor}50`,
                          boxShadow: `0 2px 14px ${hColor}18`,
                        }
                      : {},
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      mb: 1.5,
                    }}
                  >
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1.25 }}
                    >
                      <Box
                        sx={{
                          width: 38,
                          height: 38,
                          borderRadius: 2,
                          bgcolor: `${hColor}12`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: `1.5px solid ${hColor}25`,
                          flexShrink: 0,
                        }}
                      >
                        {role.is_system_default ? (
                          <LockOutlinedIcon
                            sx={{ fontSize: 17, color: hColor }}
                          />
                        ) : (
                          <ShieldOutlinedIcon
                            sx={{ fontSize: 17, color: hColor }}
                          />
                        )}
                      </Box>
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.88rem",
                            color: "#0f172a",
                            lineHeight: 1.2,
                          }}
                        >
                          {role.role_name}
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            mt: 0.3,
                          }}
                        >
                          <Chip
                            label={`Level ${role.hierarchy_level}`}
                            size="small"
                            sx={{
                              height: 15,
                              fontSize: "0.56rem",
                              fontWeight: 700,
                              color: hColor,
                              bgcolor: `${hColor}15`,
                              "& .MuiChip-label": { px: 0.7 },
                            }}
                          />
                          {role.is_system_default && (
                            <Chip
                              label="System"
                              size="small"
                              sx={{
                                height: 15,
                                fontSize: "0.56rem",
                                color: "#92400e",
                                bgcolor: "#fef3c7",
                                "& .MuiChip-label": { px: 0.7 },
                              }}
                            />
                          )}
                          {!role.is_active && (
                            <Chip
                              label="Inactive"
                              size="small"
                              sx={{
                                height: 15,
                                fontSize: "0.56rem",
                                "& .MuiChip-label": { px: 0.7 },
                              }}
                            />
                          )}
                        </Box>
                      </Box>
                    </Box>

                    {/* Actions */}
                    <Box sx={{ display: "flex", gap: 0.25, flexShrink: 0 }}>
                      <Tooltip title="Assign Users to Role">
                        <IconButton
                          size="small"
                          onClick={() => setAssignUsersRole(role)}
                          sx={{ "&:hover": { bgcolor: "#eff6ff" } }}
                        >
                          <GroupAddIcon
                            sx={{ fontSize: 15, color: "#3b82f6" }}
                          />
                        </IconButton>
                      </Tooltip>
                      {!role.is_system_default && role.is_active && (
                        <>
                          <Tooltip title="Edit Role">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setRoleToEdit(role);
                                setRoleFormOpen(true);
                              }}
                              sx={{ "&:hover": { bgcolor: "#f0fdf4" } }}
                            >
                              <EditOutlinedIcon
                                sx={{ fontSize: 15, color: "#10b981" }}
                              />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Deactivate Role">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(role)}
                              sx={{ "&:hover": { bgcolor: "#fff5f5" } }}
                            >
                              <DeleteOutlinedIcon
                                sx={{ fontSize: 15, color: "#ef4444" }}
                              />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Box>
                  </Box>

                  {role.description && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#64748b",
                        fontSize: "0.68rem",
                        display: "block",
                        mb: 1,
                        lineHeight: 1.4,
                      }}
                    >
                      {role.description}
                    </Typography>
                  )}

                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Box
                      sx={{
                        flex: 1,
                        textAlign: "center",
                        py: 0.75,
                        bgcolor: "#f8fafc",
                        borderRadius: 1.5,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 800,
                          fontSize: "1.1rem",
                          color: hColor,
                          display: "block",
                          lineHeight: 1,
                        }}
                      >
                        {role.Permissions?.length ?? 0}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ fontSize: "0.58rem", color: "#94a3b8" }}
                      >
                        Permissions
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            );
          })}

          {sortedRoles.length === 0 && (
            <Grid size={{ xs: 12 }}>
              <Box sx={{ p: 5, textAlign: "center", color: "#94a3b8" }}>
                <ShieldOutlinedIcon sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="body2">No roles found.</Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      )}

      {/* Dialogs */}
      <RoleFormDialog
        open={roleFormOpen}
        onClose={() => {
          setRoleFormOpen(false);
          setRoleToEdit(null);
        }}
        roleToEdit={roleToEdit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={(data) => {
          if (roleToEdit) {
            updateMutation.mutate({
              id: roleToEdit.role_id,
              data: {
                role_name: data.roleName,
                description: data.description,
                hierarchy_level: data.hierarchyLevel,
              },
            });
          } else {
            createMutation.mutate(data);
          }
        }}
      />

      {assignUsersRole && (
        <AssignUsersDialog
          open={Boolean(assignUsersRole)}
          role={assignUsersRole}
          allUsers={allUsers}
          onClose={() => setAssignUsersRole(null)}
          onSubmit={(userIds) =>
            assignUsersMutation.mutate({ id: assignUsersRole.role_id, userIds })
          }
          isSubmitting={assignUsersMutation.isPending}
        />
      )}

      <ConfirmDialog />
    </Box>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PermissionsPage() {
  const [activeTab, setActiveTab] = useState(0);

  const { data: matrixData, isLoading } = useQuery({
    queryKey: ["permission-matrix"],
    queryFn: async () => {
      const res = (await api.get("/permission-management/matrix")) as any;
      return (res.data ?? res) as MatrixData;
    },
  });

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1600, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
          <AdminPanelSettingsOutlinedIcon
            sx={{ color: "#3b82f6", fontSize: 24 }}
          />
          <Typography variant="h5" sx={{ fontWeight: 800, color: "#0f172a" }}>
            Access Control
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: "#64748b" }}>
          Manage role-based permissions, user-level overrides, and role
          hierarchies across the platform.
        </Typography>
      </Box>

      {/* Tabbed Panel */}
      <Paper
        elevation={0}
        sx={{ border: "1px solid #e2e8f0", borderRadius: 2 }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            borderBottom: "1px solid #e2e8f0",
            px: 1,
            "& .MuiTab-root": {
              textTransform: "none",
              fontSize: "0.85rem",
              fontWeight: 500,
              minHeight: 46,
            },
            "& .Mui-selected": { fontWeight: 700 },
          }}
        >
          <Tab
            icon={<ShieldOutlinedIcon sx={{ fontSize: 16 }} />}
            iconPosition="start"
            label="Role Permission Matrix"
          />
          <Tab
            icon={<PersonOutlinedIcon sx={{ fontSize: 16 }} />}
            iconPosition="start"
            label="User Permissions"
          />
          <Tab
            icon={<AdminPanelSettingsOutlinedIcon sx={{ fontSize: 16 }} />}
            iconPosition="start"
            label="Role Management"
          />
        </Tabs>

        <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
          {activeTab === 0 && <PermissionMatrix />}
          {activeTab === 1 && (
            <UserPermissionsTab matrixData={matrixData} isLoading={isLoading} />
          )}
          {activeTab === 2 && (
            <RoleManagementTab allUsers={matrixData?.users ?? []} />
          )}
        </Box>
      </Paper>
    </Box>
  );
}
