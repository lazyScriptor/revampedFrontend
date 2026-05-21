import { useMemo } from "react";
import {
  DataGrid,
  GridColDef,
  GridRowsProp,
  GridSortModel,
  GridPaginationModel,
} from "@mui/x-data-grid";
import { Box } from "@mui/material";

interface StatTableProps {
  rows: GridRowsProp;
  columns: GridColDef[];
  loading?: boolean;
  rowCount?: number;
  getRowId?: (row: any) => string | number;
  paginationMode?: "client" | "server";
  paginationModel?: GridPaginationModel;
  onPaginationModelChange?: (m: GridPaginationModel) => void;
  sortModel?: GridSortModel;
  onSortModelChange?: (m: GridSortModel) => void;
  pageSizeOptions?: number[];
  height?: number | string;
}

// Thin wrapper around MUI DataGrid with the styling reports use everywhere —
// borderless, hidden default toolbar, sensible defaults, consistent row height.
export function StatTable({
  rows,
  columns,
  loading,
  rowCount,
  getRowId,
  paginationMode = "client",
  paginationModel,
  onPaginationModelChange,
  sortModel,
  onSortModelChange,
  pageSizeOptions = [10, 25, 50, 100],
  height = 560,
}: StatTableProps) {
  const memoCols = useMemo(() => columns, [columns]);
  return (
    <Box sx={{ height, width: "100%", bgcolor: "background.paper", borderRadius: 2.5, overflow: "hidden" }}>
      <DataGrid
        rows={rows}
        columns={memoCols}
        loading={loading}
        rowCount={rowCount}
        getRowId={getRowId}
        paginationMode={paginationMode}
        paginationModel={paginationModel}
        onPaginationModelChange={onPaginationModelChange}
        sortingMode={paginationMode}
        sortModel={sortModel}
        onSortModelChange={onSortModelChange}
        pageSizeOptions={pageSizeOptions}
        disableRowSelectionOnClick
        sx={{
          border: "none",
          "& .MuiDataGrid-columnHeaders": { bgcolor: "#f8fafc", fontWeight: 700 },
          "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": { outline: "none" },
          "& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within": { outline: "none" },
        }}
      />
    </Box>
  );
}
