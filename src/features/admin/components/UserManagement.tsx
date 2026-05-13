import React, { useState, useEffect } from "react";
import { Box, Typography, Button, Switch, FormControlLabel, Paper, Chip } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { userApi } from "../api/admin.api";
import UserFormDrawer from "./UserFormDrawer";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await userApi.getUsers(showInactive);
      setUsers(response.data.users || []);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [showInactive]);

  const handleSuccess = () => {
    setDrawerOpen(false);
    fetchUsers();
  };

  const columns: GridColDef[] = [
    { field: "user_id", headerName: "ID", width: 70 },
    { field: "username", headerName: "Username", width: 150 },
    { field: "email", headerName: "Email", width: 250 },
    { 
      field: "Roles", 
      headerName: "Roles", 
      width: 250,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {params.value?.map((role: any) => (
            <Chip key={role.role_id} label={role.role_name} size="small" />
          ))}
        </Box>
      )
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
      )
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">User Management</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControlLabel
            control={<Switch checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />}
            label="Show Inactive"
          />
          <Button variant="contained" color="primary" onClick={() => setDrawerOpen(true)}>Create User</Button>
          <Button variant="outlined" color="primary">Bulk Import</Button>
        </Box>
      </Box>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={users}
          columns={columns}
          getRowId={(row) => row.user_id}
          loading={loading}
          checkboxSelection
          disableRowSelectionOnClick
        />
      </Paper>

      {drawerOpen && (
        <UserFormDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onSuccess={handleSuccess}
        />
      )}
    </Box>
  );
}
