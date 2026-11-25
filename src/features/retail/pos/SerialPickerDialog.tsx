import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { fetchSerials } from "../api/stock.api";

interface Props {
  open: boolean;
  productId: number | null;
  productName: string;
  neededCount: number;
  selected: string[];
  onClose: () => void;
  onSave: (serials: string[]) => void;
}

export function SerialPickerDialog({ open, productId, productName, neededCount, selected, onClose, onSave }: Props) {
  const { t } = useTranslation();
  const [picked, setPicked] = useState<string[]>(selected);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (open) {
      setPicked(selected);
      setFilter("");
    }
  }, [open, selected]);

  const { data: serials = [], isLoading, isError } = useQuery({
    queryKey: ["retail", "serials", "in_stock", productId],
    queryFn: () => fetchSerials({ product_id: productId!, status: "in_stock" }),
    enabled: open && productId != null,
  });

  const required = Math.max(1, Math.round(neededCount));
  const toggle = (sn: string) => {
    setPicked((cur) => {
      if (cur.includes(sn)) return cur.filter((x) => x !== sn);
      if (cur.length >= required) return [...cur.slice(1), sn];
      return [...cur, sn];
    });
  };

  const q = filter.trim().toLowerCase();
  const visible = serials.filter((s) => !q || s.serial_no.toLowerCase().includes(q));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        {t("retail.pos.pickSerialsTitle")}
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontVariantNumeric: "tabular-nums" }}>
          {productName} · {picked.length} / {required}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: "8px !important" }}>
        <TextField
          size="small"
          fullWidth
          placeholder={t("retail.pos.filterSerialPlaceholder")}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        {isLoading ? (
          <Box sx={{ textAlign: "center", py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : isError ? (
          <Alert severity="error">{t("desk.loadFailed")}</Alert>
        ) : visible.length === 0 ? (
          <Alert severity="warning">{t("retail.pos.noSerialsInStock")}</Alert>
        ) : (
          <List dense sx={{ maxHeight: 240, overflowY: "auto", border: 1, borderColor: "divider", borderRadius: 1.5, p: 0 }}>
            {visible.map((s) => {
              const on = picked.includes(s.serial_no);
              return (
                <ListItemButton key={s.serial_no} onClick={() => toggle(s.serial_no)}>
                  <Checkbox edge="start" size="small" checked={on} tabIndex={-1} />
                  <ListItemText
                    primary={s.serial_no}
                    secondary={s.location_name || undefined}
                    slotProps={{
                      primary: {
                        sx: { fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontVariantNumeric: "tabular-nums" },
                      },
                    }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          {t("common.cancel")}
        </Button>
        <Button
          variant="contained"
          disableElevation
          disabled={picked.length !== required}
          onClick={() => {
            onSave(picked);
            onClose();
          }}
          sx={{ fontWeight: 800 }}
        >
          {t("common.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
