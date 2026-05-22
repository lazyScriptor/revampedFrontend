import { useMemo, useState } from "react";
import {
  DataGrid,
  GridColDef,
  GridRowsProp,
  GridSortModel,
  GridPaginationModel,
  GridRowSelectionModel,
} from "@mui/x-data-grid";
import { Box, useTheme } from "@mui/material";

interface StatTableProps {
  rows: GridRowsProp;
  columns: GridColDef[];
  loading?: boolean;
  rowCount?: number;
  getRowId?: (row: any) => string | number;
  paginationMode?: "client" | "server";
  /**
   * Optional controlled paginationModel. When omitted, the component manages
   * its own internal pagination state so the dropdown + next/prev buttons
   * always work regardless of caller wiring.
   */
  paginationModel?: GridPaginationModel;
  onPaginationModelChange?: (m: GridPaginationModel) => void;
  sortModel?: GridSortModel;
  onSortModelChange?: (m: GridSortModel) => void;
  pageSizeOptions?: number[];
  /**
   * Height behavior:
   *  - "fill"        — table fills its parent (parent must be flex, height-known); recommended for list pages
   *  - number/string — fixed height (e.g. 560 or "70vh"); legacy default for backwards compat
   */
  height?: number | string | "fill";
  /**
   * Initial page size used when no paginationModel is passed. Defaults to the
   * first value in pageSizeOptions so the dropdown UI matches the active size.
   */
  initialPageSize?: number;
  /** Show row-selection checkboxes. */
  checkboxSelection?: boolean;
  /** Controlled row selection model. */
  rowSelectionModel?: GridRowSelectionModel;
  /** Called when row selection changes (passes the raw v9 model). */
  onRowSelectionModelChange?: (model: GridRowSelectionModel) => void;
}

// Thin wrapper around MUI DataGrid with the project's consistent styling.
// Designed to "just work" when callers pass minimal props — internal
// pagination state kicks in if the caller doesn't supply paginationModel.
export function StatTable({
  rows,
  columns,
  loading,
  rowCount,
  getRowId,
  paginationMode = "client",
  paginationModel: controlledModel,
  onPaginationModelChange,
  sortModel,
  onSortModelChange,
  pageSizeOptions = [10, 25, 50, 100],
  height = 560,
  initialPageSize,
  checkboxSelection,
  rowSelectionModel,
  onRowSelectionModelChange,
}: StatTableProps) {
  const theme = useTheme();
  const memoCols = useMemo(() => columns, [columns]);

  // Internal fallback model so reports that forget to pass paginationModel
  // still get a working "10 / 25 / 50 / 100" dropdown that actually paginates.
  const initialModel = useMemo(
    () => ({
      page: 0,
      pageSize: initialPageSize || pageSizeOptions[0] || 25,
    }),
    [initialPageSize, pageSizeOptions],
  );
  const [internalModel, setInternalModel] = useState<GridPaginationModel>(initialModel);

  const effectiveModel = controlledModel ?? internalModel;
  const handleModelChange = (m: GridPaginationModel) => {
    if (controlledModel === undefined) setInternalModel(m);
    onPaginationModelChange?.(m);
  };

  // Make sure the active pageSize is always part of the dropdown options;
  // MUI X v9 won't render the menu correctly if the current size is missing.
  const safeOptions = useMemo(() => {
    const set = new Set(pageSizeOptions);
    set.add(effectiveModel.pageSize);
    return Array.from(set).sort((a, b) => a - b);
  }, [pageSizeOptions, effectiveModel.pageSize]);

  const heightStyles =
    height === "fill"
      ? { flex: 1, minHeight: 0, height: "100%" }
      : { height };

  return (
    <Box
      sx={{
        ...heightStyles,
        width: "100%",
        bgcolor: theme.palette.background.paper,
        borderRadius: 2.5,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <DataGrid
        rows={rows}
        columns={memoCols}
        loading={loading}
        // Always provide a numeric rowCount in server mode — undefined makes v9
        // disable the next-page button entirely while data is loading.
        rowCount={
          paginationMode === "server" ? Math.max(0, rowCount ?? rows.length) : undefined
        }
        getRowId={getRowId}
        paginationMode={paginationMode}
        paginationModel={effectiveModel}
        onPaginationModelChange={handleModelChange}
        sortingMode={paginationMode}
        sortModel={sortModel}
        onSortModelChange={onSortModelChange}
        pageSizeOptions={safeOptions}
        checkboxSelection={checkboxSelection}
        rowSelectionModel={rowSelectionModel}
        onRowSelectionModelChange={onRowSelectionModelChange}
        disableRowSelectionOnClick
        sx={{
          flex: 1,
          minHeight: 0,
          border: "none",
          "& .MuiDataGrid-columnHeaders": {
            bgcolor: theme.palette.surface.muted,
            fontWeight: 700,
            borderBottom: `1px solid ${theme.palette.border.subtle}`,
          },
          "& .MuiDataGrid-cell": { borderColor: theme.palette.border.subtle },
          "& .MuiDataGrid-row:hover": { bgcolor: theme.palette.surface.muted },
          "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": { outline: "none" },
          "& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within": {
            outline: "none",
          },
          "& .MuiDataGrid-footerContainer": {
            borderTop: `1px solid ${theme.palette.border.subtle}`,
            bgcolor: theme.palette.background.paper,
          },
        }}
      />
    </Box>
  );
}
