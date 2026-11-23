import { useOverlay } from "@/components/overlay";
import { useShortcut } from "@/components/command/shortcuts";
import { useRetailCatalog, useRetailPermissions } from "./useRetailCatalog";
import { FINDER_OVERLAY_ID } from "./overlayIds";
import "./registerCatalog";

/**
 * Mounted once (inside RetailTopBar): F3 opens the item finder anywhere in a retail shop, and the
 * catalogue starts loading in the background so the first search is instant.
 */
export function RetailCatalogHost() {
  const { canView } = useRetailPermissions();
  const { open, depth } = useOverlay();
  useShortcut("find-item", () => open(FINDER_OVERLAY_ID), canView && depth === 0);
  useRetailCatalog();
  return null;
}
