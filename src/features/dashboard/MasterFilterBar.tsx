import React from "react";
import {
  Box,
  TextField,
  MenuItem,
  Button,
  Typography,
  Paper,
} from "@mui/material";
import { FilterList, Refresh } from "@mui/icons-material";
import { useQueryClient } from "@tanstack/react-query";
import { useDashboardStore } from "@/stores/useDashboardStore";

const MasterFilterBar: React.FC = () => {
  const globalFilters = useDashboardStore((s) => s.globalFilters);
  const updateFilter = useDashboardStore((s) => s.updateFilter);
  const queryClient = useQueryClient();

  // Example warehouses - typically fetched from your warehouse hook
  const warehouses = [
    { id: "all", name: "All Warehouses" },
    { id: 1, name: "Main Depot - Colombo" },
    { id: 2, name: "North Branch" },
  ];

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["dashboard", "kpis"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", "utilization"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", "returns-today"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", "maintenance"] });
  };

  return (
    <Paper
      elevation={0}
      sx={{
        px: 3,
        py: 1.5,
        borderBottom: "1px solid",
        borderColor: "divider",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 2,
        bgcolor: "background.paper",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <FilterList fontSize="small" color="action" />
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
          Global Context
        </Typography>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <TextField
          select
          size="small"
          value={globalFilters.warehouseId || "all"}
          onChange={(e) =>
            updateFilter(
              "warehouseId",
              e.target.value === "all" ? null : Number(e.target.value),
            )
          }
          sx={{ minWidth: 200 }}
        >
          {warehouses.map((w) => (
            <MenuItem key={w.id} value={w.id}>
              {w.name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          type="date"
          size="small"
          label="From"
          slotProps={{ inputLabel: { shrink: true } }}
          value={globalFilters.startDate}
          onChange={(e) => updateFilter("startDate", e.target.value)}
        />

        <TextField
          type="date"
          size="small"
          label="To"
          slotProps={{ inputLabel: { shrink: true } }}
          value={globalFilters.endDate}
          onChange={(e) => updateFilter("endDate", e.target.value)}
        />

        <Button
          variant="outlined"
          size="small"
          startIcon={<Refresh />}
          onClick={handleRefresh}
        >
          Refresh
        </Button>
      </Box>
    </Paper>
  );
};

export default MasterFilterBar;
