import { useCallback } from "react";
import { useOverlay } from "@/components/overlay";
import { useRetailEnabled } from "../useRetailEnabled";
import type { ApprovalGrant, ApprovalRequestInput } from "../api/types";
import { APPROVAL_OVERLAY_ID } from "./ApprovalOverlay";

/**
 * Asks a manager to approve one action (plan §7.14).
 *
 *   const { request } = useApproval();
 *   const grant = await request({ type: "price_change", summary: "Price 1,250 -> 1,100 (-12%)", context: {...} });
 *   if (!grant) return;                     // cancelled, closed, or not available
 *   send({ ...payload, approval_token: grant.approval_token });
 *
 * Resolves with the one-time token (valid ~60 s), or null if the overlay was closed or the shop
 * does not have retail. Not wired into any POS action yet.
 */
export function useApproval() {
  const { open } = useOverlay();
  const enabled = useRetailEnabled();
  const request = useCallback(
    (input: ApprovalRequestInput) =>
      new Promise<ApprovalGrant | null>((resolve) => {
        if (!enabled) {
          resolve(null);
          return;
        }
        open(APPROVAL_OVERLAY_ID, { input, resolve }, { onClosed: () => resolve(null) });
      }),
    [open, enabled],
  );
  return { request };
}
