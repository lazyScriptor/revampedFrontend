import { useEffect, useMemo, useState } from "react";
import {
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
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import GroupAddOutlinedIcon from "@mui/icons-material/GroupAddOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";

import { roleApi } from "../api/admin.api";
import RoleFormDrawer from "./RoleFormDrawer";
import AssignUsersModal from "./AssignUsersModal";
import { useToast } from "@/components/ui/AppToast";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ListPageShell } from "@/components/layout/ListPageShell";
import { useTranslation } from "react-i18next";
import { tk } from "@/i18n/marker";

type StatusFilter = "all" | "active" | "inactive";

const HIERARCHY_TIERS: { min: number; label: string; color: string }[] = [
  { min: 80, label: tk("admin.roles.tiers.executive"), color: "#7c3aed" },
  { min: 50, label: tk("admin.roles.tiers.manager"), color: "#2563eb" },
  { min: 30, label: tk("admin.roles.tiers.lead"), color: "#0891b2" },
  { min: 10, label: tk("admin.roles.tiers.staff"), color: "#059669" },
  { min: 0, label: tk("admin.roles.tiers.limited"), color: "#64748b" },
];

const tierFor = (level: number) =>
  HIERARCHY_TIERS.find((t) => level >= t.min) ?? HIERARCHY_TIERS[HIERARCHY_TIERS.length - 1];

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

