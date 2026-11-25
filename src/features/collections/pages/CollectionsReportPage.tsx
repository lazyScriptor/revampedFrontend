import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Paper,
  Rating,
  Stack,
  Switch,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { DataGrid, type GridColDef, type GridSortModel } from "@mui/x-data-grid";
import MonetizationOnOutlinedIcon from "@mui/icons-material/MonetizationOnOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import SearchIcon from "@mui/icons-material/Search";
import BookmarkAddOutlinedIcon from "@mui/icons-material/BookmarkAddOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useCollectionsReport } from "../hooks/useCollections";
import type {
  CollectionCustomerRow,
  CollectionsDateBasis,
  CollectionsDatePreset,
  CollectionsQueryParams,
  SavedCollectionView,
} from "../types";
import { LastCallLine } from "../components/LastCallLine";
import { RowCallControls } from "../components/RowCallControls";
import { InfoTipButton } from "../components/InfoTipButton";
import { WhatsAppButton } from "@/features/whatsapp/components/WhatsAppButton";
import { dashboardTones } from "@/features/dashboard/_tokens";

const SAVED_VIEWS_KEY = "geargrid.collections.saved_views";

function loadSavedViews(): SavedCollectionView[] {
  try {
    const raw = window.localStorage.getItem(SAVED_VIEWS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistSavedViews(views: SavedCollectionView[]) {
  try {
    window.localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(views));
  } catch {
    // ignore storage quota errors
  }
}

const formatLkr = (n: number) =>
  `Rs ${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export default function CollectionsReportPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false }) as Record<string, any>;

  const [owesMoney, setOwesMoney] = useState<boolean>(
    searchParams.owes_money === "1" || searchParams.owes_money === true || (!searchParams.not_returned && !searchParams.late && !searchParams.everyone),
  );
  const [notReturned, setNotReturned] = useState<boolean>(
    searchParams.not_returned === "1" || searchParams.not_returned === true,
  );
  const [late, setLate] = useState<boolean>(
    searchParams.late === "1" || searchParams.late === true,
  );
  const [everyone, setEveryone] = useState<boolean>(
    searchParams.everyone === "1" || searchParams.everyone === true,
  );

  const [datePreset, setDatePreset] = useState<CollectionsDatePreset>(
    (searchParams.date_preset as CollectionsDatePreset) || "all_time",
  );
  const [from, setFrom] = useState<string>(searchParams.from || "");
  const [to, setTo] = useState<string>(searchParams.to || "");
  const [dateBasis, setDateBasis] = useState<CollectionsDateBasis>(
    searchParams.date_basis === "due_date" ? "due_date" : "bill_date",
  );

  const [searchText, setSearchText] = useState<string>(searchParams.search || "");
  const [billStatus, setBillStatus] = useState<"complete" | "not_complete" | "">(
    searchParams.bill_status || "",
  );
  const [returnStatus, setReturnStatus] = useState<"returned" | "not_returned" | "">(
    searchParams.return_status || "",
  );
  const [overdueOnly, setOverdueOnly] = useState<boolean>(Boolean(searchParams.overdue_only));
  const [balanceMin, setBalanceMin] = useState<string>(searchParams.balance_min ? String(searchParams.balance_min) : "");
  const [ratingFilter, setRatingFilter] = useState<number | undefined>(
    searchParams.rating ? Number(searchParams.rating) : undefined,
  );
  const [callState, setCallState] = useState<"" | "not_called" | "no_answer" | "promised" | "promise_missed">(
    searchParams.call_state || "",
  );
  const [blacklisted, setBlacklisted] = useState<boolean>(Boolean(searchParams.blacklisted));

  const [sortModel, setSortModel] = useState<GridSortModel>([
    {
      field: searchParams.sort_by || "balance",
      sort: searchParams.sort_dir === "asc" ? "asc" : "desc",
    },
  ]);
  const [page, setPage] = useState<number>(Number(searchParams.page) || 0);
  const [savedViews, setSavedViews] = useState<SavedCollectionView[]>(() => loadSavedViews());
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");

  const queryParams: CollectionsQueryParams = useMemo(
    () => ({
      owes_money: owesMoney || undefined,
      not_returned: notReturned || undefined,
      late: late || undefined,
      everyone: everyone || undefined,
      date_preset: datePreset,
      from: datePreset === "custom" && from ? from : undefined,
      to: datePreset === "custom" && to ? to : undefined,
      date_basis: dateBasis,
      search: searchText.trim() || undefined,
      bill_status: billStatus || undefined,
      return_status: returnStatus || undefined,
      overdue_only: overdueOnly || undefined,
      balance_min: balanceMin ? Number(balanceMin) : undefined,
      rating: ratingFilter,
      call_state: callState || undefined,
      blacklisted: blacklisted || undefined,
      sort_by: sortModel[0]?.field || "balance",
      sort_dir: (sortModel[0]?.sort as "asc" | "desc") || "desc",
      page: page + 1,
      limit: 50,
    }),
    [
      owesMoney,
      notReturned,
      late,
      everyone,
      datePreset,
      from,
      to,
      dateBasis,
      searchText,
      billStatus,
      returnStatus,
      overdueOnly,
      balanceMin,
      ratingFilter,
      callState,
      blacklisted,
      sortModel,
      page,
    ],
  );

  const { data, isLoading, isFetching } = useCollectionsReport(queryParams);
  const rows = data?.rows ?? [];
  const totals = data?.totals ?? {
    customer_count: 0,
    revenue: 0,
    paid: 0,
    balance: 0,
    machines_out: 0,
    overdue_amount: 0,
  };
  const optionCounts = data?.option_counts ?? {
    owes_money: 0,
    not_returned: 0,
    late: 0,
    everyone: 0,
  };

  const toggleOption = (key: "owes_money" | "not_returned" | "late" | "everyone") => {
    setPage(0);
    if (key === "everyone") {
      const next = !everyone;
      setEveryone(next);
      if (next) {
        setOwesMoney(false);
        setNotReturned(false);
        setLate(false);
      }
      return;
    }
    setEveryone(false);
    if (key === "owes_money") setOwesMoney((v) => !v);
    if (key === "not_returned") setNotReturned((v) => !v);
    if (key === "late") setLate((v) => !v);
  };

  const handleSaveView = () => {
    if (!newViewName.trim()) return;
    const next: SavedCollectionView = {
      id: String(Date.now()),
      name: newViewName.trim(),
      params: queryParams,
    };
    const updated = [...savedViews, next];
    setSavedViews(updated);
    persistSavedViews(updated);
    setNewViewName("");
    setSaveDialogOpen(false);
  };

  const applySavedView = (view: SavedCollectionView) => {
    const p = view.params;
    setOwesMoney(Boolean(p.owes_money));
    setNotReturned(Boolean(p.not_returned));
    setLate(Boolean(p.late));
    setEveryone(Boolean(p.everyone));
    setDatePreset(p.date_preset ?? "all_time");
    setFrom(p.from ?? "");
    setTo(p.to ?? "");
    setDateBasis(p.date_basis ?? "bill_date");
    setSearchText(p.search ?? "");
    setBillStatus(p.bill_status ?? "");
    setReturnStatus(p.return_status ?? "");
    setOverdueOnly(Boolean(p.overdue_only));
    setBalanceMin(p.balance_min ? String(p.balance_min) : "");
    setRatingFilter(p.rating);
    setCallState(p.call_state ?? "");
    setBlacklisted(Boolean(p.blacklisted));
    setPage(0);
  };

  const deleteSavedView = (id: string) => {
    const updated = savedViews.filter((v) => v.id !== id);
    setSavedViews(updated);
    persistSavedViews(updated);
  };

  const exportCsv = () => {
    const headers = [
      "Customer ID",
      "Name",
      "NIC",
      "Phone",
      "Revenue",
      "Paid",
      "Balance",
      "Overdue Machines",
      "Overdue Days",
      "Overdue Amount",
      "Rating",
      "Status",
      "Machines Out",
    ];
    const lines = [headers.join(",")];
    rows.forEach((r) => {
      const machines = r.machines_out.map((m) => `${m.name} x ${m.qty}`).join("; ");
      lines.push(
        [
          r.customer_id,
          `"${(r.name || "").replace(/"/g, '""')}"`,
          r.nic_number || "",
          r.phone_number || "",
          r.revenue.toFixed(2),
          r.paid.toFixed(2),
          r.balance.toFixed(2),
          r.overdue_machines_count,
          r.overdue_max_days,
          r.overdue_amount.toFixed(2),
          r.rating ?? "",
          r.status_label ?? (r.is_blacklisted ? "Blacklisted" : "Good"),
          `"${machines}"`,
        ].join(","),
      );
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `collections-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: GridColDef<CollectionCustomerRow>[] = [
    {
      field: "name",
      headerName: t("collections.report.customerCol", "Customer"),
      flex: 2.2,
      minWidth: 320,
      renderCell: ({ row }) => (
        <Box sx={{ width: "100%", py: 1, display: "flex", flexDirection: "column", gap: 0.75 }}>
          {/* Top half: customer identity, phone, rating, status, last call */}
          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  {row.name}
                </Typography>
                <Chip
                  size="small"
                  label={`#${row.customer_id}`}
                  sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
                />
                {row.is_blacklisted && (
                  <Chip size="small" color="error" label={t("collections.status.blacklisted", "Blacklisted")} sx={{ height: 18, fontSize: "0.64rem", fontWeight: 800 }} />
                )}
                {row.balance > 0 && (
                  <Chip size="small" color="warning" variant="outlined" label={t("collections.status.owes", "Owes")} sx={{ height: 18, fontSize: "0.64rem", fontWeight: 700 }} />
                )}
                {row.has_items_out && (
                  <Chip size="small" color="info" variant="outlined" label={t("collections.status.hasMachines", "Has machines")} sx={{ height: 18, fontSize: "0.64rem", fontWeight: 700 }} />
                )}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums", display: "block" }}>
                {[row.nic_number, row.phone_number].filter(Boolean).join(" · ") || "—"}
              </Typography>
              <LastCallLine lastCall={row.last_call} />
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
              {typeof row.rating === "number" && (
                <Rating value={row.rating} readOnly size="small" precision={0.5} />
              )}
              {row.phone_number && (
                <WhatsAppButton
                  variant="icon"
                  size="small"
                  invoiceId={row.invoice_ids?.[0] ?? 0}
                  templateKey="payment_reminder"
                  disabled={!row.invoice_ids?.length}
                />
              )}
              <RowCallControls
                customerId={row.customer_id}
                customerName={row.name}
                phone={row.phone_number}
                invoiceIds={row.invoice_ids}
                lastCall={row.last_call}
              />
            </Box>
          </Box>

          {/* Bottom half: machines still out chips */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
              pt: 0.5,
              borderTop: "1px dashed",
              borderColor: "divider",
              flexWrap: "wrap",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
              {row.machines_out.length === 0 ? (
                <Typography variant="caption" color="text.secondary">
                  {t("collections.report.noMachinesOut", "No machines out")}
                </Typography>
              ) : (
                <>
                  {row.machines_out.slice(0, 3).map((m) => (
                    <Chip
                      key={m.equipment_id}
                      size="small"
                      label={`${m.name} × ${m.qty}${m.max_days_out ? ` · ${m.max_days_out} d` : ""}`}
                      color={m.days_overdue > 0 ? "error" : "default"}
                      variant="outlined"
                      sx={{ height: 22, fontSize: "0.68rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
                    />
                  ))}
                  {row.machines_out.length > 3 && (
                    <Chip
                      size="small"
                      label={`+${row.machines_out.length - 3} more`}
                      sx={{ height: 22, fontSize: "0.68rem", fontWeight: 700 }}
                    />
                  )}
                </>
              )}
            </Box>
          </Box>
        </Box>
      ),
    },
    {
      field: "revenue",
      headerName: t("collections.report.revenue", "Revenue"),
      width: 135,
      type: "number",
      renderHeader: () => (
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}>
          <span>{t("collections.report.revenue", "Revenue")}</span>
          <InfoTipButton
            label={t("collections.report.revenue", "Revenue")}
            explanation={t(
              "collections.help.revenue",
              "What the bills in the filter come to so far, including running charges for machines still out.",
            )}
          />
        </Box>
      ),
      renderCell: ({ value }) => (
        <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
          {formatLkr(Number(value))}
        </Typography>
      ),
    },
    {
      field: "paid",
      headerName: t("collections.report.paid", "Paid"),
      width: 130,
      type: "number",
      renderHeader: () => (
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}>
          <span>{t("collections.report.paid", "Paid")}</span>
          <InfoTipButton
            label={t("collections.report.paid", "Paid")}
            explanation={t("collections.help.paid", "Payments on those bills, minus refunds.")}
          />
        </Box>
      ),
      renderCell: ({ value }) => (
        <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {formatLkr(Number(value))}
        </Typography>
      ),
    },
    {
      field: "balance",
      headerName: t("collections.report.balance", "Balance"),
      width: 150,
      type: "number",
      renderHeader: () => (
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}>
          <span>{t("collections.report.balance", "Balance")}</span>
          <InfoTipButton
            label={t("collections.report.balance", "Balance")}
            explanation={t("collections.help.balance", "Revenue minus Paid.")}
          />
        </Box>
      ),
      renderCell: ({ value }) => (
        <Typography
          variant="body1"
          sx={{
            fontWeight: 900,
            color: Number(value) > 0 ? dashboardTones.danger.strong : "text.primary",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatLkr(Number(value))}
        </Typography>
      ),
    },
    {
      field: "overdue_max_days",
      headerName: t("collections.report.overdue", "Overdue"),
      width: 170,
      type: "number",
      renderHeader: () => (
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}>
          <span>{t("collections.report.overdue", "Overdue")}</span>
          <InfoTipButton
            label={t("collections.report.overdue", "Overdue")}
            explanation={t(
              "collections.help.overdue",
              "Machines past their return date, and money still owed on bills returned more than 30 days ago.",
            )}
          />
        </Box>
      ),
      renderCell: ({ row }) =>
        row.overdue_machines_count > 0 || row.overdue_amount > 0 ? (
          <Stack spacing={0.25}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: dashboardTones.danger.strong, fontVariantNumeric: "tabular-nums" }}>
              {row.overdue_machines_count} {t("collections.report.machines", "machines")} · {row.overdue_max_days} {t("collections.report.days", "days")}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
              {formatLkr(row.overdue_amount)}
            </Typography>
          </Stack>
        ) : (
          <Typography variant="caption" color="text.secondary">—</Typography>
        ),
    },
    {
      field: "last_bill_date",
      headerName: t("collections.report.lastBill", "Last bill"),
      width: 120,
      renderCell: ({ value }) => (
        <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {value ? String(value).slice(0, 10) : "—"}
        </Typography>
      ),
    },
    {
      field: "oldest_unpaid_date",
      headerName: t("collections.report.oldestUnpaid", "Oldest unpaid"),
      width: 125,
      renderCell: ({ value }) => (
        <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {value ? String(value).slice(0, 10) : "—"}
        </Typography>
      ),
    },
    {
      field: "oldest_due_date",
      headerName: t("collections.report.oldestDue", "Oldest due"),
      width: 120,
      renderCell: ({ value }) => (
        <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {value ? String(value).slice(0, 10) : "—"}
        </Typography>
      ),
    },
    {
      field: "last_payment_date",
      headerName: t("collections.report.lastPayment", "Last payment"),
      width: 125,
      renderCell: ({ value }) => (
        <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {value ? String(value).slice(0, 10) : "—"}
        </Typography>
      ),
    },
  ];

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        p: { xs: 1.5, md: 2.5 },
        height: { md: "calc(100vh - 88px)" },
        minHeight: 0,
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {t("collections.report.title", "Collections")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("collections.report.subtitle", "Track money owed, unreturned machines, overdue accounts, and collection calls.")}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<BookmarkAddOutlinedIcon />}
            onClick={() => setSaveDialogOpen(true)}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {t("collections.report.saveView", "Save view")}
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DownloadOutlinedIcon />}
            onClick={exportCsv}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {t("collections.report.exportExcel", "Export Excel")}
          </Button>
        </Box>
      </Box>

      {/* Step 1: Four Option Cards */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
          gap: 1.25,
          flexShrink: 0,
        }}
      >
        {[
          {
            key: "owes_money" as const,
            active: owesMoney,
            icon: <MonetizationOnOutlinedIcon fontSize="small" />,
            title: t("collections.options.owesMoney", "Owes money"),
            desc: t("collections.options.owesMoneyDesc", "Customers with an unpaid balance"),
            count: optionCounts.owes_money,
          },
          {
            key: "not_returned" as const,
            active: notReturned,
            icon: <Inventory2OutlinedIcon fontSize="small" />,
            title: t("collections.options.notReturned", "Machines not returned"),
            desc: t("collections.options.notReturnedDesc", "Customers with machines still out"),
            count: optionCounts.not_returned,
          },
          {
            key: "late" as const,
            active: late,
            icon: <AccessTimeIcon fontSize="small" />,
            title: t("collections.options.late", "Late"),
            desc: t("collections.options.lateDesc", "Past return date, or owed > 30 days"),
            count: optionCounts.late,
          },
          {
            key: "everyone" as const,
            active: everyone,
            icon: <PeopleAltOutlinedIcon fontSize="small" />,
            title: t("collections.options.everyone", "Everyone"),
            desc: t("collections.options.everyoneDesc", "All customers with bills in dates"),
            count: optionCounts.everyone,
          },
        ].map((card) => (
          <Paper
            key={card.key}
            elevation={0}
            onClick={() => toggleOption(card.key)}
            role="button"
            tabIndex={0}
            aria-pressed={card.active}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleOption(card.key);
              }
            }}
            sx={{
              p: 1.5,
              borderRadius: 2,
              cursor: "pointer",
              border: "2px solid",
              borderColor: card.active ? "warning.main" : "divider",
              bgcolor: card.active ? (isDark ? "rgba(245, 158, 11, 0.12)" : "rgba(245, 158, 11, 0.08)") : "background.paper",
              transition: "all 150ms ease",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, fontWeight: 800 }}>
                {card.icon}
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  {card.title}
                </Typography>
              </Box>
              <Chip
                size="small"
                label={card.count}
                color={card.active ? "warning" : "default"}
                sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums", height: 22 }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              {card.desc}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* Step 2: Date Chips + Date Basis Switch */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, flexShrink: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, overflowX: "auto", flexWrap: { xs: "nowrap", sm: "wrap" } }}>
          {(
            [
              ["all_time", t("collections.dates.allTime", "All time")],
              ["this_month", t("collections.dates.thisMonth", "This month")],
              ["last_3_months", t("collections.dates.last3Months", "Last 3 months")],
              ["this_year", t("collections.dates.thisYear", "This year")],
              ["custom", t("collections.dates.custom", "Custom")],
            ] as const
          ).map(([key, label]) => (
            <Chip
              key={key}
              clickable
              size="small"
              label={label}
              color={datePreset === key ? "warning" : "default"}
              variant={datePreset === key ? "filled" : "outlined"}
              onClick={() => {
                setDatePreset(key);
                setPage(0);
              }}
              sx={{ flexShrink: 0, fontWeight: 700 }}
            />
          ))}
          {datePreset === "custom" && (
            <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
              <TextField
                size="small"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                slotProps={{ htmlInput: { "aria-label": "From date", style: { fontVariantNumeric: "tabular-nums" } } }}
              />
              <TextField
                size="small"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                slotProps={{ htmlInput: { "aria-label": "To date", style: { fontVariantNumeric: "tabular-nums" } } }}
              />
            </Box>
          )}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Typography variant="caption" sx={{ fontWeight: dateBasis === "bill_date" ? 800 : 500 }}>
            {t("collections.dates.billDate", "Bill date")}
          </Typography>
          <Switch
            size="small"
            checked={dateBasis === "due_date"}
            onChange={(e) => {
              setDateBasis(e.target.checked ? "due_date" : "bill_date");
              setPage(0);
            }}
            slotProps={{ input: { "aria-label": t("collections.dates.dateBasisSwitch", "Switch between Bill date and Due back date") } }}
          />
          <Typography variant="caption" sx={{ fontWeight: dateBasis === "due_date" ? 800 : 500 }}>
            {t("collections.dates.dueDate", "Due back date")}
          </Typography>
        </Box>
      </Box>

      {/* Step 3: Search, Filter Chips, Saved Views */}
      <Stack spacing={1} sx={{ flexShrink: 0 }}>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
          <TextField
            size="small"
            placeholder={t("collections.report.searchPlaceholder", "Search name, customer ID, NIC, or phone...")}
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(0);
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ minWidth: { xs: "100%", sm: 280 }, flex: 1 }}
          />
          <TextField
            size="small"
            type="number"
            placeholder={t("collections.report.balanceOver", "Balance over Rs")}
            value={balanceMin}
            onChange={(e) => {
              setBalanceMin(e.target.value);
              setPage(0);
            }}
            slotProps={{ htmlInput: { min: 0, style: { fontVariantNumeric: "tabular-nums" } } }}
            sx={{ width: 150 }}
          />
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, overflowX: "auto", flexWrap: { xs: "nowrap", sm: "wrap" } }}>
          <Chip
            size="small"
            clickable
            label={t("collections.filters.complete", "Complete")}
            color={billStatus === "complete" ? "warning" : "default"}
            onClick={() => setBillStatus(billStatus === "complete" ? "" : "complete")}
          />
          <Chip
            size="small"
            clickable
            label={t("collections.filters.notComplete", "Not complete")}
            color={billStatus === "not_complete" ? "warning" : "default"}
            onClick={() => setBillStatus(billStatus === "not_complete" ? "" : "not_complete")}
          />
          <Chip
            size="small"
            clickable
            label={t("collections.filters.returned", "Returned")}
            color={returnStatus === "returned" ? "warning" : "default"}
            onClick={() => setReturnStatus(returnStatus === "returned" ? "" : "returned")}
          />
          <Chip
            size="small"
            clickable
            label={t("collections.filters.machinesNotReturned", "Not returned")}
            color={returnStatus === "not_returned" ? "warning" : "default"}
            onClick={() => setReturnStatus(returnStatus === "not_returned" ? "" : "not_returned")}
          />
          <Chip
            size="small"
            clickable
            label={t("collections.filters.overdueOnly", "Overdue only")}
            color={overdueOnly ? "error" : "default"}
            onClick={() => setOverdueOnly((v) => !v)}
          />
          {(["not_called", "no_answer", "promised", "promise_missed"] as const).map((cs) => (
            <Chip
              key={cs}
              size="small"
              clickable
              label={t(`collections.filters.${cs}`, cs.replace("_", " "))}
              color={callState === cs ? "warning" : "default"}
              onClick={() => setCallState(callState === cs ? "" : cs)}
            />
          ))}
          {[1, 2, 3, 4, 5].map((star) => (
            <Chip
              key={star}
              size="small"
              clickable
              label={`${star}★`}
              color={ratingFilter === star ? "warning" : "default"}
              onClick={() => setRatingFilter(ratingFilter === star ? undefined : star)}
            />
          ))}
          <Chip
            size="small"
            clickable
            label={t("collections.status.blacklisted", "Blacklisted")}
            color={blacklisted ? "error" : "default"}
            onClick={() => setBlacklisted((v) => !v)}
          />
        </Box>

        {savedViews.length > 0 && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              {t("collections.report.savedViews", "Saved views:")}
            </Typography>
            {savedViews.map((v) => (
              <Chip
                key={v.id}
                size="small"
                label={v.name}
                onClick={() => applySavedView(v)}
                onDelete={() => deleteSavedView(v.id)}
              />
            ))}
          </Box>
        )}
      </Stack>

      {/* Totals Row */}
      <Paper
        elevation={0}
        sx={{
          px: 2,
          py: 1,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
          flexShrink: 0,
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
          {totals.customer_count} {t("collections.report.customers", "customers")}
        </Typography>
        <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {t("collections.report.revenue", "Revenue")} <strong>{formatLkr(totals.revenue)}</strong>
        </Typography>
        <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {t("collections.report.paid", "Paid")} <strong>{formatLkr(totals.paid)}</strong>
        </Typography>
        <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums", color: dashboardTones.danger.strong }}>
          {t("collections.report.balance", "Balance")} <strong>{formatLkr(totals.balance)}</strong>
        </Typography>
        <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
          <strong>{totals.machines_out}</strong> {t("collections.report.machinesOut", "machines out")}
        </Typography>
      </Paper>

      {/* DataGrid */}
      <Paper
        elevation={0}
        sx={{
          flex: 1,
          minHeight: 320,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
        }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(r) => r.customer_id}
          loading={isLoading || isFetching}
          paginationMode="server"
          sortingMode="server"
          rowCount={data?.total ?? 0}
          paginationModel={{ page, pageSize: 50 }}
          onPaginationModelChange={(m) => setPage(m.page)}
          sortModel={sortModel}
          onSortModelChange={(m) => setSortModel(m)}
          pageSizeOptions={[50]}
          getRowHeight={() => "auto"}
          getEstimatedRowHeight={() => 116}
          onRowClick={(params) =>
            navigate({
              to: "/reports/customers/collections/$customerId",
              params: { customerId: String(params.row.customer_id) },
              search: queryParams as any,
            })
          }
          sx={{
            border: 0,
            "& .MuiDataGrid-row": { minHeight: "96px !important", cursor: "pointer" },
            "& .MuiDataGrid-cell": { whiteSpace: "normal", wordBreak: "break-word", py: 1, px: 1.5, alignItems: "flex-start" },
          }}
        />
      </Paper>

      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t("collections.report.saveViewTitle", "Save current view")}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label={t("collections.report.viewName", "View name")}
            placeholder={t("collections.report.viewNamePlaceholder", "e.g. Overdue scaffolding customers")}
            value={newViewName}
            onChange={(e) => setNewViewName(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>{t("common.cancel", "Cancel")}</Button>
          <Button variant="contained" onClick={handleSaveView}>{t("common.save", "Save")}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
