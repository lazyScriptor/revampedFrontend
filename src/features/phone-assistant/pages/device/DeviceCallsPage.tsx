import { useEffect, useState } from "react";
import { Alert, Box, Chip, InputAdornment, Paper, TextField, Typography } from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { DeviceShell } from "../../components/DeviceShell";
import { MissedCallsAndFollowUpsPanel } from "../../components/MissedCallsAndFollowUpsPanel";
import { isNativePhoneApp, nativeBridge, type NativeCustomerHit } from "../../lib/nativeBridge";
import { useOnline } from "../../lib/phoneAppState";
import { usePullToRefresh } from "../../lib/usePullToRefresh";

/** Phone contacts are only ever found by a phone number with at least this many typed digits. */
// FUTURE (super admin setting): mirrors MIN_CONTACT_SEARCH_DIGITS on the server; see docs/FUTURE_SETTINGS.md.
export const MIN_CONTACT_SEARCH_DIGITS = 9;

/** Offline customer lookup over the phone's local cache. */
export function OfflineCustomerSearch() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<NativeCustomerHit[]>([]);
  const [cached, setCached] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const native = isNativePhoneApp();
  const trimmed = query.trim();
  const digits = trimmed.replace(/\D/g, "").length;

  useEffect(() => {
    if (!native || trimmed.length < 2) {
      setHits([]);
      return;
    }
    let alive = true;
    setLoading(true);
    const id = window.setTimeout(async () => {
      const res = await nativeBridge.searchCustomers(trimmed, 15);
      if (!alive) return;
      setHits(res?.hits ?? []);
      setCached(res?.cachedBriefs ?? null);
      setLoading(false);
    }, 150);
    return () => {
      alive = false;
      window.clearTimeout(id);
    };
  }, [trimmed, native]);

  const looksLikeNumber = /^[+\d\s()-]+$/.test(trimmed);

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
      <Typography sx={{ fontWeight: 800, mb: 1 }}>{t("phoneShell.search.title")}</Typography>
      <TextField
        fullWidth
        size="small"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("phoneShell.search.placeholder")}
        slotProps={{
          input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> },
          htmlInput: { "aria-label": t("phoneShell.search.title"), "data-no-sinhala": "true", style: { minHeight: 28 } },
        }}
      />
      {!native && <Alert severity="info" sx={{ mt: 1.5 }}>{t("phoneShell.search.appOnly")}</Alert>}
      {native && cached !== null && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75, fontVariantNumeric: "tabular-nums" }}>
          {t("phoneShell.search.cached", { count: cached })}
        </Typography>
      )}
      {native && trimmed.length >= 2 && !loading && hits.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          {looksLikeNumber && digits < MIN_CONTACT_SEARCH_DIGITS
            ? t("phoneShell.search.noneNumber", { digits: MIN_CONTACT_SEARCH_DIGITS })
            : t("phoneShell.search.none")}
        </Typography>
      )}
      <Box sx={{ mt: 1, display: "flex", flexDirection: "column" }}>
        {hits.map((h) => (
          <Box key={`${h.kind}-${h.id}`} sx={{ py: 1.25, borderTop: 1, borderColor: "divider", minHeight: 56 }} data-testid={`hit-${h.kind}-${h.id}`}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Typography sx={{ fontWeight: 700 }}>{h.name}</Typography>
              {h.kind === "contact" && <Chip size="small" label={t("phoneShell.search.contact")} />}
              {h.status === "Blacklisted" && <Chip size="small" color="error" label={t("phoneShell.search.blacklisted")} />}
              {h.rating ? (
                <Box sx={{ display: "inline-flex", alignItems: "center", color: "warning.main", fontVariantNumeric: "tabular-nums" }}>
                  <StarRoundedIcon fontSize="small" /> {h.rating}
                </Box>
              ) : null}
            </Box>
            {h.company && <Typography variant="body2" color="text.secondary">{h.company}</Typography>}
            {h.phone && <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>{h.phone}</Typography>}
            {h.summary && <Typography variant="caption" color="text.secondary">{h.summary}</Typography>}
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

export function DeviceCallsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const online = useOnline();
  const { pull, refreshing } = usePullToRefresh(() => queryClient.invalidateQueries());
  return (
    <DeviceShell active="calls" title={t("phoneShell.tab_calls")}>
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        {(pull > 0 || refreshing) && (
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
            {refreshing ? t("phoneShell.refreshing") : t("phoneShell.pullToRefresh")}
          </Typography>
        )}
        <OfflineCustomerSearch />
        {online ? (
          <MissedCallsAndFollowUpsPanel mode="device" />
        ) : (
          <Alert severity="info">{t("phoneShell.calls.offlineLists")}</Alert>
        )}
      </Box>
    </DeviceShell>
  );
}
