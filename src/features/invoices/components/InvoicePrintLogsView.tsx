// features/invoices/components/InvoicePrintLogsView.tsx
import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Chip,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tooltip,
  Divider,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PrintIcon from "@mui/icons-material/Print";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import DevicesIcon from "@mui/icons-material/Devices";
import TodayIcon from "@mui/icons-material/Today";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutlined";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { InvoiceReceipt } from "./InvoiceReceipt";
import { handlePrintInvoice } from "../utils/thermalPrint";

interface PrintLogItem {
  log_id: number;
  invoice_id: number | null;
  doc_number: string;
  doc_type: "DISPATCH" | "COMPLETED" | "DRAFT" | "RETURN_SETTLEMENT";
  printed_by_user_id: number;
  printed_by_name: string;
  printed_by_role: string;
  customer_name: string | null;
  customer_phone: string | null;
  print_method: "direct_agent" | "browser_dialog";
  printer_name: string | null;
  paper_width: string;
  copies: number;
  height_mm: number | null;
  total_items: number;
  total_machines: number;
  subtotal: number;
  transport_fee: number;
  discount_amount: number;
  grand_total: number;
  total_paid: number;
  balance_due: number;
  language: string;
  custom_notes: string | null;
  bill_snapshot: any;
  ip_address: string | null;
  printed_at: string;
  PrintedBy?: {
    user_id: number;
    username: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

export function InvoicePrintLogsView() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [search, setSearch] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("ALL");
  const [printMethodFilter, setPrintMethodFilter] = useState("ALL");
  const [selectedLog, setSelectedLog] = useState<PrintLogItem | null>(null);
  const [reprinting, setReprinting] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: [
      "invoice-print-logs",
      page,
      rowsPerPage,
      search,
      docTypeFilter,
      printMethodFilter,
    ],
    queryFn: async () => {
      const params: any = {
        page: page + 1,
        limit: rowsPerPage,
      };
      if (search.trim()) params.search = search.trim();
      if (docTypeFilter !== "ALL") params.docType = docTypeFilter;
      if (printMethodFilter !== "ALL") params.printMethod = printMethodFilter;

      const res = await api.get("/invoices/print-logs", { params });
      return res.data?.data || { logs: [], totalItems: 0, stats: {} };
    },
    staleTime: 10000,
  });

  const logs: PrintLogItem[] = data?.logs || [];
  const totalItems = data?.totalItems || 0;
  const stats = data?.stats || {};

  const formatCurrency = (val: number | string | null | undefined) => {
    const n = Number(val || 0);
    return `Rs. ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? String(dateStr)
      : d.toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
  };

  const getDocTypeBadge = (type: string) => {
    switch (type) {
      case "DISPATCH":
        return <Chip label="Dispatch" size="small" sx={{ bgcolor: "#ecfdf5", color: "#047857", fontWeight: 800, fontSize: "0.72rem" }} />;
      case "COMPLETED":
        return <Chip label="Completed" size="small" sx={{ bgcolor: "#eff6ff", color: "#1d4ed8", fontWeight: 800, fontSize: "0.72rem" }} />;
      case "DRAFT":
        return <Chip label="Draft / Quote" size="small" sx={{ bgcolor: "#fffbeb", color: "#b45309", fontWeight: 800, fontSize: "0.72rem" }} />;
      case "RETURN_SETTLEMENT":
        return <Chip label="Return Settlement" size="small" sx={{ bgcolor: "#f5f3ff", color: "#6d28d9", fontWeight: 800, fontSize: "0.72rem" }} />;
      default:
        return <Chip label={type} size="small" />;
    }
  };

  const handleReprintSnapshot = async () => {
    if (!selectedLog) return;
    setReprinting(true);
    try {
      await handlePrintInvoice("snapshot-reprint-dom", {
        paperWidth: (selectedLog.paper_width as any) || "80mm",
        title: `Reprint ${selectedLog.doc_number}`,
        invoiceId: selectedLog.invoice_id,
        docNumber: selectedLog.doc_number,
        docType: selectedLog.doc_type,
        customerName: selectedLog.customer_name || undefined,
        customerPhone: selectedLog.customer_phone || undefined,
        totalItems: selectedLog.total_items,
        totalMachines: selectedLog.total_machines,
        subtotal: selectedLog.subtotal,
        transportFee: selectedLog.transport_fee,
        discountAmount: selectedLog.discount_amount,
        grandTotal: selectedLog.grand_total,
        totalPaid: selectedLog.total_paid,
        balanceDue: selectedLog.balance_due,
        language: selectedLog.language,
        customNotes: selectedLog.custom_notes || undefined,
        billSnapshot: selectedLog.bill_snapshot,
      });
      refetch();
    } finally {
      setReprinting(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 }, display: "flex", flexDirection: "column", gap: 2.5 }}>
      {/* ── 1. HEADER & KPI CARDS ───────────────────────────────────────────── */}
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: { sm: "center" }, gap: 1.5 }}>
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ReceiptLongIcon sx={{ color: "#0f172a", fontSize: 26 }} />
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px" }}>
              Bill Printing Audit Logs
            </Typography>
            <Chip
              icon={<ShieldOutlinedIcon sx={{ fontSize: "14px !important" }} />}
              label="Privilege Protected"
              size="small"
              sx={{ bgcolor: "#f1f5f9", color: "#475569", fontWeight: 700, fontSize: "0.72rem" }}
            />
          </Box>
          <Typography variant="body2" sx={{ color: "#64748b", mt: 0.3 }}>
            Full immutable log of all thermal receipts printed, operator attribution, and point-in-time bill snapshots.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          size="small"
          startIcon={isFetching ? <CircularProgress size={14} color="inherit" /> : <RefreshIcon />}
          onClick={() => refetch()}
          sx={{ fontWeight: 700, borderColor: "#cbd5e1", color: "#334155", alignSelf: { xs: "flex-start", sm: "center" } }}
        >
          Refresh Logs
        </Button>
      </Box>

      {/* KPI Cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2 }}>
        <Paper elevation={0} sx={{ p: 2, borderRadius: 2.5, bgcolor: "white", border: "1px solid #e2e8f0" }}>
          <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
            Total Prints (All Time)
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 900, color: "#0f172a", mt: 0.5 }}>
            {stats.totalPrintsAllTime ?? totalItems}
          </Typography>
          <Typography variant="caption" sx={{ color: "#10b981", fontWeight: 600 }}>
            Audit trail active
          </Typography>
        </Paper>

        <Paper elevation={0} sx={{ p: 2, borderRadius: 2.5, bgcolor: "white", border: "1px solid #e2e8f0" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
              Printed Today
            </Typography>
            <TodayIcon sx={{ color: "#2563eb", fontSize: 18 }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: "#2563eb", mt: 0.5 }}>
            {stats.totalPrintsToday ?? 0}
          </Typography>
          <Typography variant="caption" sx={{ color: "#64748b" }}>
            Current business day
          </Typography>
        </Paper>

        <Paper elevation={0} sx={{ p: 2, borderRadius: 2.5, bgcolor: "white", border: "1px solid #e2e8f0" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
              Direct Thermal Agent
            </Typography>
            <DevicesIcon sx={{ color: "#16a34a", fontSize: 18 }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: "#16a34a", mt: 0.5 }}>
            {stats.totalDirectPrints ?? 0}
          </Typography>
          <Typography variant="caption" sx={{ color: "#15803d", fontWeight: 600 }}>
            Exact-cut continuous roll
          </Typography>
        </Paper>

        <Paper elevation={0} sx={{ p: 2, borderRadius: 2.5, bgcolor: "white", border: "1px solid #e2e8f0" }}>
          <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
            Browser Print Fallback
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 900, color: "#64748b", mt: 0.5 }}>
            {stats.totalDialogPrints ?? 0}
          </Typography>
          <Typography variant="caption" sx={{ color: "#64748b" }}>
            Dialog prints
          </Typography>
        </Paper>
      </Box>

      {/* ── 2. FILTER & SEARCH TOOLBAR ─────────────────────────────────────── */}
      <Paper elevation={0} sx={{ p: 2, borderRadius: 2.5, bgcolor: "white", border: "1px solid #e2e8f0", display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center" }}>
        <TextField
          size="small"
          placeholder="Search by Bill #, Customer Name, Staff…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          sx={{ flex: { xs: "1 1 100%", sm: "1 1 260px" }, "& .MuiOutlinedInput-root": { bgcolor: "#f8fafc" } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "#94a3b8", fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
        />

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Document Type</InputLabel>
          <Select
            value={docTypeFilter}
            label="Document Type"
            onChange={(e) => {
              setDocTypeFilter(e.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="ALL">All Documents</MenuItem>
            <MenuItem value="DISPATCH">Dispatch</MenuItem>
            <MenuItem value="COMPLETED">Completed</MenuItem>
            <MenuItem value="DRAFT">Draft / Quote</MenuItem>
            <MenuItem value="RETURN_SETTLEMENT">Return Settlement</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Print Method</InputLabel>
          <Select
            value={printMethodFilter}
            label="Print Method"
            onChange={(e) => {
              setPrintMethodFilter(e.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="ALL">All Methods</MenuItem>
            <MenuItem value="direct_agent">Direct Agent (Auto)</MenuItem>
            <MenuItem value="browser_dialog">Browser Dialog</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      {/* ── 3. AUDIT LOGS TABLE ────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ borderRadius: 2.5, border: "1px solid #e2e8f0", overflow: "hidden", bgcolor: "white" }}>
        <TableContainer>
          <Table size="medium">
            <TableHead sx={{ bgcolor: "#f8fafc" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, color: "#475569", fontSize: "0.78rem" }}>PRINTED AT</TableCell>
                <TableCell sx={{ fontWeight: 800, color: "#475569", fontSize: "0.78rem" }}>BILL / DOC #</TableCell>
                <TableCell sx={{ fontWeight: 800, color: "#475569", fontSize: "0.78rem" }}>OPERATOR (STAFF)</TableCell>
                <TableCell sx={{ fontWeight: 800, color: "#475569", fontSize: "0.78rem" }}>CUSTOMER</TableCell>
                <TableCell sx={{ fontWeight: 800, color: "#475569", fontSize: "0.78rem", textAlign: "right" }}>GRAND TOTAL</TableCell>
                <TableCell sx={{ fontWeight: 800, color: "#475569", fontSize: "0.78rem", textAlign: "right" }}>BALANCE DUE</TableCell>
                <TableCell sx={{ fontWeight: 800, color: "#475569", fontSize: "0.78rem" }}>HARDWARE & METHOD</TableCell>
                <TableCell sx={{ fontWeight: 800, color: "#475569", fontSize: "0.78rem", textAlign: "center" }}>ACTION</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: "center", py: 6 }}>
                    <CircularProgress size={30} sx={{ color: "#0f172a" }} />
                    <Typography variant="body2" sx={{ color: "#64748b", mt: 1 }}>
                      Loading bill printing audit logs…
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: "center", py: 6 }}>
                    <ReceiptLongIcon sx={{ color: "#cbd5e1", fontSize: 44, mb: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, color: "#475569" }}>
                      No print audit records found
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                      Print events will automatically appear here whenever a POS receipt or bill is generated.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow
                    key={log.log_id}
                    hover
                    sx={{
                      "&:last-child td, &:last-child th": { border: 0 },
                      cursor: "pointer",
                    }}
                    onClick={() => setSelectedLog(log)}
                  >
                    {/* Timestamp */}
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>
                        {formatDateTime(log.printed_at)}
                      </Typography>
                      {log.ip_address && (
                        <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", fontSize: "0.68rem" }}>
                          IP: {log.ip_address}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Doc Number & Type */}
                    <TableCell>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, alignItems: "flex-start" }}>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: "#0f172a" }}>
                          {log.doc_number}
                        </Typography>
                        {getDocTypeBadge(log.doc_type)}
                      </Box>
                    </TableCell>

                    {/* Printed By (Staff Member) */}
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Avatar
                          src={log.PrintedBy?.avatar_url}
                          sx={{ width: 28, height: 28, fontSize: "0.75rem", bgcolor: "#0f172a", color: "white" }}
                        >
                          {(log.printed_by_name || "U").charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a" }}>
                            {log.printed_by_name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
                            {log.printed_by_role}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    {/* Customer */}
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: "#334155" }}>
                        {log.customer_name || "Walk-in Customer"}
                      </Typography>
                      {log.customer_phone && (
                        <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
                          {log.customer_phone}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Grand Total */}
                    <TableCell sx={{ textAlign: "right" }}>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: "#0f172a" }}>
                        {formatCurrency(log.grand_total)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#64748b" }}>
                        {log.total_items} item{log.total_items === 1 ? "" : "s"} ({log.total_machines} units)
                      </Typography>
                    </TableCell>

                    {/* Balance Due */}
                    <TableCell sx={{ textAlign: "right" }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 800,
                          color: Number(log.balance_due) > 0 ? "#dc2626" : "#16a34a",
                        }}
                      >
                        {Number(log.balance_due) === 0 ? "PAID IN FULL" : formatCurrency(log.balance_due)}
                      </Typography>
                    </TableCell>

                    {/* Hardware & Method */}
                    <TableCell>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, alignItems: "flex-start" }}>
                        <Chip
                          size="small"
                          label={log.print_method === "direct_agent" ? "Direct Agent" : "Browser Dialog"}
                          sx={{
                            bgcolor: log.print_method === "direct_agent" ? "#f0fdf4" : "#f8fafc",
                            color: log.print_method === "direct_agent" ? "#166534" : "#475569",
                            fontWeight: 700,
                            fontSize: "0.72rem",
                          }}
                        />
                        <Typography variant="caption" sx={{ color: "#64748b", fontSize: "0.72rem" }}>
                          {log.printer_name || "POS Printer"} · {log.paper_width}
                          {log.height_mm ? ` (${log.height_mm}mm)` : ""}
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* Action */}
                    <TableCell sx={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="View Point-in-Time Bill Snapshot">
                        <IconButton
                          size="small"
                          onClick={() => setSelectedLog(log)}
                          sx={{ color: "#2563eb", bgcolor: "#eff6ff", "&:hover": { bgcolor: "#dbeafe" } }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={totalItems}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* ── 4. DETAILED BILL SNAPSHOT MODAL ─────────────────────────────────── */}
      <Dialog
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            bgcolor: "#0f172a",
            color: "white",
            px: 3,
            py: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ReceiptLongIcon sx={{ color: "#38bdf8" }} />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "white" }}>
                Bill Print Snapshot · {selectedLog?.doc_number}
              </Typography>
              <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                Logged on {selectedLog ? formatDateTime(selectedLog.printed_at) : ""}
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setSelectedLog(null)} sx={{ color: "#94a3b8", "&:hover": { color: "white" } }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3, bgcolor: "#f8fafc" }}>
          {selectedLog && (
            <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 3 }}>
              {/* Left Column: Metadata & Staff Attribution */}
              <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: "white", border: "1px solid #e2e8f0" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5, display: "flex", alignItems: "center", gap: 0.8 }}>
                    <PersonOutlineIcon sx={{ fontSize: 18, color: "#2563eb" }} /> Staff Attribution
                  </Typography>

                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1, fontSize: "0.85rem" }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748b" }}>Printed By:</span>
                      <strong style={{ color: "#0f172a" }}>{selectedLog.printed_by_name}</strong>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748b" }}>Role:</span>
                      <Chip label={selectedLog.printed_by_role} size="small" sx={{ fontWeight: 700, fontSize: "0.7rem", height: 20 }} />
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748b" }}>User ID:</span>
                      <span style={{ color: "#0f172a" }}>#{selectedLog.printed_by_user_id}</span>
                    </Box>
                    {selectedLog.ip_address && (
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#64748b" }}>IP Address:</span>
                        <span style={{ fontFamily: "monospace", color: "#0f172a" }}>{selectedLog.ip_address}</span>
                      </Box>
                    )}
                  </Box>
                </Paper>

                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: "white", border: "1px solid #e2e8f0" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5, display: "flex", alignItems: "center", gap: 0.8 }}>
                    <DevicesIcon sx={{ fontSize: 18, color: "#16a34a" }} /> Hardware & Output Details
                  </Typography>

                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1, fontSize: "0.85rem" }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748b" }}>Print Method:</span>
                      <strong style={{ color: "#0f172a" }}>
                        {selectedLog.print_method === "direct_agent" ? "Direct Agent (CUPS)" : "Browser Dialog"}
                      </strong>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748b" }}>Target Printer:</span>
                      <span style={{ color: "#0f172a" }}>{selectedLog.printer_name}</span>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748b" }}>Roll Width:</span>
                      <span style={{ color: "#0f172a" }}>{selectedLog.paper_width}</span>
                    </Box>
                    {selectedLog.height_mm && (
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#64748b" }}>Exact Paper Feed:</span>
                        <span style={{ color: "#0f172a" }}>{selectedLog.height_mm} mm</span>
                      </Box>
                    )}
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748b" }}>Copies:</span>
                      <span style={{ color: "#0f172a" }}>{selectedLog.copies}</span>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748b" }}>Language:</span>
                      <span style={{ color: "#0f172a" }}>{selectedLog.language === "si" ? "Sinhala (සිංහල)" : "English"}</span>
                    </Box>
                  </Box>
                </Paper>

                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: "white", border: "1px solid #e2e8f0" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>
                    Financial State When Printed
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.8, fontSize: "0.85rem" }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748b" }}>Customer:</span>
                      <strong>{selectedLog.customer_name || "Walk-in"}</strong>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748b" }}>Subtotal:</span>
                      <span>{formatCurrency(selectedLog.subtotal)}</span>
                    </Box>
                    {Number(selectedLog.transport_fee) > 0 && (
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#64748b" }}>Transport:</span>
                        <span>+{formatCurrency(selectedLog.transport_fee)}</span>
                      </Box>
                    )}
                    {Number(selectedLog.discount_amount) > 0 && (
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#64748b" }}>Discount:</span>
                        <span>-{formatCurrency(selectedLog.discount_amount)}</span>
                      </Box>
                    )}
                    <Divider sx={{ my: 0.5 }} />
                    <Box sx={{ display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
                      <span>Grand Total:</span>
                      <span>{formatCurrency(selectedLog.grand_total)}</span>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", color: "#16a34a" }}>
                      <span>Total Paid:</span>
                      <span>{formatCurrency(selectedLog.total_paid)}</span>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontWeight: 900,
                        color: Number(selectedLog.balance_due) > 0 ? "#dc2626" : "#16a34a",
                      }}
                    >
                      <span>Balance Due:</span>
                      <span>
                        {Number(selectedLog.balance_due) === 0 ? "PAID IN FULL" : formatCurrency(selectedLog.balance_due)}
                      </span>
                    </Box>
                  </Box>
                </Paper>
              </Box>

              {/* Right Column: Exact Thermal Receipt Preview */}
              <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "#64748b", mb: 1, textTransform: "uppercase" }}>
                  Physical Bill Preview (Point-in-Time Snapshot)
                </Typography>
                <Box
                  sx={{
                    maxHeight: "550px",
                    overflowY: "auto",
                    p: 2,
                    bgcolor: "#334155",
                    borderRadius: 2.5,
                    width: "100%",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <InvoiceReceipt
                    id="snapshot-reprint-dom"
                    invoice={selectedLog.bill_snapshot?.invoice_id ? selectedLog.bill_snapshot : undefined}
                    isDraft={selectedLog.doc_type === "DRAFT"}
                    draftData={selectedLog.doc_type === "DRAFT" ? selectedLog.bill_snapshot : undefined}
                    paperWidth={(selectedLog.paper_width as any) || "80mm"}
                    language={(selectedLog.language as any) || "en"}
                    customNotes={selectedLog.custom_notes || undefined}
                    isPreview={true}
                  />
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5, bgcolor: "white", borderTop: "1px solid #e2e8f0", justifyContent: "space-between" }}>
          <Button onClick={() => setSelectedLog(null)} color="inherit" sx={{ fontWeight: 600 }}>
            Close
          </Button>

          <Button
            variant="contained"
            startIcon={reprinting ? <CircularProgress size={16} color="inherit" /> : <PrintIcon />}
            onClick={handleReprintSnapshot}
            disabled={reprinting}
            sx={{ fontWeight: 800, bgcolor: "#0f172a", "&:hover": { bgcolor: "#1e293b" } }}
          >
            Re-print Exact Copy
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
