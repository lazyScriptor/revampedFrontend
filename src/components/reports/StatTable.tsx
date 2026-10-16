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
  paginationModel?: GridPaginationModel;
  onPaginationModelChange?: (m: GridPaginationModel) => void;
  sortModel?: GridSortModel;
  onSortModelChange?: (m: GridSortModel) => void;
  pageSizeOptions?: number[];
  height?: number | string | "fill";
  initialPageSize?: number;
  checkboxSelection?: boolean;
  rowSelectionModel?: GridRowSelectionModel;
  onRowSelectionModelChange?: (model: GridRowSelectionModel) => void;
}

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
  const isDark = theme.palette.mode === "dark";

  // Enhance columns with default tabular numerics and crisp headers
  const enhancedCols = useMemo(() => {
    return columns.map((col) => ({
      ...col,
      headerClassName: "report-grid-header",
      cellClassName: (params: any) => {
        const custom = typeof col.cellClassName === "function" ? col.cellClassName(params) : col.cellClassName || "";
        return `${custom} ${col.type === "number" ? "tabular-nums" : ""}`;
      },
    }));
  }, [columns]);

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

  const safeOptions = useMemo(() => {
    const set = new Set(pageSizeOptions);
    set.add(effectiveModel.pageSize);
    return Array.from(set).sort((a, b) => a - b);
  }, [pageSizeOptions, effectiveModel.pageSize]);

  const heightStyles =
    height === "fill"
      ? { flex: 1, minHeight: 0, height: "100%" }
      : { height, minHeight: 0 };

  return (
    <Box
      sx={{
        ...heightStyles,
        width: "100%",
        bgcolor: isDark ? "#0f172a" : "#ffffff",
        border: "1px solid",
        borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0",
        borderRadius: 3,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: isDark ? "0 4px 20px -2px rgba(0,0,0,0.3)" : "0 1px 3px rgba(15,23,42,0.06)",
      }}
    >
      <DataGrid
        rows={rows}
        columns={enhancedCols}
        loading={loading}
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
        getRowHeight={() => "auto"}
        getEstimatedRowHeight={() => 62}
        sx={{
          flex: 1,
          minHeight: 0,
          border: "none",
          color: isDark ? "#f8fafc" : "#0f172a",
          fontFamily: "'Inter', sans-serif",
          "& .MuiDataGrid-columnHeaders": {
            bgcolor: isDark ? "#1e293b" : "#f8fafc",
            fontWeight: 700,
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: isDark ? "#94a3b8" : "#475569",
            borderBottom: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
            minHeight: "44px !important",
          },
          "& .MuiDataGrid-row": {
            borderBottom: isDark ? "1px solid rgba(51, 65, 85, 0.4)" : "1px solid #f1f5f9",
            bgcolor: isDark ? "#0f172a" : "#ffffff",
            minHeight: "56px !important",
            transition: "background-color 120ms ease",
            "&:nth-of-type(even)": {
              bgcolor: isDark ? "rgba(30, 41, 59, 0.3)" : "#fafbfc",
            },
            "&:hover": {
              bgcolor: isDark ? "rgba(30, 41, 59, 0.7)" : "#f1f5f9",
            },
            "&.Mui-selected": {
              bgcolor: isDark ? "rgba(56, 189, 248, 0.15)" : "#eff6ff",
              "&:hover": {
                bgcolor: isDark ? "rgba(56, 189, 248, 0.25)" : "#dbeafe",
              },
            },
          },
          "& .MuiDataGrid-cell": {
            borderColor: isDark ? "rgba(51, 65, 85, 0.4)" : "#f1f5f9",
            py: { xs: 1, sm: 1.25 },
            px: { xs: 1, sm: 1.5 },
            display: "flex",
            alignItems: "center",
            fontSize: "0.85rem",
            color: isDark ? "#f8fafc" : "#0f172a",
            "&.tabular-nums": {
              fontVariantNumeric: "tabular-nums",
              fontFamily: "'JetBrains Mono', monospace",
            },
          },
          "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": {
            outline: "none",
          },
          "& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within": {
            outline: "none",
          },
          "& .MuiDataGrid-footerContainer": {
            borderTop: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
            bgcolor: isDark ? "#1e293b" : "#ffffff",
            color: isDark ? "#94a3b8" : "#64748b",
            fontSize: "0.8rem",
            "& .MuiTablePagination-root": {
              color: isDark ? "#94a3b8" : "inherit",
              fontVariantNumeric: "tabular-nums",
            },
          },
        }}
      />
    </Box>
  );
}
