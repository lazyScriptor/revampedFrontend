import { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  Stack,
} from "@mui/material";
import CancelIcon from "@mui/icons-material/Cancel";
import DownloadIcon from "@mui/icons-material/Download";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useBulkJobsList, useCancelJob } from "../hooks/useBulkJobs";
import { JobStatusChip } from "./JobStatusChip";
import { JobProgressBar } from "./JobProgressBar";
import { downloadJobUrl, BulkJobStatus, BulkJobMode } from "../api/bulkJobs.api";
import { formatDisplayDate } from "@/lib/dates";

const STATUS_OPTIONS: { value: BulkJobStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "queued", label: "Queued" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "awaiting_confirmation", label: "Awaiting confirmation" },
];

const MODE_OPTIONS: { value: BulkJobMode | ""; label: string }[] = [
  { value: "", label: "All modes" },
  { value: "import", label: "Imports" },
  { value: "export", label: "Exports" },
  { value: "bulk_action", label: "Bulk actions" },
  { value: "preview", label: "Previews" },
];

export function JobHistoryTable() {
  const [status, setStatus] = useState<BulkJobStatus | "">("");
  const [mode, setMode] = useState<BulkJobMode | "">("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const { data, isLoading, isFetching } = useBulkJobsList({
    status: status || undefined,
    mode: mode || undefined,
    page: page + 1,
    limit: pageSize,
  });

  const cancelJob = useCancelJob();

  const columns: GridColDef[] = [
    { field: "job_id", headerName: "Job #", width: 80 },
    {
      field: "operation",
      headerName: "Operation",
      flex: 1.4,
      minWidth: 220,
      renderCell: (p) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a" }}>
            {String(p.value || "").replace(/_/g, " ")}
          </Typography>
          <Typography variant="caption" sx={{ color: "#64748b" }}>
            {p.row.entity || "—"} · {p.row.mode}
          </Typography>
        </Box>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 140,
      renderCell: (p) => <JobStatusChip status={p.value as BulkJobStatus} />,
    },
    {
      field: "progress",
      headerName: "Progress",
      flex: 1,
      minWidth: 180,
      renderCell: (p) => (
        <JobProgressBar
          progress={p.value as number}
          processed={p.row.processed_count}
          total={p.row.total_count}
          status={p.row.status}
        />
      ),
      sortable: false,
    },
    {
      field: "createdAt",
      headerName: "Queued",
      width: 130,
      renderCell: (p) => (
        <Typography variant="caption" sx={{ color: "#475569" }}>
          {formatDisplayDate(String(p.value).slice(0, 10))}
        </Typography>
      ),
    },
    {
      field: "actions",
      headerName: "",
      width: 130,
      sortable: false,
      filterable: false,
      renderCell: (p) => {
        const row = p.row;
        const canCancel = row.status === "queued" || row.status === "processing";
        const canDownload =
          (row.status === "completed" || row.status === "awaiting_confirmation") &&
          row.output_file_path;
        return (
          <Stack direction="row" spacing={0.25}>
            {canDownload && (
              <Tooltip title="Download output">
                <IconButton
                  size="small"
                  component="a"
                  href={downloadJobUrl(row.job_id)}
                  target="_blank"
                  rel="noopener"
                >
                  <DownloadIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
            {canCancel && (
              <Tooltip title="Cancel">
                <IconButton
                  size="small"
                  onClick={() => cancelJob.mutate(row.job_id)}
                  disabled={cancelJob.isPending}
                >
                  <CancelIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Details">
              <IconButton size="small" disabled>
                <VisibilityIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        );
      },
    },
  ];

  const rows = (data?.jobs || []).map((j) => ({ ...j, id: j.job_id }));

  return (
    <Paper
      elevation={0}
      sx={{
        p: 0,
        border: "1px solid #e2e8f0",
        borderRadius: 2.5,
        bgcolor: "white",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          p: 2,
          display: "flex",
          gap: 2,
          flexWrap: "wrap",
          alignItems: "center",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <TextField
          select
          size="small"
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          sx={{ minWidth: 180 }}
        >
          {STATUS_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Mode"
          value={mode}
          onChange={(e) => setMode(e.target.value as any)}
          sx={{ minWidth: 180 }}
        >
          {MODE_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <DataGrid
        rows={rows}
        columns={columns}
        loading={isLoading || isFetching}
        autoHeight
        pageSizeOptions={[10, 25, 50]}
        paginationModel={{ page, pageSize }}
        onPaginationModelChange={(m) => {
          setPage(m.page);
          setPageSize(m.pageSize);
        }}
        rowCount={data?.total || 0}
        paginationMode="server"
        disableRowSelectionOnClick
        getRowId={(r) => r.job_id}
        sx={{
          border: 0,
          "& .MuiDataGrid-columnHeaders": { bgcolor: "#f8fafc", borderBottom: "1px solid #e2e8f0" },
          "& .MuiDataGrid-cell": { borderColor: "#f1f5f9" },
        }}
      />
    </Paper>
  );
}
