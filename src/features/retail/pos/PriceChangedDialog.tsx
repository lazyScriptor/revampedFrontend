import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import { useTranslation } from "react-i18next";
import type { PriceChangeItem } from "../api/pos.api";

interface Props {
  open: boolean;
  changes: PriceChangeItem[];
  onClose: () => void;
  onConfirm: () => void;
  submitting?: boolean;
}

export function PriceChangedDialog({ open, changes, onClose, onConfirm, submitting }: Props) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}>
        <WarningAmberOutlinedIcon color="warning" />
        {t("retail.pos.priceChangedTitle")}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {t("retail.pos.priceChangedBody")}
        </Typography>
        <List dense sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, p: 0 }}>
          {changes.map((c, idx) => (
            <ListItem key={`${c.product_id}-${c.unit_id ?? "base"}-${idx}`} divider={idx < changes.length - 1}>
              <ListItemText
                primary={c.description || `#${c.product_id}`}
                secondary={`Rs ${c.from.toLocaleString()} → Rs ${c.to.toLocaleString()}`}
                slotProps={{
                  primary: { sx: { fontWeight: 700 } },
                  secondary: { sx: { fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums", fontWeight: 700, color: "warning.dark" } },
                }}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={submitting}>
          {t("retail.pos.reviewCart")}
        </Button>
        <Button variant="contained" disableElevation onClick={onConfirm} disabled={submitting} sx={{ fontWeight: 800 }}>
          {t("retail.pos.confirmAndSell")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
