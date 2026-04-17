import { useState } from "react";
import { useEquipmentList } from "@/features/equipment/hooks/useEquipmentHooks";

// Feature Components
import { EquipmentTable } from "@/features/equipment/components/EquipmentTable";
import { EquipmentFormDialog } from "@/features/equipment/components/EquipmentFormDialog";
// MUI Imports
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
} from "@mui/material";

// Icons
import AddIcon from "@mui/icons-material/Add";
import InventoryIcon from "@mui/icons-material/Inventory2";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

export default function EquipmentRoute() {
  // --- 1. State Management ---
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // MUI DataGrid uses 0-indexed pages (0 is page 1). Your API uses 1-indexed.
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 20,
  });

  // --- 2. Data Fetching ---
  const {
    data: response,
    isLoading,
    isError,
    error,
  } = useEquipmentList(paginationModel.page + 1, paginationModel.pageSize);

  const equipmentList = response?.equipment || [];
  const totalRowCount = response?.total || 0;

  // --- 3. Handlers ---
  const handleOpenAdd = () => {
    setEditingItem(null); // Clear any existing data
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item); // Load the selected row into state
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    // Optional delay to prevent seeing the form clear while the drawer is sliding shut
    setTimeout(() => setEditingItem(null), 300);
  };

  // --- 4. Loading & Error States ---
  if (isLoading && equipmentList.length === 0) {
    return (
      <Box className="flex h-full items-center justify-center min-h-[400px]">
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert severity="error" className="m-4">
        Failed to load equipment:{" "}
        {error instanceof Error ? error.message : "Unknown error"}
      </Alert>
    );
  }

  // --- 5. Main Render ---
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Typography variant="h4" fontWeight="bold" color="text.primary">
            Equipment Inventory
          </Typography>
          <Typography variant="body2" color="text.secondary" className="mt-1">
            Manage your rental assets, track availability, and monitor
            maintenance.
          </Typography>
        </div>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAdd}
          disableElevation
          sx={{ py: 1.5, px: 3, borderRadius: 2 }}
        >
          Add Equipment
        </Button>
      </div>

      {/* KPI Cards */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card
            elevation={0}
            className="border border-slate-200 rounded-xl bg-white h-full"
          >
            <CardContent className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <InventoryIcon fontSize="large" />
              </div>
              <div>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontWeight="500"
                >
                  Total Assets
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {totalRowCount}
                </Typography>
              </div>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card
            elevation={0}
            className="border border-slate-200 rounded-xl bg-white h-full"
          >
            <CardContent className="flex items-center gap-4">
              <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                <CheckCircleIcon fontSize="large" />
              </div>
              <div>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontWeight="500"
                >
                  Available for Rent
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  -- {/* TODO: Fetch from a /stats API endpoint */}
                </Typography>
              </div>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card
            elevation={0}
            className="border border-slate-200 rounded-xl bg-white h-full"
          >
            <CardContent className="flex items-center gap-4">
              <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
                <BuildCircleIcon fontSize="large" />
              </div>
              <div>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontWeight="500"
                >
                  In Maintenance
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  -- {/* TODO: Fetch from a /stats API endpoint */}
                </Typography>
              </div>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* The Data Table Wrapper */}
      <Card
        elevation={0}
        className="border border-slate-200 rounded-xl overflow-hidden shadow-sm"
      >
        <EquipmentTable
          data={equipmentList}
          isLoading={isLoading}
          rowCount={totalRowCount}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          onEdit={handleOpenEdit} // Wires the Table's pencil icon to the Drawer!
        />
      </Card>

      {/* Change EquipmentFormDrawer to EquipmentFormDialog */}
      <EquipmentFormDialog
        open={isDrawerOpen}
        onClose={handleCloseDrawer}
        initialData={editingItem}
      />
    </div>
  );
}
