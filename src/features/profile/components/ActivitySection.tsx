import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Divider,
  Chip,
} from "@mui/material";
import { useMyActivity, useMyRecentWork } from "../hooks/useMe";
import { formatDisplayDate } from "@/lib/dates";

const StatusChip = ({ status }: { status: string }) => {
  const tone: Record<string, { bg: string; color: string }> = {
    completed: { bg: "#dcfce7", color: "#15803d" },
    queued: { bg: "#e2e8f0", color: "#475569" },
    processing: { bg: "#dbeafe", color: "#1d4ed8" },
    failed: { bg: "#fee2e2", color: "#b91c1c" },
    cancelled: { bg: "#fed7aa", color: "#7c2d12" },
    awaiting_confirmation: { bg: "#fef3c7", color: "#a16207" },
  };
  const t = tone[status] || tone.queued;
  return (
    <Chip
      label={status.replace(/_/g, " ")}
      size="small"
      sx={{ bgcolor: t.bg, color: t.color, fontWeight: 700, fontSize: "0.7rem", height: 20 }}
    />
  );
};

export function ActivitySection() {
  const activity = useMyActivity(25);
  const work = useMyRecentWork(10);

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
      {/* Recent notifications */}
      <Paper
        elevation={0}
        sx={{ p: 2.5, border: "1px solid #e2e8f0", borderRadius: 2.5, bgcolor: "white" }}
      >
        <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1.5, color: "#64748b" }}>
          RECENT NOTIFICATIONS
        </Typography>
        {activity.isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={20} />
          </Box>
        ) : (activity.data?.notifications || []).length === 0 ? (
          <Typography variant="body2" sx={{ color: "#94a3b8", py: 2 }}>
            No notifications yet.
          </Typography>
        ) : (
          <Box>
            {activity.data!.notifications.map((n: any, i: number, arr: any[]) => (
              <Box key={n.notification_id}>
                <Box sx={{ py: 1.25 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a" }}>
                    {n.title}
                  </Typography>
                  {n.message && (
                    <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
                      {n.message}
                    </Typography>
                  )}
                  <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                    {formatDisplayDate(String(n.createdAt).slice(0, 10))}
                  </Typography>
                </Box>
                {i < arr.length - 1 && <Divider />}
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {/* Recent bulk jobs */}
      <Paper
        elevation={0}
        sx={{ p: 2.5, border: "1px solid #e2e8f0", borderRadius: 2.5, bgcolor: "white" }}
      >
        <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1.5, color: "#64748b" }}>
          RECENT BULK JOBS
        </Typography>
        {activity.isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={20} />
          </Box>
        ) : (activity.data?.bulk_jobs || []).length === 0 ? (
          <Typography variant="body2" sx={{ color: "#94a3b8", py: 2 }}>
            You haven't run any bulk operations yet.
          </Typography>
        ) : (
          <Box>
            {activity.data!.bulk_jobs.map((j: any, i: number, arr: any[]) => (
              <Box key={j.job_id}>
                <Box
                  sx={{
                    py: 1.25,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a" }}>
                      {String(j.operation || "").replace(/_/g, " ")}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                      Job #{j.job_id} · {formatDisplayDate(String(j.createdAt).slice(0, 10))}
                    </Typography>
                  </Box>
                  <StatusChip status={j.status} />
                </Box>
                {i < arr.length - 1 && <Divider />}
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {/* Recent invoices */}
      <Paper
        elevation={0}
        sx={{ p: 2.5, border: "1px solid #e2e8f0", borderRadius: 2.5, bgcolor: "white" }}
      >
        <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1.5, color: "#64748b" }}>
          RECENT INVOICES YOU ISSUED
        </Typography>
        {work.isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={20} />
          </Box>
        ) : (work.data?.recent_invoices || []).length === 0 ? (
          <Typography variant="body2" sx={{ color: "#94a3b8", py: 2 }}>
            You haven't issued any invoices yet.
          </Typography>
        ) : (
          <Box>
            {work.data!.recent_invoices.map((inv: any, i: number, arr: any[]) => (
              <Box key={inv.invoice_id}>
                <Box
                  sx={{
                    py: 1.25,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a" }}>
                      Invoice #{inv.invoice_id}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                      {formatDisplayDate(String(inv.createdAt).slice(0, 10))} · Rs.{" "}
                      {Number(inv.grand_total || 0).toLocaleString()}
                    </Typography>
                  </Box>
                  <StatusChip status={inv.status || "queued"} />
                </Box>
                {i < arr.length - 1 && <Divider />}
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {/* Recent payments */}
      <Paper
        elevation={0}
        sx={{ p: 2.5, border: "1px solid #e2e8f0", borderRadius: 2.5, bgcolor: "white" }}
      >
        <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1.5, color: "#64748b" }}>
          RECENT PAYMENTS YOU LOGGED
        </Typography>
        {work.isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={20} />
          </Box>
        ) : (work.data?.recent_payments || []).length === 0 ? (
          <Typography variant="body2" sx={{ color: "#94a3b8", py: 2 }}>
            You haven't logged any payments yet.
          </Typography>
        ) : (
          <Box>
            {work.data!.recent_payments.map((p: any, i: number, arr: any[]) => (
              <Box key={p.payment_id}>
                <Box
                  sx={{
                    py: 1.25,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a" }}>
                      Payment #{p.payment_id}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                      {formatDisplayDate(String(p.createdAt).slice(0, 10))} · {p.method} · Rs.{" "}
                      {Number(p.payment_amount || 0).toLocaleString()}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: "#64748b" }}>
                    Inv #{p.invoice_id}
                  </Typography>
                </Box>
                {i < arr.length - 1 && <Divider />}
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
}
