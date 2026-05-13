import { useState, useEffect } from "react";
import { Box, Typography, Button, Switch, FormControlLabel, Paper, Chip, IconButton, Tooltip } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import { roleApi } from "../api/admin.api";
import RoleFormDrawer from "./RoleFormDrawer";
import AssignUsersModal from "./AssignUsersModal";
import { useToast } from "@/components/ui/AppToast";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

export default function RoleManagement() {
  const [roles, setRoles] = useState<any[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(false);

  // Dialog & Modal States
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<any>(null);
  const [userAssignRole, setUserAssignRole] = useState<any>(null);

  const { showSuccess, showError } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const response = await roleApi.getRoles(showInactive);
      setRoles(response.data.roles || []);
    } catch (error: any) {
      showError(error.message || "Failed to fetch roles.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRoles();
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

  const handleDelete = async (id: number, roleName: string) => {
    const confirmed = await confirm({
      title: "Deactivate Role",
      message: `Are you sure you want to deactivate the role "${roleName}"? Users assigned to this role will lose its permissions.`,
      confirmLabel: "Deactivate",
      severity: "error",
    });
    if (!confirmed) return;
    try {
      await roleApi.deleteRole(id);
      showSuccess(`Role "${roleName}" has been deactivated.`);
      fetchRoles();
    } catch (error: any) {
      showError(error.message || "Failed to deactivate role.");
    }
  };

  const columns: GridColDef[] = [
    { field: "role_id", headerName: "ID", width: 70 },
    { field: "role_name", headerName: "Role Name", width: 200 },
    { field: "hierarchy_level", headerName: "Hierarchy Level", width: 150 },
    {
      field: "is_system_default",
      headerName: "System Default",
      width: 150,
      renderCell: (params) => (
        params.value ? <Chip label="Yes" color="warning" size="small" /> : <Chip label="No" size="small" />
      ),
    },
    {
      field: "is_active",
      headerName: "Status",
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value ? "Active" : "Inactive"}
          color={params.value ? "success" : "default"}
          size="small"
        />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Assign Users">
            <IconButton color="secondary" onClick={() => setUserAssignRole(params.row)}>
              <GroupAddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit Role">
            <IconButton color="primary" onClick={() => handleEdit(params.row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {params.row.is_active && !params.row.is_system_default && (
            <Tooltip title="Deactivate Role">
              <IconButton color="error" onClick={() => handleDelete(params.row.role_id, params.row.role_name)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: "0 auto" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>Role Management</Typography>
          <Typography variant="body2" color="text.secondary">Create and manage access levels and enterprise hierarchies.</Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <FormControlLabel
            control={<Switch checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />}
            label="Show Inactive"
          />
          <Button variant="contained" color="primary" onClick={() => { setRoleToEdit(null); setDrawerOpen(true); }}>
            Create Role
          </Button>
        </Box>
      </Box>

      <Paper sx={{ height: 600, width: "100%", boxShadow: 2, borderRadius: 2 }}>
        <DataGrid
          rows={roles}
          columns={columns}
          getRowId={(row) => row.role_id}
          loading={loading}
          disableRowSelectionOnClick
          sx={{ border: 0 }}
        />
      </Paper>

      {drawerOpen && (
        <RoleFormDrawer
          open={drawerOpen}
          roleToEdit={roleToEdit}
          onClose={() => { setDrawerOpen(false); setRoleToEdit(null); }}
          onSuccess={handleSuccess}
        />
      )}

      {userAssignRole && (
        <AssignUsersModal
          open={Boolean(userAssignRole)}
          onClose={() => setUserAssignRole(null)}
          role={userAssignRole}
          onSuccess={() => { setUserAssignRole(null); fetchRoles(); }}
        />
      )}

      <ConfirmDialog />
    </Box>
  );
}
