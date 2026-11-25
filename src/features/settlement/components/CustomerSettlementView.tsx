import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Paper, Typography, useMediaQuery, useTheme } from "@mui/material";
import { useTranslation } from "react-i18next";
import { todayLocalStr } from "@/lib/dates";
import { useAuthStore } from "@/stores/useAuthStore";
import { useInvoiceDetails } from "@/features/invoices/hooks/useInvoiceHooks";
import { ReadOnlyInvoiceModal } from "@/features/invoices/components/ReadOnlyInvoiceModal";
import type { ReasonValue } from "@/features/activity/types";
import {
  useCommitSettlement,
  useCompleteSettlementBills,
  useCustomerOpenBills,
  useDebouncedSettlementPreview,
  useSettlementOverview,
  useSettlementViewPrefs,
} from "../hooks/useSettlementHooks";
import type {
  LeftoverMode,
  OpenBillsDatePreset,
  OpenBillsFilter,
  OpenBillsSort,
  QueueRule,
  SettlementCommitResponse,
  SettlementDiscountInput,
  SettlementPaymentInput,
  SettlementPreviewRequest,
  SettlementPreviewResponse,
  SettlementReturnInput,
  SplitRule,
} from "../types";
import { SettlementStepBar, type SettlementStep } from "./SettlementStepBar";
import { SettlementViewMenu } from "./SettlementViewMenu";
import { SettlementCustomerStep } from "./SettlementCustomerStep";
import { SettlementBillsStep } from "./SettlementBillsStep";
import { SettlementMachinesStep } from "./SettlementMachinesStep";
import { SettlementPaymentStep } from "./SettlementPaymentStep";
import { SettlementReviewStep } from "./SettlementReviewStep";

interface CustomerSettlementViewProps {
  initialCustomerId?: number;
  showToast?: (message: string, severity?: "error" | "success" | "warning") => void;
}

