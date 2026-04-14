import { useState } from "react";
import { useEquipmentList } from "@/features/equipment/hooks/useEquipmentHooks";
import { EquipmentTable } from "@/features/equipment/components/EquipmentTable";

// MUI Imports (same as before...)
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
import AddIcon from "@mui/icons-material/Add";
import InventoryIcon from "@mui/icons-material/Inventory2";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

export default function EquipmentRoute() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // 1. Manage the Pagination State here so we can pass it to the API and the Table
  // MUI DataGrid uses 0-indexed pages (0 is page 1). Your API uses 1-indexed.
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 20,
  });

  // 2. Fetch the data. Notice we do `page + 1` to convert MUI's 0-index to your API's 1-index!
  const {
    data: response,
    isLoading,
    isError,
    error,
  } = useEquipmentList(paginationModel.page + 1, paginationModel.pageSize);

  // 3. Extract the paginated data
  const equipmentList = response?.equipment || [];
  const totalRowCount = response?.total || 0;

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

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Typography variant="h4" fontWeight="bold" color="text.primary">
            Equipment Inventory
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsDrawerOpen(true)}
          disableElevation
        >
          Add Equipment
        </Button>
      </div>

      {/* KPI Cards */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card
            elevation={0}
            className="border border-slate-200 rounded-xl bg-white"
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
                {/* Now using the true server count! */}
                <Typography variant="h5" fontWeight="bold">
                  {totalRowCount}
                </Typography>
              </div>
            </CardContent>
          </Card>
        </Grid>
        {/* ... Other two KPI cards remain the same ... */}
      </Grid>

      {/* 4. Pass the pagination props into our Table */}
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
        />
      </Card>
    </div>
  );
}
