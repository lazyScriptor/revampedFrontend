import { Button, Chip, Tooltip } from "@mui/material";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { formatCombo, useShortcut } from "@/components/command/shortcuts";
import { useRetailEnabled } from "../useRetailEnabled";
import { useRetailPermissions } from "../catalog/useRetailCatalog";
import { useRetailSettings } from "../hooks/useRetailSettings";
import { fetchWalkInCustomer } from "../api/pos.api";

export const WALK_IN_KEY = ["retail", "walk-in"] as const;

interface WalkInButtonProps {
  onSelectCustomer: (customer: any) => void;
  selectedCustomerId?: number | null;
}

function PosWalkInButtonInner({ onSelectCustomer, selectedCustomerId }: WalkInButtonProps) {
  const { t } = useTranslation();
  const { canSell } = useRetailPermissions();
  const q = useQuery({
    queryKey: WALK_IN_KEY,
    queryFn: fetchWalkInCustomer,
    enabled: canSell,
    staleTime: Infinity,
  });

  const pickWalkIn = async () => {
    const cust = q.data ?? (await q.refetch()).data;
    if (cust) onSelectCustomer(cust);
  };

  useShortcut("walk-in", () => void pickWalkIn(), canSell);

  if (!canSell) return null;
  const active = Boolean(q.data && selectedCustomerId === q.data.customer_id);

  return (
    <Tooltip title={`${t("retail.pos.walkIn")} (${formatCombo("F8")})`}>
      <Button
        variant={active ? "contained" : "outlined"}
        size="small"
        startIcon={<StorefrontOutlinedIcon fontSize="small" />}
        onClick={() => void pickWalkIn()}
        data-testid="walk-in-btn"
        sx={{
          minHeight: 40,
          flexShrink: 0,
          textTransform: "none",
          fontWeight: 700,
          borderRadius: 2,
          whiteSpace: "nowrap",
        }}
      >
        {t("retail.pos.walkIn")}
      </Button>
    </Tooltip>
  );
}

/** Mounted inside PosCustomerPanel only when retail is active (no QueryClient assumed otherwise). */
export function PosWalkInButton(props: WalkInButtonProps) {
  const retail = useRetailEnabled();
  if (!retail) return null;
  return <PosWalkInButtonInner {...props} />;
}

/** Contractor / Trade / Walk-in chip on the selected customer card when retail is enabled. */
export function CustomerPriceLevelChip({ customer }: { customer: any | null | undefined }) {
  const { t } = useTranslation();
  const retail = useRetailEnabled();
  const { settings } = useRetailSettings();
  if (!retail || !customer) return null;

  if (customer.is_walk_in) {
    return (
      <Chip
        size="small"
        color="default"
        label={t("retail.pos.walkIn")}
        data-testid="walk-in-chip"
        sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700 }}
      />
    );
  }

  const level = String(customer.price_level || "").toLowerCase();
  if ((level === "contractor" || level === "trade") && (settings.showContractorPrice ?? true)) {
    return (
      <Chip
        size="small"
        color="warning"
        label={level === "trade" ? t("retail.pos.tradePrice") : t("retail.pos.contractorPrice")}
        data-testid="price-level-chip"
        sx={{ height: 20, fontSize: "0.68rem", fontWeight: 800 }}
      />
    );
  }
  return null;
}
