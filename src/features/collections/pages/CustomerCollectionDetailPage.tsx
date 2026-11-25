import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  Paper,
  Rating,
  Stack,
  Switch,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import AddCallIcon from "@mui/icons-material/AddIcCall";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { useCustomerCollectionDetail } from "../hooks/useCollections";
import type { CollectionBillCard, CollectionsQueryParams } from "../types";
import { RowCallControls } from "../components/RowCallControls";
import { CallCardPopover } from "../components/CallCardPopover";
import { RecordingPlayer } from "../components/RecordingPlayer";
import { WhatsAppButton } from "@/features/whatsapp/components/WhatsAppButton";
import { dashboardTones } from "@/features/dashboard/_tokens";

const formatLkr = (n: number) =>
  `Rs ${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export default function CustomerCollectionDetailPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { customerId?: string };
  const search = useSearch({ strict: false }) as CollectionsQueryParams;
  const customerId = Number(params.customerId || 0);

  const [filtersOn, setFiltersOn] = useState<boolean>(true);
  const [billTab, setBillTab] = useState<"not_complete" | "complete">("not_complete");
  const [expandedComplete, setExpandedComplete] = useState<Record<number, boolean>>({});
  const [callFilterMode, setCallFilterMode] = useState<{
    outcome?: string;
    staffId?: number | null;
    promisedOnly?: boolean;
  }>({});
  const [addCallAnchor, setAddCallAnchor] = useState<HTMLElement | null>(null);

  const { data, isLoading } = useCustomerCollectionDetail(customerId, {
    ...search,
    filters_on: filtersOn,
  });

  const filteredCalls = useMemo(() => {
    const all = data?.calls ?? [];
    return all.filter((c) => {
      if (callFilterMode.outcome && c.outcome !== callFilterMode.outcome) return false;
      if (callFilterMode.staffId !== undefined && c.staff_id !== callFilterMode.staffId) return false;
      if (callFilterMode.promisedOnly && !c.promise_amount) return false;
      return true;
    });
  }, [data?.calls, callFilterMode]);

  const exportCallsCsv = () => {
    const headers = ["Date", "Staff", "Direction", "Outcome", "Duration (s)", "Brief", "Promise"];
    const lines = [headers.join(",")];
    filteredCalls.forEach((c) => {
      lines.push(
        [
          c.started_at,
          `"${c.staff_name || ""}"`,
          c.direction,
          c.outcome || "",
          c.duration_seconds ?? 0,
          `"${(c.note || "").replace(/"/g, '""')}"`,
          c.promise_amount ? `${c.promise_amount} by ${c.promise_date || ""}` : "",
        ].join(","),
      );
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customer-${customerId}-calls.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading && !data) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">{t("common.loading", "Loading...")}</Typography>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">{t("collections.customer.notFound", "Customer collection details not found.")}</Alert>
      </Box>
    );
  }

  const { customer, filtered_totals, all_totals, timeline, not_complete_bills, complete_bills, calls_summary } = data;
  const totalsDiffer = filtered_totals.balance !== all_totals.balance;

  const renderBillCard = (bill: CollectionBillCard, compact = false) => {
    const isExpanded = !compact || Boolean(expandedComplete[bill.invoice_id]);
    return (
      <Paper
        key={bill.invoice_id}
        id={`bill-card-${bill.invoice_id}`}
        elevation={0}
        onClick={() => {
          if (compact) {
            setExpandedComplete((prev) => ({ ...prev, [bill.invoice_id]: !prev[bill.invoice_id] }));
          }
        }}
        sx={{
          p: 1.5,
          borderRadius: 2,
          border: "1px solid",
          borderColor: bill.days_late > 0 ? `${dashboardTones.danger.strong}55` : "divider",
          cursor: compact ? "pointer" : "default",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Chip
              size="small"
              label={`INV-${bill.invoice_id}`}
              sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
              {dayjs(bill.issued_date).format("D MMM YYYY")}
            </Typography>
            {bill.days_late > 0 && (
              <Chip
                size="small"
                color="error"
                label={`${bill.days_late}d late`}
                sx={{ height: 20, fontSize: "0.66rem", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
              />
            )}
          </Box>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 900,
              color: bill.balance > 0 ? dashboardTones.danger.strong : dashboardTones.accent.strong,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {bill.balance > 0 ? `${formatLkr(bill.balance)} owed` : t("collections.customer.paid", "Paid")}
          </Typography>
        </Box>

        <Collapse in={isExpanded}>
          <Stack spacing={1} sx={{ mt: 1.25 }}>
            {bill.lines.map((line) => (
              <Box
                key={line.line_id}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 1,
                  fontSize: "0.78rem",
                  borderTop: "1px dashed",
                  borderColor: "divider",
                  pt: 0.75,
                }}
              >
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, display: "block" }}>
                    {line.equipment_name} · {line.borrow_quantity} out ({line.returned_quantity} back)
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                    {line.expected_return_date ? `Due ${dayjs(line.expected_return_date).format("D MMM")}` : "Open-ended"}
                    {line.days_late > 0 ? ` · ${line.days_late}d late` : ""}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  {formatLkr(line.running_charge)}
                </Typography>
              </Box>
            ))}

            <Divider />

            <Box sx={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
              <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums" }}>
                Total: <strong>{formatLkr(bill.revenue)}</strong> · Paid: <strong>{formatLkr(bill.paid)}</strong>
                {bill.discount_amount > 0 && (
                  <>
                    {" "}
                    · Discount: <strong>{formatLkr(bill.discount_amount)}</strong>
                    {bill.discount_reason_key ? ` (${bill.discount_reason_key})` : ""}
                  </>
                )}
              </Typography>
            </Box>
          </Stack>
        </Collapse>
      </Paper>
    );
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, p: { xs: 1.5, md: 2.5 }, pb: 5 }}>
      {/* Top navigation & Always-visible filter banner */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          borderRadius: 2,
          border: "1px solid",
          borderColor: filtersOn ? "warning.main" : "divider",
          bgcolor: filtersOn ? "rgba(245, 158, 11, 0.08)" : "background.paper",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
          <Button
            size="small"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate({ to: "/reports/customers/collections", search: search as any })}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {t("common.back", "Back")}
          </Button>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>
              {filtersOn
                ? t("collections.customer.bannerFiltered", {
                    summary: data.filter_summary,
                    defaultValue: `These details are for the filters you chose: ${data.filter_summary}`,
                  })
                : t("collections.customer.bannerAll", "Showing everything for this customer.")}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
              <strong>{formatLkr(filtered_totals.balance)}</strong>{" "}
              {t("collections.customer.owedInTheseBills", "owed in these bills")}
              {totalsDiffer && (
                <>
                  {" · "}
                  <strong>{formatLkr(all_totals.balance)}</strong>{" "}
                  {t("collections.customer.inAllBills", "in all bills")}
                </>
              )}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Typography variant="caption" sx={{ fontWeight: filtersOn ? 800 : 500 }}>
            {t("collections.customer.filtersOn", "Filters on")}
          </Typography>
          <Switch
            checked={!filtersOn}
            onChange={(e) => setFiltersOn(!e.target.checked)}
            slotProps={{
              input: {
                "aria-label": t("collections.customer.filtersSwitch", "Filters on or Show everything"),
              },
            }}
          />
          <Typography variant="caption" sx={{ fontWeight: !filtersOn ? 800 : 500 }}>
            {t("collections.customer.showEverything", "Show everything")}
          </Typography>
        </Box>
      </Paper>

      {/* Customer Summary Card */}
      <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 1.5 }}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {customer.name}
              </Typography>
              <Chip size="small" label={`#${customer.customer_id}`} sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }} />
              {typeof customer.rating === "number" && <Rating value={customer.rating} readOnly size="small" precision={0.5} />}
              {customer.is_blacklisted && (
                <Chip size="small" color="error" label={t("collections.status.blacklisted", "Blacklisted")} />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums", mt: 0.25 }}>
              {[customer.nic_number, customer.phone_number].filter(Boolean).join(" · ") || "—"}
            </Typography>
            <Box sx={{ display: "flex", gap: 2, mt: 1, flexWrap: "wrap" }}>
              <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
                {t("collections.report.revenue", "Revenue")}: <strong>{formatLkr(customer.revenue)}</strong>
              </Typography>
              <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
                {t("collections.report.paid", "Paid")}: <strong>{formatLkr(customer.paid)}</strong>
              </Typography>
              <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums", color: dashboardTones.danger.strong }}>
                {t("collections.report.balance", "Balance")}: <strong>{formatLkr(customer.balance)}</strong>
              </Typography>
            </Box>
            {customer.machines_out.length > 0 && (
              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 1 }}>
                {customer.machines_out.map((m) => (
                  <Chip
                    key={m.equipment_id}
                    size="small"
                    label={`${m.name} × ${m.qty}`}
                    color={m.days_overdue > 0 ? "error" : "default"}
                    variant="outlined"
                    sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}
                  />
                ))}
              </Box>
            )}
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <RowCallControls
              customerId={customer.customer_id}
              customerName={customer.name}
              phone={customer.phone_number}
              invoiceIds={customer.invoice_ids}
              lastCall={customer.last_call}
              compact={false}
            />
            {customer.phone_number && (
              <WhatsAppButton
                variant="button"
                size="small"
                invoiceId={customer.invoice_ids?.[0] ?? 0}
                templateKey="payment_reminder"
                disabled={!customer.invoice_ids?.length}
              />
            )}
            <Tooltip title={t("collections.customer.settleComingSoon", "Customer settlement (coming soon in Slice 3)")}>
              <span>
                <Button
                  size="small"
                  variant="contained"
                  disabled
                  startIcon={<AccountBalanceWalletOutlinedIcon />}
                  sx={{ textTransform: "none", fontWeight: 700 }}
                >
                  {t("collections.customer.settleSoon", "Settle (coming soon)")}
                </Button>
              </span>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* Timeline Strip */}
      {timeline.length > 0 && (
        <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block", mb: 0.75 }}>
            {t("collections.customer.timeline", "Bill timeline (tap to jump)")}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, overflowX: "auto", pb: 0.5 }}>
            {timeline.map((dot) => {
              const color =
                dot.state === "open_owing"
                  ? "#ef4444"
                  : dot.state === "open_paid"
                    ? "#f59e0b"
                    : "#10b981";
              return (
                <Chip
                  key={dot.invoice_id}
                  size="small"
                  clickable
                  onClick={() => {
                    const el = document.getElementById(`bill-card-${dot.invoice_id}`);
                    el?.scrollIntoView?.({ behavior: "smooth", block: "center" });
                  }}
                  label={`INV-${dot.invoice_id} · ${dayjs(dot.issued_date).format("D MMM")}`}
                  sx={{
                    flexShrink: 0,
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 700,
                    borderLeft: `4px solid ${color}`,
                  }}
                />
              );
            })}
          </Box>
        </Paper>
      )}

      {/* Bills: 2 columns on desktop, tabs on phone */}
      {isPhone ? (
        <Box>
          <Tabs value={billTab} onChange={(_e, v) => setBillTab(v)} sx={{ mb: 1.5 }}>
            <Tab value="not_complete" label={`${t("collections.customer.notComplete", "Not complete")} (${not_complete_bills.length})`} />
            <Tab value="complete" label={`${t("collections.customer.complete", "Complete")} (${complete_bills.length})`} />
          </Tabs>
          <Stack spacing={1.25}>
            {(billTab === "not_complete" ? not_complete_bills : complete_bills).map((b) =>
              renderBillCard(b, billTab === "complete"),
            )}
          </Stack>
        </Box>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 2 }}>
          <Stack spacing={1.25}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              {t("collections.customer.notComplete", "Not complete")} ({not_complete_bills.length})
            </Typography>
            {not_complete_bills.map((b) => renderBillCard(b, false))}
          </Stack>
          <Stack spacing={1.25}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              {t("collections.customer.complete", "Complete")} ({complete_bills.length})
            </Typography>
            {complete_bills.map((b) => renderBillCard(b, true))}
          </Stack>
        </Box>
      )}

      {/* Calls Section */}
      <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            {t("collections.customer.callsHeading", "Calls with this customer")}
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddCallIcon />}
              onClick={(e) => setAddCallAnchor(e.currentTarget)}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              {t("collections.customer.addCallByHand", "Add call by hand")}
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<DownloadOutlinedIcon />}
              onClick={exportCallsCsv}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              {t("collections.customer.exportCalls", "Export calls")}
            </Button>
          </Box>
        </Box>

        {/* Tappable Calls Summary Strip */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 1 }}>
          <Chip
            size="small"
            clickable
            label={`${calls_summary.total} ${t("collections.calls.callsLabel", "calls")}`}
            color={!callFilterMode.outcome && callFilterMode.staffId === undefined && !callFilterMode.promisedOnly ? "warning" : "default"}
            onClick={() => setCallFilterMode({})}
            sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}
          />
          <Chip
            size="small"
            clickable
            label={`${calls_summary.answered} ${t("collections.callCard.answered", "answered")}`}
            color={callFilterMode.outcome === "answered" ? "success" : "default"}
            onClick={() =>
              setCallFilterMode((m) => ({ ...m, outcome: m.outcome === "answered" ? undefined : "answered" }))
            }
            sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}
          />
          <Chip
            size="small"
            clickable
            label={`${calls_summary.no_answer} ${t("collections.callCard.noAnswer", "no answer")}`}
            color={callFilterMode.outcome === "no_answer" ? "error" : "default"}
            onClick={() =>
              setCallFilterMode((m) => ({ ...m, outcome: m.outcome === "no_answer" ? undefined : "no_answer" }))
            }
            sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}
          />
          {calls_summary.by_staff.map((st) => (
            <Chip
              key={st.staff_name}
              size="small"
              clickable
              label={`${st.staff_name} (${st.count})`}
              color={callFilterMode.staffId === st.staff_id ? "warning" : "default"}
              onClick={() =>
                setCallFilterMode((m) => ({
                  ...m,
                  staffId: m.staffId === st.staff_id ? undefined : st.staff_id,
                }))
              }
              sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}
            />
          ))}
          {calls_summary.promises_count > 0 && (
            <Chip
              size="small"
              clickable
              label={`${calls_summary.promises_count} promise (${formatLkr(calls_summary.promises_amount)})`}
              color={callFilterMode.promisedOnly ? "warning" : "default"}
              onClick={() => setCallFilterMode((m) => ({ ...m, promisedOnly: !m.promisedOnly }))}
              sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}
            />
          )}
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
          {t(
            "collections.customer.pairedPhonesOnlyNote",
            "Only calls from paired GearGrid phones (and calls entered by hand) appear here.",
          )}
        </Typography>

        <Stack spacing={1.25}>
          {filteredCalls.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("collections.customer.noCalls", "No calls match the selected filter.")}
            </Typography>
          ) : (
            filteredCalls.map((call) => (
              <Paper
                key={call.call_id}
                elevation={0}
                sx={{ p: 1.5, borderRadius: 2, border: "1px solid", borderColor: "divider" }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 1 }}>
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                        {dayjs(call.started_at).format("D MMM YYYY HH:mm")}
                      </Typography>
                      {call.staff_name && (
                        <Chip size="small" label={call.staff_name} sx={{ height: 20, fontSize: "0.66rem", fontWeight: 700 }} />
                      )}
                      <Chip
                        size="small"
                        variant="outlined"
                        label={
                          call.source === "manual"
                            ? t("collections.calls.enteredByHand", "Entered by hand")
                            : call.direction === "INCOMING"
                              ? t("collections.calls.theyCalled", "They called")
                              : call.direction === "MISSED"
                                ? t("collections.calls.missed", "Missed")
                                : t("collections.calls.weCalled", "We called")
                        }
                        sx={{ height: 20, fontSize: "0.66rem" }}
                      />
                      <Chip
                        size="small"
                        color={
                          call.outcome === "answered"
                            ? "success"
                            : call.outcome === "no_answer"
                              ? "error"
                              : "warning"
                        }
                        label={`${call.outcome || "—"} ${call.duration_seconds ? `· ${call.duration_seconds}s` : ""}`}
                        sx={{ height: 20, fontSize: "0.66rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
                      />
                      {call.result_label && (
                        <Chip size="small" label={call.result_label} sx={{ height: 20, fontSize: "0.66rem", fontWeight: 700 }} />
                      )}
                    </Box>

                    {call.invoice_ids && call.invoice_ids.length > 0 && (
                      <Box sx={{ display: "flex", gap: 0.5, mt: 0.5, flexWrap: "wrap" }}>
                        {call.invoice_ids.map((id) => (
                          <Chip
                            key={id}
                            size="small"
                            label={`INV-${id}`}
                            sx={{ height: 18, fontSize: "0.62rem", fontVariantNumeric: "tabular-nums" }}
                          />
                        ))}
                      </Box>
                    )}

                    <Box sx={{ mt: 0.75 }}>
                      {call.note ? (
                        <Typography variant="body2">{call.note}</Typography>
                      ) : (
                        <Typography variant="caption" sx={{ color: dashboardTones.warning.strong, fontWeight: 800 }}>
                          {t("collections.calls.noNoteEntered", "No note entered")}
                        </Typography>
                      )}
                    </Box>

                    {call.promise_amount && call.promise_date && (
                      <Typography variant="caption" sx={{ display: "block", mt: 0.5, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                        💰 {formatLkr(call.promise_amount)} by {dayjs(call.promise_date).format("D MMM YYYY")} ·{" "}
                        <strong>{call.promise_status || "waiting"}</strong>
                      </Typography>
                    )}
                  </Box>

                  <RecordingPlayer
                    callId={call.call_id}
                    recordingId={call.recording_id}
                    durationSeconds={call.recording_duration_seconds}
                    disputeHold={call.dispute_hold}
                  />
                </Box>
              </Paper>
            ))
          )}
        </Stack>
      </Paper>

      <CallCardPopover
        anchorEl={addCallAnchor}
        open={Boolean(addCallAnchor)}
        onClose={() => setAddCallAnchor(null)}
        customerId={customer.customer_id}
        customerName={customer.name}
        phone={customer.phone_number}
        invoiceIds={customer.invoice_ids}
      />
    </Box>
  );
}
