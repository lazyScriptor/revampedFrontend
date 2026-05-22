import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import GroupAddOutlinedIcon from "@mui/icons-material/GroupAddOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { userApi, roleApi } from "../api/admin.api";
import UserFormDrawer from "./UserFormDrawer";
import BulkAssignModal from "./BulkAssignModal";
import CsvUploadDropzone from "./CsvUploadDropzone";
import AssignRolesModal from "./AssignRolesModal";
import { useToast } from "@/components/ui/AppToast";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ListPageShell } from "@/components/layout/ListPageShell";
import { StatTable } from "@/components/reports/StatTable";

dayjs.extend(relativeTime);

type StatusFilter = "all" | "active" | "inactive";

const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "");
const resolveAvatar = (url?: string | null) => {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${apiBase}${url.startsWith("/") ? "" : "/"}${url}`;
};

const initialsOf = (u: { first_name?: string; last_name?: string; username?: string }) => {
  const f = (u.first_name || "").trim();
  const l = (u.last_name || "").trim();
  const fi = f[0] || u.username?.[0] || "?";
  const li = l[0] || "";
  return `${fi}${li}`.toUpperCase();
};

interface KpiTileProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: "primary" | "success" | "danger" | "accent";
}
function KpiTile({ icon, label, value, tone }: KpiTileProps) {
  const theme = useTheme();
  const toneColor =
    tone === "primary"
      ? theme.palette.primary.main
      : tone === "success"
        ? theme.palette.success.main
        : tone === "danger"
          ? theme.palette.error.main
          : theme.palette.info.main;

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        p: 2,
        bgcolor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.border.subtle}`,
        borderRadius: 2.5,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
      }}
    >
      <Box
        sx={{
          width: 38,
          height: 38,
          borderRadius: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: toneColor,
          bgcolor: alpha(toneColor, 0.1),
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="caption"
          sx={{
            display: "block",
            color: theme.palette.text.secondary,
            fontSize: "0.68rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            fontSize: "1.35rem",
            fontWeight: 800,
            color: theme.palette.text.primary,
            lineHeight: 1.1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

export default function UserManagement() {
  const theme = useTheme();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<any>(null);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [csvUploadOpen, setCsvUploadOpen] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
  const [roleAssignUser, setRoleAssignUser] = useState<any>(null);

  const { showSuccess, showError, showInfo } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const showInactive = statusFilter !== "active";

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await userApi.getUsers(showInactive);
      setUsers(response.data.users || []);
    } catch (error: any) {
      showError(error.message || "Failed to fetch users.");
    }
    setLoading(false);
  };

  const fetchRoles = async () => {
    try {
      const response = await roleApi.getRoles(false);
      setRoles(response.data.roles || []);
    } catch (error: any) {
      showError(error.message || "Failed to fetch roles.");
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive]);

  const handleSuccess = () => {
    setDrawerOpen(false);
    setUserToEdit(null);
    fetchUsers();
  };

  const handleEdit = (user: any) => {
    setUserToEdit(user);
    setDrawerOpen(true);
  };

  const handleDelete = async (id: number, username: string) => {
    const confirmed = await confirm({
      title: "Deactivate User",
      message: `Are you sure you want to deactivate "${username}"? They will no longer be able to log in.`,
      confirmLabel: "Deactivate",
      severity: "error",
    });
    if (!confirmed) return;
    try {
      await userApi.deleteUser(id);
      showSuccess(`User "${username}" has been deactivated.`);
      fetchUsers();
    } catch (error: any) {
      showError(error.message || "Failed to deactivate user.");
    }
  };

  const handleBulkAssign = async (roleId: string) => {
    try {
      setLoading(true);
      for (const userId of selectedRowIds) {
        await userApi.assignRoles(userId, [parseInt(roleId)]);
      }
      setBulkAssignOpen(false);
      setSelectedRowIds([]);
      showSuccess(`Role assigned to ${selectedRowIds.length} user(s) successfully.`);
      fetchUsers();
    } catch (error: any) {
      showError(error.message || "Bulk assignment failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (file: File) => {
    showInfo(`File "${file.name}" selected. CSV Bulk Import will be wired up to the backend parser.`);
    setCsvUploadOpen(false);
  };

  // ── KPIs ──
  const kpis = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.is_active).length;
    const inactive = total - active;
    const withRoles = users.filter((u) => (u.Roles?.length ?? 0) > 0).length;
    return { total, active, inactive, withRoles };
  }, [users]);

  // ── Client-side filter ──
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter === "active" && !u.is_active) return false;
      if (statusFilter === "inactive" && u.is_active) return false;
      if (!q) return true;
      return (
        (u.first_name || "").toLowerCase().includes(q) ||
        (u.last_name || "").toLowerCase().includes(q) ||
        (u.username || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q)
      );
    });
  }, [users, search, statusFilter]);

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: "_person",
        headerName: "Person",
        flex: 1.6,
        minWidth: 220,
        sortable: false,
        renderCell: (params) => {
          const u = params.row;
          const displayName = `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username;
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, py: 1 }}>
              <Avatar
                src={resolveAvatar(u.avatar_url)}
                sx={{
                  width: 34,
                  height: 34,
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  color: theme.palette.primary.main,
                  border: `1px solid ${theme.palette.border.subtle}`,
                }}
              >
                {initialsOf(u)}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: theme.palette.text.primary,
                    lineHeight: 1.2,
                  }}
                  noWrap
                >
                  {displayName}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: theme.palette.text.secondary,
                    fontSize: "0.7rem",
                    fontFamily: "ui-monospace, SFMono-Regular, monospace",
                  }}
                  noWrap
                >
                  @{u.username}
                </Typography>
              </Box>
            </Box>
          );
        },
      },
      {
        field: "email",
        headerName: "Email",
        flex: 1.2,
        minWidth: 200,
        renderCell: (params) => (
          <Typography variant="body2" sx={{ fontSize: "0.8rem", color: theme.palette.text.secondary }}>
            {params.value || "—"}
          </Typography>
        ),
      },
      {
        field: "Roles",
        headerName: "Roles",
        flex: 1.4,
        minWidth: 220,
        sortable: false,
        renderCell: (params) => {
          const list = params.value || [];
          if (list.length === 0) {
            return (
              <Typography variant="caption" sx={{ color: theme.palette.text.disabled, fontStyle: "italic" }}>
                No roles
              </Typography>
            );
          }
          const visible = list.slice(0, 2);
          const extra = list.length - visible.length;
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
              {visible.map((r: any) => (
                <Chip
                  key={r.role_id}
                  label={r.role_name}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: "0.66rem",
                    fontWeight: 700,
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    color: theme.palette.primary.dark,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                  }}
                />
              ))}
              {extra > 0 && (
                <Chip
                  label={`+${extra}`}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: "0.66rem",
                    fontWeight: 700,
                    bgcolor: theme.palette.surface.muted,
                    color: theme.palette.text.secondary,
                  }}
                />
              )}
            </Box>
          );
        },
      },
      {
        field: "last_login_at",
        headerName: "Last Login",
        flex: 0.9,
        minWidth: 130,
        renderCell: (params) => {
          if (!params.value) {
            return (
              <Typography variant="caption" sx={{ color: theme.palette.text.disabled }}>
                Never
              </Typography>
            );
          }
          const d = dayjs(params.value);
          return (
            <Tooltip title={d.format("MMM D, YYYY · h:mm A")}>
              <Typography variant="body2" sx={{ fontSize: "0.78rem", color: theme.palette.text.secondary }}>
                {d.fromNow()}
              </Typography>
            </Tooltip>
          );
        },
      },
      {
        field: "is_active",
        headerName: "Status",
        width: 110,
        renderCell: (params) => (
          <Chip
            label={params.value ? "Active" : "Inactive"}
            size="small"
            sx={{
              height: 22,
              fontSize: "0.7rem",
              fontWeight: 700,
              bgcolor: params.value
                ? alpha(theme.palette.success.main, 0.12)
                : alpha(theme.palette.text.disabled as string, 0.12),
              color: params.value ? theme.palette.success.dark : theme.palette.text.secondary,
              border: `1px solid ${
                params.value
                  ? alpha(theme.palette.success.main, 0.3)
                  : theme.palette.border.subtle
              }`,
            }}
          />
        ),
      },
      {
        field: "_actions",
        headerName: "",
        width: 140,
        sortable: false,
        filterable: false,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => (
          <Box sx={{ display: "flex", gap: 0.25 }}>
            <Tooltip title="Manage roles">
              <IconButton
                size="small"
                onClick={() => setRoleAssignUser(params.row)}
                sx={{
                  color: theme.palette.text.secondary,
                  "&:hover": {
                    color: theme.palette.primary.main,
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              >
                <ManageAccountsOutlinedIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit user">
              <IconButton
                size="small"
                onClick={() => handleEdit(params.row)}
                sx={{
                  color: theme.palette.text.secondary,
                  "&:hover": {
                    color: theme.palette.primary.main,
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              >
                <EditOutlinedIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
            {params.row.is_active && (
              <Tooltip title="Deactivate user">
                <IconButton
                  size="small"
                  onClick={() => handleDelete(params.row.user_id, params.row.username)}
                  sx={{
                    color: theme.palette.text.secondary,
                    "&:hover": {
                      color: theme.palette.error.main,
                      bgcolor: alpha(theme.palette.error.main, 0.08),
                    },
                  }}
                >
                  <DeleteOutlineOutlinedIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme],
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <ListPageShell
        icon={<PeopleAltOutlinedIcon sx={{ fontSize: 22 }} />}
        title="User Management"
        subtitle="Identities, role assignments, and account status across the workspace."
        actions={
          <>
            {selectedRowIds.length > 0 && (
              <Button
                variant="outlined"
                color="primary"
                startIcon={<GroupAddOutlinedIcon />}
                onClick={() => setBulkAssignOpen(true)}
              >
                Bulk assign ({selectedRowIds.length})
              </Button>
            )}
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<UploadFileOutlinedIcon />}
              onClick={() => setCsvUploadOpen((v) => !v)}
            >
              {csvUploadOpen ? "Close import" : "Bulk import"}
            </Button>
            <Button
              variant="contained"
              startIcon={<PersonAddAltOutlinedIcon />}
              onClick={() => {
                setUserToEdit(null);
                setDrawerOpen(true);
              }}
            >
              Create user
            </Button>
          </>
        }
        kpis={
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <KpiTile
              icon={<PeopleAltOutlinedIcon sx={{ fontSize: 20 }} />}
              label="Total Users"
              value={kpis.total}
              tone="primary"
            />
            <KpiTile
              icon={<VerifiedUserOutlinedIcon sx={{ fontSize: 20 }} />}
              label="Active"
              value={kpis.active}
              tone="success"
            />
            <KpiTile
              icon={<BlockOutlinedIcon sx={{ fontSize: 20 }} />}
              label="Inactive"
              value={kpis.inactive}
              tone="danger"
            />
            <KpiTile
              icon={<ShieldOutlinedIcon sx={{ fontSize: 20 }} />}
              label="With Roles"
              value={kpis.withRoles}
              tone="accent"
            />
          </Stack>
        }
        filters={
          <>
            <TextField
              size="small"
              placeholder="Search name, username or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ minWidth: { xs: "100%", sm: 280 } }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchOutlinedIcon sx={{ fontSize: 18, color: theme.palette.text.disabled }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
              {(["all", "active", "inactive"] as const).map((s) => {
                const active = statusFilter === s;
                return (
                  <Chip
                    key={s}
                    label={s === "all" ? "All" : s === "active" ? "Active" : "Inactive"}
                    onClick={() => setStatusFilter(s)}
                    size="small"
                    sx={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      px: 0.5,
                      bgcolor: active ? theme.palette.primary.main : "transparent",
                      color: active ? theme.palette.primary.contrastText : theme.palette.text.secondary,
                      border: `1px solid ${active ? theme.palette.primary.main : theme.palette.border.subtle}`,
                      cursor: "pointer",
                      "&:hover": {
                        bgcolor: active
                          ? theme.palette.primary.dark
                          : alpha(theme.palette.primary.main, 0.08),
                        borderColor: theme.palette.primary.main,
                      },
                    }}
                  />
                );
              })}
            </Box>
            <Box sx={{ flex: 1 }} />
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
              {filteredRows.length} of {users.length}
            </Typography>
          </>
        }
      >
        {csvUploadOpen && (
          <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.border.subtle}` }}>
            <CsvUploadDropzone onUpload={handleFileUpload} />
          </Box>
        )}
        <StatTable
          rows={filteredRows}
          columns={columns}
          getRowId={(row) => row.user_id}
          loading={loading}
          height="fill"
          pageSizeOptions={[10, 25, 50, 100]}
          initialPageSize={25}
          checkboxSelection
          onRowSelectionModelChange={(model) => {
            const ids = Array.from(model as unknown as Iterable<number>);
            setSelectedRowIds(ids);
          }}
        />
      </ListPageShell>

      {drawerOpen && (
        <UserFormDrawer
          open={drawerOpen}
          userToEdit={userToEdit}
          onClose={() => {
            setDrawerOpen(false);
            setUserToEdit(null);
          }}
          onSuccess={handleSuccess}
        />
      )}

      {bulkAssignOpen && (
        <BulkAssignModal
          open={bulkAssignOpen}
          onClose={() => setBulkAssignOpen(false)}
          selectedUsers={selectedRowIds}
          roles={roles}
          onAssign={handleBulkAssign}
        />
      )}

      {roleAssignUser && (
        <AssignRolesModal
          open={Boolean(roleAssignUser)}
          onClose={() => setRoleAssignUser(null)}
          user={roleAssignUser}
          onSuccess={() => {
            setRoleAssignUser(null);
            fetchUsers();
          }}
        />
      )}

      <ConfirmDialog />
    </Box>
  );
}
