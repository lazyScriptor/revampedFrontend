/**
 * Local LRU cache of the last 30 bills opened on the phone so DeviceInvoicePage opens
 * immediately on slow/offline networks and refreshes in the background.
 */
const BILL_CACHE_KEY = "geargrid.phone.bill_cache.v1";
const MAX_CACHED_BILLS = 30;

export interface CachedBillEntry<T = unknown> {
  invoiceId: number;
  cachedAt: string;
  data: T;
}

function readCacheList<T>(): Array<CachedBillEntry<T>> {
  try {
    const raw = window.localStorage.getItem(BILL_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCacheList<T>(list: Array<CachedBillEntry<T>>) {
  try {
    window.localStorage.setItem(BILL_CACHE_KEY, JSON.stringify(list));
  } catch {
    // Ignore quota errors
  }
}

export function getCachedBill<T>(invoiceId: number): CachedBillEntry<T> | null {
  if (!Number.isInteger(invoiceId) || invoiceId <= 0) return null;
  const list = readCacheList<T>();
  return list.find((item) => item.invoiceId === invoiceId) ?? null;
}

export function putCachedBill<T>(invoiceId: number, data: T): CachedBillEntry<T> {
  const entry: CachedBillEntry<T> = {
    invoiceId,
    cachedAt: new Date().toISOString(),
    data,
  };
  if (!Number.isInteger(invoiceId) || invoiceId <= 0) return entry;
  const list = readCacheList<T>().filter((item) => item.invoiceId !== invoiceId);
  list.unshift(entry);
  writeCacheList(list.slice(0, MAX_CACHED_BILLS));
  return entry;
}

export function formatCachedAgeMinutes(cachedAt: string, now = Date.now()): number {
  const t = new Date(cachedAt).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((now - t) / 60_000));
}