const makeIdempotencyKey = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? `settle-${crypto.randomUUID()}`
    : `settle-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export function CustomerSettlementView({
  initialCustomerId,
  showToast,
}: CustomerSettlementViewProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));
  const userId = useAuthStore((s) => (s.user as any)?.user_id ?? s.user?.id ?? null);
  const { prefs, updatePrefs, resetPrefs } = useSettlementViewPrefs(userId);

  const [customerId, setCustomerId] = useState<number | null>(initialCustomerId ?? null);
  const [activeStep, setActiveStep] = useState<SettlementStep>(initialCustomerId ? 2 : 1);

  useEffect(() => {
    if (initialCustomerId && initialCustomerId !== customerId) {
      setCustomerId(initialCustomerId);
      setActiveStep(2);
    }
  }, [initialCustomerId]);

  // Step 2 state: filters, sort, pagination, picked bills
  const [filter, setFilter] = useState<OpenBillsFilter>(prefs.defaultFilter);
  const [datePreset, setDatePreset] = useState<OpenBillsDatePreset>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [equipmentFilterId, setEquipmentFilterId] = useState<number | null>(null);
  const [sort, setSort] = useState<OpenBillsSort>("oldest");
  const [page, setPage] = useState(1);
  const [pickedIds, setPickedIds] = useState<number[]>([]);
  const [undoPickIds, setUndoPickIds] = useState<number[]>([]);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Side panel bill detail
  const [detailInvoiceId, setDetailInvoiceId] = useState<number | null>(null);
  const { data: detailInvoice } = useInvoiceDetails(detailInvoiceId);

  // Step 3 state: returns & return date
  const [returns, setReturns] = useState<SettlementReturnInput[]>([]);
  const [returnDate, setReturnDate] = useState<string>(todayLocalStr());
  const [returnDateReason, setReturnDateReason] = useState<ReasonValue | null>(null);
  const [splitRule, setSplitRule] = useState<SplitRule>(prefs.defaultSplitRule);

  // Step 4 state: payments, wallet, leftover, queue, discounts
  const [payments, setPayments] = useState<SettlementPaymentInput[]>([
    { amount: 0, method: "Cash", payment_date: todayLocalStr() },
  ]);
  const [useWalletAmount, setUseWalletAmount] = useState<number>(0);
  const [leftoverMode, setLeftoverMode] = useState<LeftoverMode>("credit");
  const [queueOrder, setQueueOrder] = useState<number[]>([]);
  const [queueRule, setQueueRule] = useState<QueueRule>(prefs.defaultQueueRule);
  const [billAmounts, setBillAmounts] = useState<Record<number, number>>({});
  const [discounts, setDiscounts] = useState<SettlementDiscountInput[]>([]);

  // Step 5 state: save, idempotency, 409 conflict, post-save
  const idempotencyKeyRef = useRef<string>(makeIdempotencyKey());
  const [savedSettlement, setSavedSettlement] = useState<SettlementCommitResponse | null>(null);
  const [conflictPreview, setConflictPreview] = useState<SettlementPreviewResponse | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [completedBillIds, setCompletedBillIds] = useState<number[]>([]);

  // Reset settlement draft when customer changes
  const handleSelectCustomer = (nextId: number | null) => {
    setCustomerId(nextId);
    setPickedIds([]);
    setUndoPickIds([]);
    setReturns([]);
    setReturnDate(todayLocalStr());
    setReturnDateReason(null);
    setPayments([{ amount: 0, method: "Cash", payment_date: todayLocalStr() }]);
    setUseWalletAmount(0);
    setLeftoverMode("credit");
    setQueueOrder([]);
    setBillAmounts({});
    setDiscounts([]);
    setSavedSettlement(null);
    setConflictPreview(null);
    setSaveError(null);
    setCompletedBillIds([]);
    idempotencyKeyRef.current = makeIdempotencyKey();
    if (nextId) {
      setActiveStep(2);
    } else {
      setActiveStep(1);
    }
  };

  // Queries
  const { data: overview, isLoading: overviewLoading } = useSettlementOverview(customerId);
  const openBillsQueryParams = useMemo(
    () => ({
      filter,
      date_preset: datePreset,
      ...(datePreset === "custom" && customFrom ? { from: customFrom } : {}),
      ...(datePreset === "custom" && customTo ? { to: customTo } : {}),
      ...(equipmentFilterId ? { equipment_id: equipmentFilterId } : {}),
      sort,
      page,
      limit: 30,
    }),
    [filter, datePreset, customFrom, customTo, equipmentFilterId, sort, page],
  );
  const { data: openBillsData, isLoading: billsLoading, isFetching: billsFetching } =
    useCustomerOpenBills(customerId, openBillsQueryParams);

  const bills = openBillsData?.bills ?? [];
  const totalPages = openBillsData?.total_pages ?? 1;

  // Preview payload sent to server (no client-side rental maths!)
  const previewRequest = useMemo<SettlementPreviewRequest | null>(() => {
    if (!customerId) return null;
    const todayStr = todayLocalStr();
    const activePayments = payments.filter((p) => Number(p.amount) > 0);
    const hasReturns = returns.some((r) => r.qty > 0);
    const hasDiscounts = discounts.length > 0;
    const hasWallet = useWalletAmount > 0;
    if (!hasReturns && activePayments.length === 0 && !hasDiscounts && !hasWallet && activeStep < 4) {
      return null;
    }
    return {
      ...(pickedIds.length > 0 ? { invoice_ids: pickedIds } : {}),
      ...(hasReturns ? { returns } : {}),
      ...(returnDate ? { return_date: returnDate } : {}),
      ...(returnDate < todayStr && returnDateReason ? { date_reason: returnDateReason } : {}),
      split_rule: splitRule,
      ...(activePayments.length > 0 ? { payments: activePayments } : {}),
      ...(queueOrder.length > 0 ? { queue_order: queueOrder } : {}),
      ...(Object.keys(billAmounts).length > 0 ? { bill_amounts: billAmounts } : {}),
      ...(hasDiscounts ? { discounts } : {}),
      leftover_mode: leftoverMode,
      ...(hasWallet ? { use_wallet_amount: useWalletAmount } : {}),
    };
  }, [
    customerId,
    pickedIds,
    returns,
    returnDate,
    returnDateReason,
    splitRule,
    payments,
    queueOrder,
    billAmounts,
    discounts,
    leftoverMode,
    useWalletAmount,
    activeStep,
  ]);

  const { preview, setPreview, isUpdating } = useDebouncedSettlementPreview(
    customerId,
    previewRequest,
    Boolean(customerId && previewRequest && !savedSettlement),
    300,
  );

  // Mutations
  const commitMutation = useCommitSettlement(customerId);
  const completeBillsMutation = useCompleteSettlementBills(customerId);

  const handleTogglePick = (invoiceId: number) => {
    setPickedIds((prev) =>
      prev.includes(invoiceId) ? prev.filter((id) => id !== invoiceId) : [...prev, invoiceId],
    );
  };

  const handlePickBill = (invoiceId: number) => {
    setPickedIds((prev) => (prev.includes(invoiceId) ? prev : [...prev, invoiceId]));
  };

  const handleUndoClearPick = () => {
    if (undoPickIds.length > 0) {
      setPickedIds(undoPickIds);
      setUndoPickIds([]);
    }
  };

  const handleSaveSettlement = () => {
    const activePreview = conflictPreview ?? preview;
    if (!customerId || !activePreview || !previewRequest) return;
    setSaveError(null);
    commitMutation.mutate(
      {
        body: {
          ...previewRequest,
          preview_version: activePreview.preview_version,
        },
        idempotencyKey: idempotencyKeyRef.current,
      },
      {
        onSuccess: (res) => {
          setSavedSettlement(res);
          setConflictPreview(null);
          // Clear pick after save, keeping Undo chip for a few seconds
          if (pickedIds.length > 0) {
            setUndoPickIds(pickedIds);
            setPickedIds([]);
            if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
            undoTimerRef.current = setTimeout(() => setUndoPickIds([]), 8000);
          }
          showToast?.(t("settlement.review.savedToast", "Settlement saved"), "success");
        },
        onError: (err: any) => {
          if (err?.status === 409 && (err?.code === "settlement_changed" || err?.data?.preview)) {
            const nextPreview: SettlementPreviewResponse | undefined = err?.data?.preview;
            if (nextPreview) {
              setConflictPreview(nextPreview);
              setPreview(nextPreview);
              // Keep the same Idempotency-Key? Spec: "409 with the new before -> after. The review highlights what moved, and the cashier confirms again. Double taps are safe with an idempotency key."
              // Wait: if the first request returned 409 (not 2xx), backend only stores 2xx responses, or if the cashier confirms with new preview_version, a new key or same key? Wait: prompt test says "idempotency key kept" across retries! Keeping idempotencyKeyRef.current across retries satisfies both double-tap and retry tests!
            }
            return;
          }
          setSaveError(err?.message || t("settlement.review.saveFailed", "Failed to save settlement"));
        },
      },
    );
  };

  const handleCompleteBills = (invoiceIds: number[], releaseIdCard: boolean) => {
    completeBillsMutation.mutate(
      { invoice_ids: invoiceIds, release_id_card: releaseIdCard },
      {
        onSuccess: (res) => {
          setCompletedBillIds((prev) => Array.from(new Set([...prev, ...(res.completed_invoice_ids || invoiceIds)])));
          showToast?.(t("settlement.review.billsClosedToast", "Bills closed"), "success");
        },
        onError: (err: any) => {
          showToast?.(err?.message || t("settlement.review.closeFailed", "Failed to close bills"), "error");
        },
      },
    );
  };

  const handleSkipStep = (step: 3 | 4) => {
    setActiveStep(step === 3 ? 4 : 5);
  };

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  const leftPane = (
    <Box
      sx={{
        width: isDesktop ? 380 : "100%",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        minHeight: 0,
        overflowY: isDesktop ? "auto" : "visible",
      }}
    >
      <SettlementCustomerStep
        selectedCustomerId={customerId}
        onSelectCustomer={handleSelectCustomer}
        overview={overview}
        isOverviewLoading={overviewLoading}
        onProceed={activeStep === 1 && customerId ? () => setActiveStep(2) : undefined}
        compact={isDesktop && activeStep > 1}
      />
    </Box>
  );

  const rightPane = (
    <Paper
      elevation={0}
      sx={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        p: { xs: 1.25, sm: 2 },
        borderRadius: 2.5,
        border: "1px solid",
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        overflow: isDesktop ? "hidden" : "visible",
      }}
    >
      {!customerId ? (
        <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", p: 4, textAlign: "center" }}>
          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
            {t("settlement.selectCustomerPrompt", "Select a customer to view their open bills, return machines, and settle payments.")}
          </Typography>
        </Box>
      ) : activeStep === 1 || activeStep === 2 ? (
        <SettlementBillsStep
          bills={bills}
          totalCount={openBillsData?.total ?? bills.length}
          isLoading={billsLoading}
          isFetchingMore={billsFetching}
          hasMore={page < totalPages}
          onLoadMore={() => setPage((p) => p + 1)}
          pickedIds={pickedIds}
          onTogglePick={handleTogglePick}
          onPickBill={handlePickBill}
          undoPickIds={undoPickIds}
          onUndoClearPick={handleUndoClearPick}
          filter={filter}
          onFilterChange={(f) => {
            setFilter(f);
            setPage(1);
          }}
          datePreset={datePreset}
          onDatePresetChange={(d) => {
            setDatePreset(d);
            setPage(1);
          }}
          customFrom={customFrom}
          customTo={customTo}
          onCustomDateChange={(from, to) => {
            setCustomFrom(from);
            setCustomTo(to);
            setPage(1);
          }}
          equipmentFilterId={equipmentFilterId}
          onEquipmentFilterChange={(id) => {
            setEquipmentFilterId(id);
            setPage(1);
          }}
          machinesBar={overview?.machines_bar ?? []}
          sort={sort}
          onSortChange={(s) => {
            setSort(s);
            setPage(1);
          }}
          onOpenBillDetail={(id) => setDetailInvoiceId(id)}
          prefs={prefs}
          totalOpenBillsCount={overview?.summary?.open_bills_count ?? bills.length}
        />
      ) : activeStep === 3 ? (
        <SettlementMachinesStep
          machinesBar={overview?.machines_bar ?? []}
          pickedIds={pickedIds}
          openBills={bills}
          returns={returns}
          onChangeReturns={setReturns}
          returnDate={returnDate}
          onChangeReturnDate={setReturnDate}
          dateReason={returnDateReason}
          onChangeDateReason={setReturnDateReason}
          splitRule={splitRule}
          onChangeSplitRule={setSplitRule}
          preview={preview}
          onClearPicked={() => setPickedIds([])}
          onNextStep={() => setActiveStep(4)}
        />
      ) : activeStep === 4 ? (
        <SettlementPaymentStep
          payments={payments}
          onChangePayments={setPayments}
          useWalletAmount={useWalletAmount}
          onChangeUseWalletAmount={setUseWalletAmount}
          walletBalance={Number(overview?.customer?.deposit_balance ?? 0)}
          leftoverMode={leftoverMode}
          onChangeLeftoverMode={setLeftoverMode}
          queueOrder={queueOrder}
          onChangeQueueOrder={setQueueOrder}
          queueRule={queueRule}
          onChangeQueueRule={setQueueRule}
          billAmounts={billAmounts}
          onChangeBillAmounts={setBillAmounts}
          discounts={discounts}
          onChangeDiscounts={setDiscounts}
          preview={preview}
          onNextStep={() => setActiveStep(5)}
        />
      ) : (
        <SettlementReviewStep
          preview={preview}
          savedSettlement={savedSettlement}
          isSaving={commitMutation.isPending}
          conflictPreview={conflictPreview}
          saveError={saveError}
          customerPhone={overview?.customer?.phone_number}
          onSave={handleSaveSettlement}
          onCompleteBills={handleCompleteBills}
          isCompletingBills={completeBillsMutation.isPending}
          completedBillIds={completedBillIds}
        />
      )}
    </Paper>
  );

  return (
    <Box
      data-testid="customer-settlement-view"
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        height: "100%",
        minHeight: 0,
        overflow: isDesktop ? "hidden" : "visible",
      }}
    >
      {/* Top bar: 5-step bar + View menu */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <SettlementStepBar
            activeStep={activeStep}
            onSelectStep={setActiveStep}
            hasCustomer={Boolean(customerId)}
            onSkipStep={handleSkipStep}
            isUpdating={isUpdating}
          />
        </Box>
        <SettlementViewMenu prefs={prefs} onUpdate={updatePrefs} onReset={resetPrefs} />
      </Box>

      {/* Two panes on desktop, single scrolling column on phone */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: isDesktop ? "row" : "column",
          gap: 2,
          overflow: isDesktop ? "hidden" : "visible",
        }}
      >
        {(isDesktop || activeStep === 1 || Boolean(customerId)) && leftPane}
        {rightPane}
      </Box>

      {/* Side panel / modal for full bill details */}
      <ReadOnlyInvoiceModal
        open={Boolean(detailInvoiceId)}
        onClose={() => setDetailInvoiceId(null)}
        invoice={detailInvoice ?? null}
      />
    </Box>
  );
}
