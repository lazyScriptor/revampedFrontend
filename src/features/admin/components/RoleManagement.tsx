import React, { useState, useEffect } from "react";
import { Box, Typography, Button, Switch, FormControlLabel, Paper, Chip } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { roleApi } from "../api/admin.api";
import RoleFormDrawer from "./RoleFormDrawer";

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const response = await roleApi.getRoles(showInactive);
      setRoles(response.data.roles || []);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRoles();
  }, [showInactive]);

  const handleSuccess = () => {
    setDrawerOpen(false);
    fetchRoles();
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
        <Typography variant="h4" fontWeight="bold">Role Management</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControlLabel
            control={<Switch checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />}
            label="Show Inactive"
          />
          <Button variant="contained" color="primary" onClick={() => setDrawerOpen(true)}>Create Role</Button>
        </Box>
      </Box>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={roles}
          columns={columns}
          getRowId={(row) => row.role_id}
          loading={loading}
          checkboxSelection
          disableRowSelectionOnClick
        />
      </Paper>

      {drawerOpen && (
        <RoleFormDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onSuccess={handleSuccess}
        />
      )}
    </Box>
  );
}
