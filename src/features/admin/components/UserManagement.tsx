import { useState, useEffect } from "react";
import { Box, Typography, Button, Switch, FormControlLabel, Paper, Chip, IconButton, Tooltip } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import { userApi, roleApi } from "../api/admin.api";
import UserFormDrawer from "./UserFormDrawer";
import BulkAssignModal from "./BulkAssignModal";
import CsvUploadDropzone from "./CsvUploadDropzone";
import AssignRolesModal from "./AssignRolesModal";

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(false);

  // Drawer & Modal States
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<any>(null);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [csvUploadOpen, setCsvUploadOpen] = useState(false);
  // Store selection as a plain number array to avoid MUI v9 Set issues
  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
  const [roleAssignUser, setRoleAssignUser] = useState<any>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await userApi.getUsers(showInactive);
      setUsers(response.data.users || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
    setLoading(false);
  };

  const fetchRoles = async () => {
    try {
      const response = await roleApi.getRoles(false);
      setRoles(response.data.roles || []);
    } catch (error) {
      console.error("Failed to fetch roles:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
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

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to deactivate this user?")) {
      try {
        await userApi.deleteUser(id);
        fetchUsers();
      } catch (error: any) {
        alert(error.message || "Failed to delete user.");
      }
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
      fetchUsers();
    } catch (error: any) {
      alert(error.message || "Bulk assignment failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (file: File) => {
    alert(`File selected: ${file.name}. CSV Bulk Import feature is ready to be wired up to the backend parser!`);
    setCsvUploadOpen(false);
  };

  const columns: GridColDef[] = [
    { field: "user_id", headerName: "ID", width: 70 },
    { field: "username", headerName: "Username", width: 150 },
    { field: "email", headerName: "Email", width: 220 },
    {
      field: "Roles",
      headerName: "Assigned Roles",
      width: 250,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", alignItems: "center", height: "100%" }}>
          {params.value?.map((role: any) => (
            <Chip key={role.role_id} label={role.role_name} size="small" variant="outlined" color="primary" />
          ))}
          {(!params.value || params.value.length === 0) && (
            <Typography variant="caption" color="text.secondary">No Roles</Typography>
          )}
        </Box>
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
      filterable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Manage Roles">
            <IconButton color="secondary" onClick={() => setRoleAssignUser(params.row)}>
              <ManageAccountsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit User">
            <IconButton color="primary" onClick={() => handleEdit(params.row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {params.row.is_active && (
            <Tooltip title="Deactivate User">
              <IconButton color="error" onClick={() => handleDelete(params.row.user_id)}>
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
          <Typography variant="h4" fontWeight="bold" gutterBottom>User Management</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your organization's users, their roles, and system access.
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <FormControlLabel
            control={<Switch checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />}
            label="Show Inactive"
          />
          {selectedRowIds.length > 0 && (
            <Button variant="outlined" color="secondary" onClick={() => setBulkAssignOpen(true)}>
              Bulk Assign Role ({selectedRowIds.length})
            </Button>
          )}
          <Button variant="outlined" color="primary" onClick={() => setCsvUploadOpen(!csvUploadOpen)}>
            {csvUploadOpen ? "Close CSV Import" : "Bulk Import"}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              setUserToEdit(null);
              setDrawerOpen(true);
            }}
          >
            Create User
          </Button>
        </Box>
      </Box>

      {csvUploadOpen && (
        <Box mb={3}>
          <CsvUploadDropzone onUpload={handleFileUpload} />
        </Box>
      )}

      <Paper sx={{ height: 600, width: "100%", boxShadow: 2, borderRadius: 2 }}>
        <DataGrid
          rows={users}
          columns={columns}
          getRowId={(row) => row.user_id}
          loading={loading}
          checkboxSelection
          disableRowSelectionOnClick
          onRowSelectionModelChange={(newSelection) => {
            // MUI v9 returns a Set-like object; convert to plain array for our state
            const ids = Array.from(newSelection as unknown as Iterable<number>);
            setSelectedRowIds(ids);
          }}
          sx={{ border: 0 }}
        />
      </Paper>

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
          onSuccess={() => { setRoleAssignUser(null); fetchUsers(); }}
        />
      )}
    </Box>
  );
}
