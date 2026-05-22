import { Box, LinearProgress, Typography } from "@mui/material";

export function JobProgressBar({
  progress,
  processed,
  total,
  status,
}: {
  progress: number;
  processed?: number | null;
  total?: number | null;
  status: string;
}) {
  const inflight = status === "queued" || status === "processing";
  const failed = status === "failed";
  const cancelled = status === "cancelled";

  const color: "primary" | "success" | "error" | "warning" =
    failed ? "error" : cancelled ? "warning" : progress >= 100 ? "success" : "primary";

  return (
    <Box sx={{ minWidth: 120 }}>
      <LinearProgress
        variant={inflight && progress === 0 ? "indeterminate" : "determinate"}
        value={progress}
        color={color}
        sx={{ height: 6, borderRadius: 99 }}
      />
      <Typography variant="caption" sx={{ color: "#64748b", fontSize: "0.7rem" }}>
        {processed != null && total != null
          ? `${processed.toLocaleString()} / ${total.toLocaleString()}`
          : `${progress}%`}
      </Typography>
    </Box>
  );
}
