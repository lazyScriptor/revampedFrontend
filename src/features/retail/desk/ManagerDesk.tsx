import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import CheckOutlinedIcon from "@mui/icons-material/CheckOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useTranslation } from "react-i18next";
import { Overlay, registerOverlay, type OverlayComponentProps } from "@/components/overlay";
import { useDensity } from "@/features/preferences/useDensity";
import { formatDateTime } from "@/lib/dates";
import { EXCEPTION_TYPES, type CounterException, type ExceptionType } from "../api/types";
import { ToSortTab } from "./ToSortTab";
import { useCanDecideApprovals, useCanSortUnlisted, useDecide, useDeskList, useToSortList } from "./useDesk";

export const MANAGER_DESK_ID = "manager-desk";

type DeskTab = "sort" | "waiting" | "records";

const money = (n: number | string | null | undefined) =>
  n === null || n === undefined || n === "" ? "" : `Rs ${Number(n).toLocaleString("en-LK", { maximumFractionDigits: 2 })}`;

const show = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    const pick = o.price ?? o.unit_price ?? o.value ?? o.amount;
    return pick !== undefined ? String(pick) : JSON.stringify(v);
  }
  return String(v);
};

function Empty({ text }: { text: string }) {
  return (
    <Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
      <InboxOutlinedIcon sx={{ fontSize: 40, mb: 1 }} />
      <Typography variant="body2">{text}</Typography>
    </Box>
  );
}

function WaitingTab() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useDeskList({ tab: "waiting", limit: 50 });
  const decide = useDecide();

  if (isLoading) return <Box sx={{ textAlign: "center", py: 4 }}><CircularProgress size={24} /></Box>;
  if (isError) return <Alert severity="error">{t("desk.loadFailed")}</Alert>;
  const rows = data?.rows ?? [];
  if (rows.length === 0) return <Empty text={t("desk.noneWaiting")} />;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {decide.isError && <Alert severity="error">{t("desk.decideFailed")}</Alert>}
      {rows.map((r) => (
        <Paper key={r.exception_id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }} data-testid="waiting-row">
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5, flexWrap: "wrap" }}>
            <Chip size="small" label={t(`desk.types.${r.type}`)} />
            <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
              {r.requested_by_name} · {formatDateTime(r.created_at)}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums", mb: 1 }}>
            {r.summary}
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="contained"
              disableElevation
              startIcon={<CheckOutlinedIcon />}
              disabled={decide.isPending}
              onClick={() => decide.mutate({ id: r.exception_id, approve: true })}
              sx={{ flex: 1, minHeight: 44, textTransform: "none", fontWeight: 800 }}
            >
              {t("desk.approve")}
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<CloseOutlinedIcon />}
              disabled={decide.isPending}
              onClick={() => decide.mutate({ id: r.exception_id, approve: false })}
              sx={{ flex: 1, minHeight: 44, textTransform: "none", fontWeight: 800 }}
            >
              {t("desk.decline")}
            </Button>
          </Box>
        </Paper>
      ))}
    </Box>
  );
}