interface RoleCardProps {
  role: any;
  onAssignUsers: (role: any) => void;
  onEdit: (role: any) => void;
  onDelete: (role: any) => void;
}
function RoleCard({ role, onAssignUsers, onEdit, onDelete }: RoleCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const tier = tierFor(role.hierarchy_level);
  const isInactive = !role.is_active;
  const isSystem = role.is_system_default;
  const permCount = role.Permissions?.length ?? 0;

  return (
    <Box
      sx={{
        p: 2.25,
        border: `1px solid ${isInactive ? theme.palette.border.subtle : theme.palette.border.subtle}`,
        borderRadius: 2.5,
        bgcolor: theme.palette.background.paper,
        opacity: isInactive ? 0.55 : 1,
        transition: "border-color 150ms, box-shadow 150ms",
        "&:hover": !isInactive
          ? {
              borderColor: alpha(tier.color, 0.5),
              boxShadow: `0 2px 14px ${alpha(tier.color, 0.12)}`,
            }
          : undefined,
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.75,
              bgcolor: alpha(tier.color, 0.1),
              border: `1.5px solid ${alpha(tier.color, 0.25)}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {isSystem ? (
              <LockOutlinedIcon sx={{ fontSize: 18, color: tier.color }} />
            ) : (
              <ShieldOutlinedIcon sx={{ fontSize: 18, color: tier.color }} />
            )}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 800,
                fontSize: "0.9rem",
                color: theme.palette.text.primary,
                lineHeight: 1.2,
              }}
              noWrap
            >
              {role.role_name}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5, flexWrap: "wrap" }}>
              <Chip
                label={t(tier.label)}
                size="small"
                sx={{
                  height: 17,
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  color: tier.color,
                  bgcolor: alpha(tier.color, 0.1),
                  border: `1px solid ${alpha(tier.color, 0.25)}`,
                  "& .MuiChip-label": { px: 0.75 },
                }}
              />
              <Chip
                label={`L${role.hierarchy_level}`}
                size="small"
                sx={{
                  height: 17,
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  color: theme.palette.text.secondary,
                  bgcolor: theme.palette.surface.muted,
                  "& .MuiChip-label": { px: 0.75 },
                }}
              />
              {isSystem && (
                <Chip
                  label={t("admin.roles.system")}
                  size="small"
                  sx={{
                    height: 17,
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    color: theme.palette.warning.dark,
                    bgcolor: alpha(theme.palette.warning.main, 0.12),
                    "& .MuiChip-label": { px: 0.75 },
                  }}
                />
              )}
              {isInactive && (
                <Chip
                  label={t("common.inactive")}
                  size="small"
                  sx={{
                    height: 17,
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    "& .MuiChip-label": { px: 0.75 },
                  }}
                />
              )}
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 0.25, flexShrink: 0 }}>
          <Tooltip title={t("admin.roles.assignUsers")}>
            <IconButton
              size="small"
              onClick={() => onAssignUsers(role)}
              sx={{
                color: theme.palette.text.secondary,
                "&:hover": {
                  color: theme.palette.primary.main,
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                },
              }}
            >
              <GroupAddOutlinedIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
          {!isSystem && !isInactive && (
            <>
              <Tooltip title={t("admin.roles.editRole")}>
                <IconButton
                  size="small"
                  onClick={() => onEdit(role)}
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
              <Tooltip title={t("admin.roles.deactivateRole")}>
                <IconButton
                  size="small"
                  onClick={() => onDelete(role)}
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
            </>
          )}
        </Box>
      </Box>

      {role.description ? (
        <Typography
          variant="caption"
          sx={{
            color: theme.palette.text.secondary,
            fontSize: "0.72rem",
            display: "block",
            mb: 1.5,
            lineHeight: 1.4,
          }}
        >
          {role.description}
        </Typography>
      ) : (
        <Typography
          variant="caption"
          sx={{
            color: theme.palette.text.disabled,
            fontSize: "0.72rem",
            fontStyle: "italic",
            display: "block",
            mb: 1.5,
          }}
        >
          {t("admin.roles.noDescription")}
        </Typography>
      )}

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mt: "auto",
          py: 1.25,
          px: 1.5,
          borderRadius: 1.5,
          bgcolor: theme.palette.surface.muted,
        }}
      >
        <LayersOutlinedIcon sx={{ fontSize: 16, color: tier.color }} />
        <Typography
          variant="caption"
          sx={{ color: theme.palette.text.secondary, fontSize: "0.7rem" }}
        >
          {t("admin.RoleManagement.permissionsAttached", { count: permCount })}
        </Typography>
      </Box>
    </Box>
  );
}

export default function RoleManagement() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<any>(null);
  const [userAssignRole, setUserAssignRole] = useState<any>(null);

  const { showSuccess, showError } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const showInactive = statusFilter !== "active";

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const response = await roleApi.getRoles(showInactive);
      setRoles(response.data.roles || []);
    } catch (error: any) {
      showError(error.message || t("admin.RoleManagement.failedToFetchRoles"));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive]);

  const handleSuccess = () => {
    setDrawerOpen(false);
    setRoleToEdit(null);
    fetchRoles();
  };

  const handleEdit = (role: any) => {
    setRoleToEdit(role);
    setDrawerOpen(true);
  };

  const handleDelete = async (role: any) => {
    const confirmed = await confirm({
      title: t("admin.RoleManagement.deactivateRole"),
      message: t("admin.RoleManagement.areYouSureYouWant", { role_name: role.role_name }),
      confirmLabel: t("common.deactivate"),
      severity: "error",
    });
    if (!confirmed) return;
    try {
      await roleApi.deleteRole(role.role_id);
      showSuccess(t("admin.RoleManagement.roleHasBeenDeactivated", { role_name: role.role_name }));
      fetchRoles();
    } catch (error: any) {
      showError(error.message || t("admin.RoleManagement.failedToDeactivateRole"));
    }
  };

  const kpis = useMemo(() => {
    const total = roles.length;
    const active = roles.filter((r) => r.is_active).length;
    const system = roles.filter((r) => r.is_system_default).length;
    const custom = roles.filter((r) => !r.is_system_default).length;
    return { total, active, system, custom };
  }, [roles]);

  const filteredRoles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roles
      .filter((r) => {
        if (statusFilter === "active" && !r.is_active) return false;
        if (statusFilter === "inactive" && r.is_active) return false;
        if (!q) return true;
        return (
          (r.role_name || "").toLowerCase().includes(q) ||
          (r.description || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.hierarchy_level - a.hierarchy_level);
  }, [roles, search, statusFilter]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <ListPageShell
        icon={<AdminPanelSettingsOutlinedIcon sx={{ fontSize: 22 }} />}
        title={t("admin.roles.title")}
        subtitle={t("admin.roles.subtitle")}
        actions={
          <Button
            variant="contained"
            startIcon={<AddOutlinedIcon />}
            onClick={() => {
              setRoleToEdit(null);
              setDrawerOpen(true);
            }}
          >
            {t("admin.roles.createRole")}
          </Button>
        }
        kpis={
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <KpiTile
              icon={<ShieldOutlinedIcon sx={{ fontSize: 20 }} />}
              label={t("admin.roles.totalRoles")}
              value={kpis.total}
              tone="primary"
            />
            <KpiTile
              icon={<VerifiedUserOutlinedIcon sx={{ fontSize: 20 }} />}
              label={t("common.active")}
              value={kpis.active}
              tone="success"
            />
            <KpiTile
              icon={<LockOutlinedIcon sx={{ fontSize: 20 }} />}
              label={t("admin.roles.system")}
              value={kpis.system}
              tone="accent"
            />
            <KpiTile
              icon={<LayersOutlinedIcon sx={{ fontSize: 20 }} />}
              label={t("accounting.custom")}
              value={kpis.custom}
              tone="primary"
            />
          </Stack>
        }
        filters={
          <>
            <TextField
              size="small"
              placeholder={t("admin.roles.searchPlaceholder")}
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
                    label={s === "all" ? t("common.all") : s === "active" ? t("common.active") : t("common.inactive")}
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
              {t("admin.RoleManagement.of", { filteredRolesCount: filteredRoles.length, rolesCount: roles.length })}
            </Typography>
          </>
        }
      >
        {/* Role card grid — scrolls inside the shell */}
        <Box sx={{ flex: 1, overflow: "auto", p: { xs: 1.5, md: 2 } }}>
          {loading ? (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }, gap: 2 }}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Box
                  key={i}
                  sx={{
                    height: 156,
                    borderRadius: 2.5,
                    bgcolor: theme.palette.surface.muted,
                    border: `1px solid ${theme.palette.border.subtle}`,
                  }}
                />
              ))}
            </Box>
          ) : filteredRoles.length === 0 ? (
            <Box
              sx={{
                py: 8,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1,
                color: theme.palette.text.disabled,
              }}
            >
              <ShieldOutlinedIcon sx={{ fontSize: 40 }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {t("admin.RoleManagement.noRolesMatchYourFilters")}
              </Typography>
              <Typography variant="caption">
                {t("admin.RoleManagement.tryClearingTheSearchOr")}
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
                gap: 2,
              }}
            >
              {filteredRoles.map((role) => (
                <RoleCard
                  key={role.role_id}
                  role={role}
                  onAssignUsers={(r) => setUserAssignRole(r)}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </Box>
          )}
        </Box>
      </ListPageShell>

      {drawerOpen && (
        <RoleFormDrawer
          open={drawerOpen}
          roleToEdit={roleToEdit}
          onClose={() => {
            setDrawerOpen(false);
            setRoleToEdit(null);
          }}
          onSuccess={handleSuccess}
        />
      )}

      {userAssignRole && (
        <AssignUsersModal
          open={Boolean(userAssignRole)}
          onClose={() => setUserAssignRole(null)}
          role={userAssignRole}
          onSuccess={() => {
            setUserAssignRole(null);
            fetchRoles();
          }}
        />
      )}

      <ConfirmDialog />
    </Box>
  );
}
