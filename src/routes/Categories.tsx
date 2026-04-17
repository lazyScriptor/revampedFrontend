import { useState } from "react";
import { useCategoryList } from "@/features/equipment/hooks/useCategoryHooks";
import { CategoryTable } from "@/features/equipment/components/CategoryTable";
import { CategoryFormDrawer } from "@/features/equipment/components/CategoryFormDrawer";

import {
  Box,
  Button,
  Typography,
  Card,
  CircularProgress,
  Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ClassIcon from "@mui/icons-material/Class";

export default function CategoriesRoute() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 20,
  });

  const {
    data: response,
    isLoading,
    isError,
    error,
  } = useCategoryList(paginationModel.page + 1, paginationModel.pageSize);

  const categoryList = response?.categories || [];
  const totalRowCount = response?.total || 0;

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setEditingItem(null), 300);
  };

  if (isLoading && categoryList.length === 0) {
    return (
      <Box className="flex h-full items-center justify-center min-h-[400px]">
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert severity="error" className="m-4">
        Failed to load categories:{" "}
        {error instanceof Error ? error.message : "Unknown error"}
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Typography variant="h4" fontWeight="bold" color="text.primary">
            Equipment Categories
          </Typography>
          <Typography variant="body2" color="text.secondary" className="mt-1">
            Organize your inventory into logical groupings.
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAdd}
          disableElevation
          sx={{ py: 1.5, px: 3, borderRadius: 2 }}
        >
          Add Category
        </Button>
      </div>

      {/* Main Table Wrapper */}
      <Card
        elevation={0}
        className="border border-slate-200 rounded-xl overflow-hidden shadow-sm"
      >
        {/* Simple inline stat header inside the card to keep UI clean */}
        <Box className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-white">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <ClassIcon fontSize="small" />
          </div>
          <Typography variant="subtitle1" fontWeight="600" color="text.primary">
            {totalRowCount} Total Categories
          </Typography>
        </Box>
        <CategoryTable
          data={categoryList}
          isLoading={isLoading}
          rowCount={totalRowCount}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          onEdit={handleOpenEdit}
        />
      </Card>

      <CategoryFormDrawer
        open={isDrawerOpen}
        onClose={handleCloseDrawer}
        initialData={editingItem}
      />
    </div>
  );
}
