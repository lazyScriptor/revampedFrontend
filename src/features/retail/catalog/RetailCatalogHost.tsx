import { useOverlay } from "@/components/overlay";
import { useShortcut } from "@/components/command/shortcuts";
import { useRetailCatalog, useRetailPermissions } from "./useRetailCatalog";
import { useStockLevels } from "../stock/useStockLevels";
import { CORRECT_OVERLAY_ID, FINDER_OVERLAY_ID, STOCK_IN_OVERLAY_ID } from "./overlayIds";
import "./registerCatalog";

/**
 * Mounted once (inside RetailTopBar): F2 opens Stock in, F3 opens the item finder, and F4 opens
 * Correct anywhere in a retail shop, while the catalogue and stock levels warm in the background.
 */
export function RetailCatalogHost() {
  const { canView, canReceive, canAdjust } = useRetailPermissions();
  const { open, depth } = useOverlay();
  useShortcut("stock-in", () => open(STOCK_IN_OVERLAY_ID), canReceive && depth === 0);
  useShortcut("find-item", () => open(FINDER_OVERLAY_ID), canView && depth === 0);
  useShortcut("correct-stock", () => open(CORRECT_OVERLAY_ID), canAdjust && depth === 0);
  useRetailCatalog();
  useStockLevels();
  return null;
}
