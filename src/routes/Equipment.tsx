import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
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

  // --- 2. Data Fetching (Paginated for Table) ---
  const {
    data: response,
    isLoading,
    isError,
    error,
  } = useEquipmentList(paginationModel.page + 1, paginationModel.pageSize);

  const equipmentList = response?.equipment || [];
  const totalRowCount = response?.total || 0;

  // --- 3. GLOBAL STATS ENGINE (For KPI Cards) ---
  // We do a lightweight background fetch to calculate the true fleet health
  // without messing up the paginated table data.
  const { data: globalStats } = useQuery({
    queryKey: ["equipment-global-stats"],
    queryFn: async () => {
      // Fetch a large limit just for math aggregation
      const res = await api.get("/equipment", { params: { limit: 5000 } });
      const allItems = res.data?.data?.equipment || res.data?.equipment || [];

      let available = 0;
      let maintenance = 0;

      allItems.forEach((item: any) => {
        available += Number(item.available_qty || 0);
        maintenance += Number(item.defective_qty || 0);
      });

      return { available, maintenance };
    },
    staleTime: 1000 * 60 * 5, // Cache this math for 5 minutes so it stays snappy
  });

  // --- 4. Handlers ---
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
    // Optional delay to prevent seeing the form clear while the modal/drawer closes
    setTimeout(() => setEditingItem(null), 300);
  };

  // --- 5. Loading & Error States ---
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

  // --- 6. Main Render ---
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
      <Grid container spacing={{ xs: 1.5, md: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
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
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card
            elevation={0}
            className="border border-green-200 rounded-xl bg-green-50/30 h-full"
          >
            <CardContent className="flex items-center gap-4">
              <div className="p-3 bg-green-100 text-green-600 rounded-lg">
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
                <Typography variant="h5" fontWeight="bold" color="success.dark">
                  {globalStats?.available || 0} Units
                </Typography>
              </div>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card
            elevation={0}
            className="border border-orange-200 rounded-xl bg-orange-50/30 h-full"
          >
            <CardContent className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
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
                <Typography variant="h5" fontWeight="bold" color="warning.dark">
                  {globalStats?.maintenance || 0} Units
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
          onEdit={handleOpenEdit}
        />
      </Card>

      <EquipmentFormDialog
        open={isDrawerOpen}
        onClose={handleCloseDrawer}
        initialData={editingItem}
      />
    </div>
  );
}