function RecordsTab() {
  const { t } = useTranslation();
  const { rowHeight } = useDensity();
  const [type, setType] = useState<ExceptionType | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const limit = 25;
  const { data, isLoading, isError } = useDeskList({ tab: "records", type, from, to, page: page + 1, limit });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, minHeight: 0 }}>
      <Box sx={{ display: "flex", gap: 0.75, overflowX: "auto", flexWrap: "nowrap", pb: 0.5 }} role="group" aria-label={t("desk.filterType")}>
        <Chip
          label={t("desk.allTypes")}
          color={type === "" ? "primary" : "default"}
          variant={type === "" ? "filled" : "outlined"}
          onClick={() => { setType(""); setPage(0); }}
        />
        {EXCEPTION_TYPES.map((x) => (
          <Chip
            key={x}
            label={t(`desk.types.${x}`)}
            color={type === x ? "primary" : "default"}
            variant={type === x ? "filled" : "outlined"}
            onClick={() => { setType(x); setPage(0); }}
          />
        ))}
      </Box>
      <Box sx={{ display: "flex", gap: 1 }}>
        <TextField
          size="small"
          type="date"
          label={t("desk.from")}
          value={from}
          onChange={(e) => { setFrom(e.target.value); setPage(0); }}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ flex: 1 }}
        />
        <TextField
          size="small"
          type="date"
          label={t("desk.to")}
          value={to}
          onChange={(e) => { setTo(e.target.value); setPage(0); }}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ flex: 1 }}
        />
      </Box>

      {(data?.totals ?? []).length > 0 && (
        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }} data-testid="desk-totals">
          {data!.totals.map((tt) => (
            <Chip
              key={tt.type}
              size="small"
              variant="outlined"
              label={`${t(`desk.types.${tt.type}`)} · ${tt.count} · ${money(tt.amount)}`}
              sx={{ fontVariantNumeric: "tabular-nums" }}
            />
          ))}
        </Box>
      )}

      {isLoading ? (
        <Box sx={{ textAlign: "center", py: 4 }}><CircularProgress size={24} /></Box>
      ) : isError ? (
        <Alert severity="error">{t("desk.loadFailed")}</Alert>
      ) : (data?.rows.length ?? 0) === 0 ? (
        <Empty text={t("desk.noRecords")} />
      ) : (
        <>
          <TableContainer sx={{ maxHeight: "55vh", border: 1, borderColor: "divider", borderRadius: 1 }}>
            <Table size="small" stickyHeader sx={{ "& td, & th": { py: 0, height: rowHeight, whiteSpace: "nowrap" } }}>
              <TableHead>
                <TableRow>
                  <TableCell>{t("desk.col.type")}</TableCell>
                  <TableCell>{t("desk.col.item")}</TableCell>
                  <TableCell>{t("desk.col.change")}</TableCell>
                  <TableCell align="right">{t("desk.col.impact")}</TableCell>
                  <TableCell>{t("desk.col.cashier")}</TableCell>
                  <TableCell>{t("desk.col.approver")}</TableCell>
                  <TableCell>{t("desk.col.time")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data!.rows.map((r: CounterException) => (
                  <TableRow key={r.exception_id} hover>
                    <TableCell>{t(`desk.types.${r.type}`)}</TableCell>
                    <TableCell>{r.item_name || (r.invoice_number ? `#${r.invoice_number}` : r.invoice_id ? `#${r.invoice_id}` : "")}</TableCell>
                    <TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>
                      {r.old_value !== undefined || r.new_value !== undefined ? (
                        <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                          {show(r.old_value)} <ArrowForwardIcon sx={{ fontSize: 14 }} /> {show(r.new_value)}
                        </Box>
                      ) : null}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>{money(r.amount_impact)}</TableCell>
                    <TableCell>{r.requested_by_name}</TableCell>
                    <TableCell>{r.approved_by_name}</TableCell>
                    <TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>{formatDateTime(r.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={data!.total}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={limit}
            rowsPerPageOptions={[limit]}
            sx={{ "& .MuiTablePagination-displayedRows": { fontVariantNumeric: "tabular-nums" } }}
          />
        </>
      )}
    </Box>
  );
}

function ManagerDesk(_props: OverlayComponentProps) {
  const { t } = useTranslation();
  const canDecide = useCanDecideApprovals();
  const canSort = useCanSortUnlisted();
  const [tab, setTab] = useState<DeskTab>("waiting");
  const waiting = useDeskList({ tab: "waiting", limit: 1 }, canDecide);
  const toSort = useToSortList(canSort);
  const sortTotal = toSort.data?.total ?? 0;

  return (
    <Overlay title={t("desk.title")} width={760}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" sx={{ mb: 2, minHeight: 40, borderBottom: 1, borderColor: "divider" }}>
        <Tab
          value="sort"
          label={`${t("desk.tabSort")}${sortTotal > 0 ? ` (${sortTotal})` : ""}`}
          sx={{ minHeight: 40, textTransform: "none", fontVariantNumeric: "tabular-nums" }}
        />
        <Tab
          value="waiting"
          label={`${t("desk.tabWaiting")}${waiting.data ? ` (${waiting.data.total})` : ""}`}
          sx={{ minHeight: 40, textTransform: "none", fontVariantNumeric: "tabular-nums" }}
        />
        <Tab value="records" label={t("desk.tabRecords")} sx={{ minHeight: 40, textTransform: "none" }} />
      </Tabs>
      {tab === "sort" && <ToSortTab />}
      {tab === "waiting" && <WaitingTab />}
      {tab === "records" && <RecordsTab />}
    </Overlay>
  );
}

registerOverlay(MANAGER_DESK_ID, ManagerDesk);
export default ManagerDesk;
