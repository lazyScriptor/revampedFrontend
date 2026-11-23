import { useCallback } from "react";
import { usePosCartStore } from "@/features/invoices/store/posCartStore";
import { useApproval } from "../approval/useApproval";
import { useRetailPermissions } from "../catalog/useRetailCatalog";
import { useRetailSettings } from "../hooks/useRetailSettings";
import { computeDiscountPct } from "./posPricing";

/**
 * The bill-discount approval rule, for checkouts that don't use SaleCheckoutSection (mixed bills).
 * `base` is everything the discount applies to (the whole bill: rent + items + transport).
 * `ensureApproved()` resolves true when no approval is needed or one was granted (the token is kept
 * in the cart store and sent with the bill), false when the cashier cancelled.
 */
export function useBillDiscountGate(discount: number, base: number) {
  const { settings } = useRetailSettings();
  const { canDiscount } = useRetailPermissions();
  const { request } = useApproval();
  const token = usePosCartStore((s) => s.billDiscountApprovalToken);
  const setToken = usePosCartStore((s) => s.setBillDiscountApprovalToken);

  const pct = computeDiscountPct(1, Math.max(0, base), discount);
  const mode = settings.exceptions?.discount_over_limit ?? "approve";
  const needs =
    discount > 0 &&
    !token &&
    ((!canDiscount && mode !== "off") || (pct > (settings.discountLimitPct ?? 10) && mode === "approve"));

  const ensureApproved = useCallback(async () => {
    if (!needs) return true;
    const grant = await request({
      type: "discount_over_limit",
      summary: `Bill discount −Rs ${discount.toLocaleString()} (${pct}%)`,
      context: { discount, discount_pct: pct, limit_pct: settings.discountLimitPct ?? 10 },
      amount_impact: -discount,
    });
    if (!grant) return false;
    setToken(grant.approval_token);
    return true;
  }, [needs, request, discount, pct, settings.discountLimitPct, setToken]);

  return { needsApproval: needs, ensureApproved };
}
