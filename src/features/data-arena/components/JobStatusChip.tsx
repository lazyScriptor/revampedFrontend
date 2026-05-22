import { Chip } from "@mui/material";
import { BulkJobStatus } from "../api/bulkJobs.api";

const MAP: Record<BulkJobStatus, { label: string; color: string; bg: string }> = {
  queued:            { label: "Queued",       color: "#475569", bg: "#e2e8f0" },
  processing:        { label: "Processing",   color: "#1d4ed8", bg: "#dbeafe" },
  completed:         { label: "Completed",    color: "#15803d", bg: "#dcfce7" },
  failed:            { label: "Failed",       color: "#b91c1c", bg: "#fee2e2" },
  cancelled:         { label: "Cancelled",    color: "#7c2d12", bg: "#fed7aa" },
  awaiting_confirmation: { label: "Preview",  color: "#a16207", bg: "#fef3c7" },
};

export function JobStatusChip({ status }: { status: BulkJobStatus }) {
  const s = MAP[status] || MAP.queued;
  return (
    <Chip
      label={s.label}
      size="small"
      sx={{
        bgcolor: s.bg,
        color: s.color,
        fontWeight: 700,
        fontSize: "0.7rem",
        height: 22,
      }}
    />
  );
}
