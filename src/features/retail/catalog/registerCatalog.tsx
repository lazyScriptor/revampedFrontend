import { Suspense, lazy } from "react";
import type { ComponentType } from "react";
import { Box, CircularProgress } from "@mui/material";
import { Overlay, registerOverlay } from "@/components/overlay";
import { registerCommand } from "@/components/command/commandRegistry";
import {
  BRANDS_OVERLAY_ID,
  CATEGORIES_OVERLAY_ID,
  CORRECT_OVERLAY_ID,
  COUNT_OVERLAY_ID,
  FINDER_OVERLAY_ID,
  HISTORY_OVERLAY_ID,
  ITEM_CARD_OVERLAY_ID,
  NEW_ITEM_OVERLAY_ID,
  STOCK_IN_OVERLAY_ID,
  WORDS_OVERLAY_ID,
} from "./overlayIds";

// The retail overlays are separate chunks: the main bundle only holds this small registry, and an
// overlay downloads the first time it opens (the Stock page also preloads them).

const loaders = {
  [FINDER_OVERLAY_ID]: () => import("../finder/FinderOverlay"),
  [ITEM_CARD_OVERLAY_ID]: () => import("../item/ItemCardOverlay"),
  [NEW_ITEM_OVERLAY_ID]: () => import("../item/NewItemOverlay"),
  [CATEGORIES_OVERLAY_ID]: () => import("../manage/CategoriesOverlay"),
  [BRANDS_OVERLAY_ID]: () => import("../manage/BrandsOverlay"),
  [WORDS_OVERLAY_ID]: () => import("../manage/WordsOverlay"),
  [STOCK_IN_OVERLAY_ID]: () => import("../stock/StockInOverlay"),
  [CORRECT_OVERLAY_ID]: () => import("../stock/CorrectOverlay"),
  [COUNT_OVERLAY_ID]: () => import("../stock/CountOverlay"),
  [HISTORY_OVERLAY_ID]: () => import("../stock/HistoryOverlay"),
};

const lazyOverlay = (load: () => Promise<{ default: ComponentType<any> }>) => {
  const Lazy = lazy(load);
  return function LazyOverlay(props: any) {
    return (
      <Suspense
        fallback={
          <Overlay title="…" width={480}>
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          </Overlay>
        }
      >
        <Lazy {...props} />
      </Suspense>
    );
  };
};

(Object.keys(loaders) as Array<keyof typeof loaders>).forEach((id) => registerOverlay(id, lazyOverlay(loaders[id])));

/** Downloads every retail overlay in the background (called when the Stock page opens). */
export const preloadCatalogOverlays = () => Object.values(loaders).forEach((load) => void load().catch(() => {}));

// Command bar (Ctrl/⌘ K). Hidden unless the shop has retail and the user has the required permission.
const retailOn = (user: any) => user?.plan?.features?.retail === true;
const can = (user: any, p: string) =>
  (user?.roles ?? []).some((r: string) => ["admin", "superadmin", "super_admin", "owner"].includes(String(r).toLowerCase())) ||
  (user?.permissions ?? []).includes(p);

registerCommand({
  id: "retail-stock",
  label: "retail.cmd.stock",
  keywords: ["stock", "items", "catalogue", "inventory", "retail", "ගබඩාව"],
  visible: (u) => retailOn(u) && can(u, "retail:view"),
  perform: ({ navigate }) => navigate({ to: "/stock" }),
});
registerCommand({
  id: "retail-stock-in",
  label: "retail.cmd.stockIn",
  shortcut: "stock-in",
  keywords: ["in", "receive", "delivery", "purchase", "supplier", "stock in", "තොග ලැබීම්"],
  visible: (u) => retailOn(u) && can(u, "retail:stock_receive"),
  perform: ({ openOverlay }) => openOverlay(STOCK_IN_OVERLAY_ID),
});
registerCommand({
  id: "retail-correct",
  label: "retail.cmd.correct",
  shortcut: "correct-stock",
  keywords: ["correct", "adjust", "damage", "lost", "write off", "වෙනස්"],
  visible: (u) => retailOn(u) && can(u, "retail:stock_adjust"),
  perform: ({ openOverlay }) => openOverlay(CORRECT_OVERLAY_ID),
});
registerCommand({
  id: "retail-count",
  label: "retail.cmd.count",
  keywords: ["count", "stocktake", "opening", "audit", "ගණන්"],
  visible: (u) => retailOn(u) && can(u, "retail:stock_adjust"),
  perform: ({ openOverlay }) => openOverlay(COUNT_OVERLAY_ID),
});
registerCommand({
  id: "retail-history",
  label: "retail.cmd.history",
  keywords: ["history", "movements", "documents", "ledger", "ඉතිහාසය"],
  visible: (u) => retailOn(u) && can(u, "retail:view"),
  perform: ({ openOverlay }) => openOverlay(HISTORY_OVERLAY_ID),
});
registerCommand({
  id: "retail-new-item",
  label: "retail.cmd.newItem",
  keywords: ["new", "add", "create", "item", "family"],
  visible: (u) => retailOn(u) && can(u, "retail:product_manage"),
  perform: ({ openOverlay }) => openOverlay(NEW_ITEM_OVERLAY_ID),
});
registerCommand({
  id: "retail-find-item",
  label: "retail.cmd.findItem",
  shortcut: "find-item",
  keywords: ["find", "search", "item", "scan", "barcode"],
  visible: (u) => retailOn(u) && can(u, "retail:view"),
  perform: ({ openOverlay }) => openOverlay(FINDER_OVERLAY_ID),
});
registerCommand({
  id: "retail-categories",
  label: "retail.cmd.categories",
  keywords: ["categories", "category", "sub-category", "icons"],
  visible: (u) => retailOn(u) && can(u, "retail:view"),
  perform: ({ openOverlay }) => openOverlay(CATEGORIES_OVERLAY_ID),
});
