import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Stack,
  Chip,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import FolderZipIcon from "@mui/icons-material/FolderZip";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useDownloads } from "../hooks/useBulkJobs";
import { downloadJobUrl } from "../api/bulkJobs.api";
import { formatDisplayDate } from "@/lib/dates";

const formatBytes = (n: number): string => {
  if (!n) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let val = n;
  let i = 0;
  while (val >= 1024 && i < units.length - 1) {
    val = val / 1024;
    i += 1;
  }
  return `${val.toFixed(val < 10 ? 1 : 0)} ${units[i]}`;
};

export function DownloadsTable() {
  const { data, isLoading, isFetching } = useDownloads();
  const rows = (data || []).map((d) => ({ ...d, id: d.job_id }));
  const totalSize = (data || []).reduce((sum, d) => sum + (d.file_size_bytes || 0), 0);

  const columns: GridColDef[] = [
    {
      field: "operation",
      headerName: "File",
      flex: 1.4,
      minWidth: 240,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
          <FolderZipIcon sx={{ color: "#94a3b8", fontSize: 22 }} />
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a" }}>
              {String(p.value || "").replace(/_/g, " ")}
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748b" }}>
              Job #{p.row.job_id} · {p.row.entity || "—"}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: "file_size_bytes",
      headerName: "Size",
      width: 110,
      renderCell: (p) => (
        <Typography variant="caption" sx={{ color: "#475569", fontWeight: 700 }}>
          {formatBytes(p.value as number)}
        </Typography>
      ),
    },
    {
      field: "finished_at",
      headerName: "Generated",
      width: 140,
      renderCell: (p) => (
        <Typography variant="caption" sx={{ color: "#475569" }}>
          {p.value ? formatDisplayDate(String(p.value).slice(0, 10)) : "—"}
        </Typography>
      ),
    },
    {
      field: "actions",
      headerName: "",
      width: 80,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={0.25}>
          <Tooltip title="Download">
            <IconButton
              size="small"
              component="a"
              href={downloadJobUrl(p.row.job_id)}
              target="_blank"
              rel="noopener"
            >
              <DownloadIcon sx={{ fontSize: 18, color: "primary.main" }} />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <Paper
      elevation={0}
      sx={{ p: 0, border: "1px solid #e2e8f0", borderRadius: 2.5, bgcolor: "white", overflow: "hidden" }}
    >
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <Box>
          <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1.5, color: "#64748b" }}>
            GENERATED FILES
          </Typography>
          <Typography variant="body2" sx={{ color: "#475569" }}>
            All export artifacts you can re-download.
          </Typography>
        </Box>
        <Chip
          label={`Total: ${formatBytes(totalSize)}`}
          size="small"
          sx={{ bgcolor: "#f1f5f9", color: "#475569", fontWeight: 700 }}
        />
      </Box>

      <DataGrid
        rows={rows}
        columns={columns}
        loading={isLoading || isFetching}
        autoHeight
        disableRowSelectionOnClick
        getRowId={(r) => r.job_id}
        pageSizeOptions={[10, 25]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        sx={{
          border: 0,
          "& .MuiDataGrid-columnHeaders": { bgcolor: "#f8fafc", borderBottom: "1px solid #e2e8f0" },
          "& .MuiDataGrid-cell": { borderColor: "#f1f5f9" },
        }}
      />
    </Paper>
  );
}
