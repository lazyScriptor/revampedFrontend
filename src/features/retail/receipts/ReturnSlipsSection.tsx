import { useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import AssignmentReturnOutlinedIcon from "@mui/icons-material/AssignmentReturnOutlined";
import { useTranslation } from "react-i18next";
import { useInvoiceDetails } from "@/features/invoices/hooks/useInvoiceHooks";
import { useRetailEnabled } from "../useRetailEnabled";
import { formatRs } from "../format";
import { useSaleReturns } from "../returns/useSaleReturns";
import { ReturnSlipDialog } from "./ReturnSlipDialog";
import type { SaleReturnRow } from "./receiptModel";

const NUM = { fontVariantNumeric: "tabular-nums" } as const;

function SlipLauncher({ invoiceId, ret, onClose }: { invoiceId: number; ret: SaleReturnRow; onClose: () => void }) {
  const detail = useInvoiceDetails(invoiceId);
  if (!detail.data) return null;
  return <ReturnSlipDialog open onClose={onClose} invoice={detail.data} ret={ret} />;
}

/** "Print return slip" for each return of sold items on a bill. Shows nothing when the bill has none. */
export function ReturnSlipsSection({ invoiceId, active }: { invoiceId: number; active: boolean }) {
  const { t } = useTranslation();
  const retail = useRetailEnabled();
  const { data: returns = [] } = useSaleReturns(invoiceId, active && retail);
  const [selected, setSelected] = useState<SaleReturnRow | null>(null);
  if (!retail || returns.length === 0) return null;
  return (
    <Box data-testid="return-slips" sx={{ mb: 2, p: 1.5, borderRadius: 2, border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
      <Typography variant="caption" sx={{ fontWeight: 800, color: "#475569", display: "block", mb: 0.75 }}>
        {t("retail.receipts.returnSlips")}
      </Typography>
      <Stack spacing={0.75}>
        {returns.map((r) => (
          <Box key={r.return_id} sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography variant="body2" sx={{ flex: 1, minWidth: 140, color: "#0f172a", fontWeight: 600, ...NUM }}>
              {r.returned_at ? new Date(r.returned_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""} · {formatRs(r.value)}
            </Typography>
            <Button size="small" variant="outlined" startIcon={<AssignmentReturnOutlinedIcon />} onClick={() => setSelected(r)} sx={{ textTransform: "none", fontWeight: 700, minHeight: 36 }}>
              {t("retail.receipts.printReturnSlip")}
            </Button>
          </Box>
        ))}
      </Stack>
      {selected && <SlipLauncher invoiceId={invoiceId} ret={selected} onClose={() => setSelected(null)} />}
    </Box>
  );
}
