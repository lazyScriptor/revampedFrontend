import { useCallback, useState } from "react";
import type { ElementType } from "react";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import MoreTimeIcon from "@mui/icons-material/MoreTime";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import TranslateOutlinedIcon from "@mui/icons-material/TranslateOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import BuildCircleOutlinedIcon from "@mui/icons-material/BuildCircleOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";

// The Equipment page's card view is configured like the table's Columns menu: every
// detail below can be switched on or off. The equipment number, photo, name, status
// and the edit/delete buttons are fixed and not in this list.
export type CardFieldKey =
  | "nameSi"
  | "category"
  | "location"
  | "type"
  | "dailyRate"
  | "extraRate"
  | "minDays"
  | "purchaseCost"
  | "totalQty"
  | "availableQty"
  | "rentedQty"
  | "defectiveQty"
  | "warranty"
  | "warrantyEnd"
  | "createdAt";

export type CardFieldGroup = "identity" | "pricing" | "stock" | "other";

export interface CardFieldDef {
  key: CardFieldKey;
  group: CardFieldGroup;
  /** i18n key of the label (settings list + tooltips) */
  labelKey: string;
  icon: ElementType;
  defaultOn: boolean;
}

export const CARD_FIELDS: CardFieldDef[] = [
  { key: "nameSi", group: "identity", labelKey: "equipment.equipmentNameSi", icon: TranslateOutlinedIcon, defaultOn: true },
  { key: "category", group: "identity", labelKey: "common.category", icon: CategoryOutlinedIcon, defaultOn: true },
  { key: "location", group: "identity", labelKey: "equipment.location", icon: PlaceOutlinedIcon, defaultOn: true },
  { key: "type", group: "identity", labelKey: "equipment.isBulkItem", icon: LayersOutlinedIcon, defaultOn: false },

  { key: "dailyRate", group: "pricing", labelKey: "equipment.dailyRate", icon: PaymentsOutlinedIcon, defaultOn: true },
  { key: "extraRate", group: "pricing", labelKey: "equipment.extraDailyRate", icon: MoreTimeIcon, defaultOn: false },
  { key: "minDays", group: "pricing", labelKey: "equipment.minRentalDays", icon: ScheduleOutlinedIcon, defaultOn: true },
  { key: "purchaseCost", group: "pricing", labelKey: "equipment.purchaseCost", icon: ShoppingBagOutlinedIcon, defaultOn: false },

  { key: "totalQty", group: "stock", labelKey: "equipment.totalOwned", icon: Inventory2OutlinedIcon, defaultOn: true },
  { key: "availableQty", group: "stock", labelKey: "equipment.availableQty", icon: CheckCircleOutlinedIcon, defaultOn: true },
  { key: "rentedQty", group: "stock", labelKey: "equipment.rentedQty", icon: LocalShippingOutlinedIcon, defaultOn: true },
  { key: "defectiveQty", group: "stock", labelKey: "equipment.defectiveQty", icon: BuildCircleOutlinedIcon, defaultOn: true },

  { key: "warranty", group: "other", labelKey: "equipment.warrantyMonths", icon: VerifiedUserOutlinedIcon, defaultOn: false },
  { key: "warrantyEnd", group: "other", labelKey: "equipment.endOfWarranty", icon: EventAvailableOutlinedIcon, defaultOn: false },
  { key: "createdAt", group: "other", labelKey: "common.createdAt", icon: CalendarMonthOutlinedIcon, defaultOn: false },
];

export const CARD_GROUP_LABEL_KEYS: Record<CardFieldGroup, string> = {
  identity: "equipment.cards.groupIdentity",
  pricing: "equipment.cards.groupPricing",
  stock: "equipment.cards.groupStock",
  other: "equipment.cards.groupOther",
};

export type CardConfig = Record<CardFieldKey, boolean>;

export const defaultCardConfig = (): CardConfig =>
  Object.fromEntries(CARD_FIELDS.map((f) => [f.key, f.defaultOn])) as CardConfig;

const CONFIG_KEY = "geargrid-equipment-card-fields";
const VIEW_KEY = "geargrid-equipment-view";

// Stored config is merged over the defaults so fields added in a later release get
// their default instead of "undefined → hidden".
export const readCardConfig = (): CardConfig => {
  const base = defaultCardConfig();
  try {
    const raw = window.localStorage.getItem(CONFIG_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    for (const f of CARD_FIELDS) if (typeof parsed?.[f.key] === "boolean") base[f.key] = parsed[f.key];
  } catch {
    /* private mode / corrupt value → defaults */
  }
  return base;
};

export const useEquipmentCardConfig = () => {
  const [config, setConfig] = useState<CardConfig>(readCardConfig);

  const persist = (next: CardConfig) => {
    setConfig(next);
    try {
      window.localStorage.setItem(CONFIG_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const toggle = useCallback(
    (key: CardFieldKey) => persist({ ...config, [key]: !config[key] }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config],
  );
  const reset = useCallback(() => persist(defaultCardConfig()), []);

  return { config, toggle, reset };
};

export type EquipmentView = "table" | "cards";

export const readEquipmentView = (): EquipmentView => {
  try {
    const v = window.localStorage.getItem(VIEW_KEY);
    if (v === "table" || v === "cards") return v;
  } catch {
    /* ignore */
  }
  // First visit: phones get cards (a wide table is miserable there), desktops keep the table.
  return typeof window !== "undefined" && window.matchMedia?.("(max-width: 599.95px)").matches ? "cards" : "table";
};

export const saveEquipmentView = (view: EquipmentView) => {
  try {
    window.localStorage.setItem(VIEW_KEY, view);
  } catch {
    /* ignore */
  }
};
