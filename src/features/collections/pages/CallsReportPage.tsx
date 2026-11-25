import { useMemo, useState } from "react";
import {
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { ReportShell } from "@/components/reports/ReportShell";
import { DateRangeFilter } from "@/components/reports/DateRangeFilter";
import { KpiTile } from "@/components/reports/KpiTile";
import { todayLocalStr, addDaysLocal } from "@/lib/dates";
import { useCallsReport } from "../hooks/useCollections";
import type { CallLogEntry } from "../types";
import { RecordingPlayer } from "../components/RecordingPlayer";

const formatLkr = (n: number) =>
  `Rs ${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export default function CallsReportPage() {
  const { t } = useTranslation();
  const [range, setRange] = useState({
    from: addDaysLocal(todayLocalStr(), -7),
    to: todayLocalStr(),
  });
  const [outcome, setOutcome] = useState<string>("");
  const [promiseStatus, setPromiseStatus] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  const { data, isLoading, isFetching } = useCallsReport({
    startDate: range.from || undefined,
    endDate: range.to || undefined,
    outcome: outcome || undefined,
    promise_status: promiseStatus || undefined,
    search: search.trim() || undefined,
  });

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const summary = data?.summary ?? {
    total_calls: 0,
    answered: 0,
    no_answer: 0,
    unreachable: 0,
    promises_count: 0,
    promises_amount: 0,
    promises_kept: 0,
    promises_missed: 0,
  };

  const columns: GridColDef<CallLogEntry>[] = [
    {
      field: "started_at",
      headerName: t("collections.callsReport.time", "Time"),
      width: 150,
      renderCell: ({ value }) => (
        <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {value ? dayjs(value).format("D MMM HH:mm") : "—"}
        </Typography>
      ),
    },
    {
      field: "customer_name",
      headerName: t("invoices.customer", "Customer"),
      flex: 1.2,
      minWidth: 180,
      renderCell: ({ row }) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {row.customer_name || row.raw_number || "Unknown"}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {row.raw_number || row.phone_e164 || "—"}
          </Typography>
        </Box>
      ),
    },
    {
      field: "staff_name",
      headerName: t("collections.callsReport.staff", "Staff"),
      width: 130,
      renderCell: ({ value }) => <Typography variant="body2">{value || "—"}</Typography>,
    },
    {
      field: "outcome",
      headerName: t("collections.callsReport.outcome", "Outcome"),
      width: 150,
      renderCell: ({ row }) => (
        <Chip
          size="small"
          color={row.outcome === "answered" ? "success" : row.outcome === "no_answer" ? "error" : "warning"}
          label={`${row.outcome || "—"}${row.duration_seconds ? ` · ${row.duration_seconds}s` : ""}`}
          sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
        />
      ),
    },
    {
      field: "note",
      headerName: t("collections.callsReport.brief", "Brief / Promise"),
      flex: 1.5,
      minWidth: 220,
      renderCell: ({ row }) => (
        <Stack spacing={0.25}>
          <Typography variant="caption" sx={{ color: row.note ? "text.primary" : "warning.main", fontWeight: row.note ? 400 : 700 }}>
            {row.note || t("collections.calls.noNoteEntered", "No note entered")}
          </Typography>
          {row.promise_amount && (
            <Typography variant="caption" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              💰 {formatLkr(row.promise_amount)} ({row.promise_status || "waiting"})
            </Typography>
          )}
        </Stack>
      ),
    },
    {
      field: "recording_id",
      headerName: "",
      width: 210,
      sortable: false,
      renderCell: ({ row }) => (
        <RecordingPlayer
          callId={row.call_id}
          recordingId={row.recording_id}
          durationSeconds={row.recording_duration_seconds}
          disputeHold={row.dispute_hold}
          showNoRecordingLabel={false}
        />
      ),
    },
  ];

  return (
    <ReportShell
      title={t("collections.callsReport.title", "Calls")}
      subtitle={t("collections.callsReport.subtitle", "All collection calls, outcomes, promises, and staff activity.")}
      filterSlot={<DateRangeFilter from={range.from} to={range.to} onChange={setRange} />}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
          gap: 1.5,
        }}
      >
        <KpiTile label={t("collections.callsReport.totalCalls", "Calls")} value={summary.total_calls} tone="info" loading={isLoading} />
        <KpiTile label={t("collections.callCard.answered", "Answered")} value={summary.answered} tone="success" loading={isLoading} />
        <KpiTile
          label={t("collections.callsReport.promises", "Promises")}
          value={summary.promises_count}
          hint={formatLkr(summary.promises_amount)}
          tone="warning"
          loading={isLoading}
        />
        <KpiTile
          label={t("collections.callsReport.keptSoFar", "Kept so far")}
          value={summary.promises_kept}
          hint={`${summary.promises_missed} missed`}
          tone="default"
          loading={isLoading}
        />
      </Box>

      {/* Filters */}
      <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          size="small"
          placeholder={t("collections.callsReport.searchCustomer", "Search customer or phone...")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 220 }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>{t("collections.callsReport.outcome", "Outcome")}</InputLabel>
          <Select
            label={t("collections.callsReport.outcome", "Outcome")}
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
          >
            <MenuItem value="">{t("common.all", "All")}</MenuItem>
            <MenuItem value="answered">{t("collections.callCard.answered", "Answered")}</MenuItem>
            <MenuItem value="no_answer">{t("collections.callCard.noAnswer", "No answer")}</MenuItem>
            <MenuItem value="unreachable">{t("collections.callCard.unreachable", "Off / wrong")}</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>{t("collections.callsReport.promiseStatus", "Promise")}</InputLabel>
          <Select
            label={t("collections.callsReport.promiseStatus", "Promise")}
            value={promiseStatus}
            onChange={(e) => setPromiseStatus(e.target.value)}
          >
            <MenuItem value="">{t("common.all", "All")}</MenuItem>
            <MenuItem value="waiting">Waiting</MenuItem>
            <MenuItem value="kept">Kept</MenuItem>
            <MenuItem value="missed">Missed</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Per-staff summary for managers */}
      {data?.by_staff && data.by_staff.length > 0 && (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {data.by_staff.map((s) => (
            <Chip
              key={s.staff_name}
              size="small"
              label={`${s.staff_name}: ${s.total_calls} calls · ${s.answered} answered · ${s.promises_kept}/${s.promises_count} kept`}
              sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}
            />
          ))}
        </Box>
      )}

      <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(r) => r.call_id}
          loading={isLoading || isFetching}
          getRowHeight={() => "auto"}
          getEstimatedRowHeight={() => 64}
          pageSizeOptions={[25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
          sx={{
            border: 0,
            "& .MuiDataGrid-row": { minHeight: "56px !important" },
            "& .MuiDataGrid-cell": { whiteSpace: "normal", wordBreak: "break-word", py: 1 },
          }}
        />
      </Paper>
    </ReportShell>
  );
}
