import type { QueryClient } from "@tanstack/react-query";
import { connectSocket, getSocket } from "@/lib/socket";

/**
 * The server sends `data:changed { topics, invoice_id?, customer_id? }` to every open screen of
 * the shop after any save (backend dataChangeNotifier). That lets the caches be long (customers,
 * the POS equipment list, the dashboard) and still never show stale stock or balances: only the
 * data that changed is refreshed. Notices are batched for a moment so a burst of saves causes
 * one refresh.
 */
export type DataTopic = "invoices" | "equipment" | "customers" | "dashboard" | "retail";

export interface DataChangedNotice {
  topics?: DataTopic[];
  invoice_id?: number;
  customer_id?: number;
}

/** Dashboard parts that are lists people act on: reloaded at once. The charts wait for the button. */
const LIVE_DASHBOARD_PARTS = new Set(["open-invoices", "returns-today"]);

export const applyDataChanges = (qc: QueryClient, notices: DataChangedNotice[]) => {
  const topics = new Set(notices.flatMap((n) => n.topics ?? []));
  const invoiceIds = new Set(notices.map((n) => n.invoice_id).filter((id): id is number => Number.isFinite(id)));
  const customerIds = new Set(notices.map((n) => n.customer_id).filter((id): id is number => Number.isFinite(id)));

  if (topics.has("invoices")) {
    void qc.invalidateQueries({ queryKey: ["invoices"] });
    void qc.invalidateQueries({ queryKey: ["invoice-search"] });
    void qc.invalidateQueries({ queryKey: ["customer-invoices"] });
    void qc.invalidateQueries({ queryKey: ["activity"] });
    if (invoiceIds.size) for (const id of invoiceIds) void qc.invalidateQueries({ queryKey: ["invoice", id] });
    else void qc.invalidateQueries({ queryKey: ["invoice"] });
  }
  if (topics.has("equipment")) {
    // ["equipment", ...] covers the equipment page and the POS catalogue (["equipment", "pos-catalog"]).
    void qc.invalidateQueries({ queryKey: ["equipment"] });
    void qc.invalidateQueries({ queryKey: ["equipment-stats"] });
  }
  if (topics.has("customers")) {
    void qc.invalidateQueries({ queryKey: ["customers"] });
    void qc.invalidateQueries({ queryKey: ["customer-stats"] });
    void qc.invalidateQueries({ queryKey: ["pos-customer-index"] });
    void qc.invalidateQueries({ queryKey: ["pos-customer-search"] });
    if (customerIds.size) for (const id of customerIds) void qc.invalidateQueries({ queryKey: ["customer", id] });
  }
  if (topics.has("retail")) {
    void qc.invalidateQueries({ queryKey: ["retail"] });
  }
  if (topics.has("dashboard")) {
    void qc.invalidateQueries({
      queryKey: ["dashboard"],
      predicate: (q) => LIVE_DASHBOARD_PARTS.has(String(q.queryKey[1])),
    });
    // Heavy charts: marked out of date only. The refresh button shows a dot; the next visit or a
    // press of the button reloads them.
    void qc.invalidateQueries({
      queryKey: ["dashboard"],
      predicate: (q) => q.queryKey[1] !== "config" && !LIVE_DASHBOARD_PARTS.has(String(q.queryKey[1])),
      refetchType: "none",
    });
  }
};

/** Starts listening; returns a stop function. */
export const startRealtimeInvalidation = (qc: QueryClient, { delayMs = 400 } = {}) => {
  connectSocket();
  const socket = getSocket();
  let pending: DataChangedNotice[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  const onChange = (notice: DataChangedNotice) => {
    pending.push(notice ?? {});
    if (timer) return;
    timer = setTimeout(() => {
      const batch = pending;
      pending = [];
      timer = null;
      applyDataChanges(qc, batch);
    }, delayMs);
  };
  socket.on("data:changed", onChange);
  return () => {
    socket.off("data:changed", onChange);
    if (timer) clearTimeout(timer);
  };
};
