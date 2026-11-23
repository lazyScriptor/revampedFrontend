import { useTranslation } from "react-i18next";
import { Overlay, useOverlay, type OverlayComponentProps } from "@/components/overlay";
import type { CatalogProduct, CatalogUnit } from "../api/catalog.types";
import { ITEM_CARD_OVERLAY_ID } from "../catalog/overlayIds";
import { ItemFinder } from "./ItemFinder";

interface Props extends OverlayComponentProps {
  /** A barcode that was scanned on the page behind: resolve it straight away. */
  initialScan?: string;
  initialQuery?: string;
  warehouseId?: number | null;
  /** What to do with the chosen item. Default: open its item card. */
  onPick?: (product: CatalogProduct, unit?: CatalogUnit | null) => void;
}

/** The finder as an overlay (F3 or Ctrl/⌘ K, anywhere in a retail shop). Choosing an item opens its card. */
function FinderOverlay({ initialScan, initialQuery, warehouseId, onPick }: Props) {
  const { t } = useTranslation();
  const overlay = useOverlay();
  const pick = async (product: CatalogProduct, unit?: CatalogUnit | null) => {
    if (onPick) {
      await overlay.close();
      onPick(product, unit);
      return;
    }
    await overlay.close();
    overlay.open(ITEM_CARD_OVERLAY_ID, { productId: product.product_id, warehouseId });
  };
  return (
    <Overlay title={t("retail.finder.title")} width={560}>
      <ItemFinder mode="browse" allowCreate initialScan={initialScan} initialQuery={initialQuery} warehouseId={warehouseId} onPick={pick} />
    </Overlay>
  );
}

export default FinderOverlay;
