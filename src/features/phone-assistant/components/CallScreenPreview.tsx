import { Box, Typography } from "@mui/material";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded";
import ReportProblemRoundedIcon from "@mui/icons-material/ReportProblemRounded";
import { useTranslation } from "react-i18next";
import {
  CALL_TOKENS,
  SAMPLE_BRIEFS,
  evaluateRules,
  renderRows,
  type AmountMode,
  type CallScreenDesign,
  type SampleKind,
} from "../lib/callScreenLayout";

export type PreviewFooter = "live" | "synced" | "offline";

interface Props {
  design: CallScreenDesign;
  sample: SampleKind;
  /** "light" / "dark" resolves "auto" in the preview. */
  appearance: "light" | "dark";
  locked: boolean;
  phoneSize: "small" | "large";
  amounts: AmountMode;
  textScale: number;
  footer: PreviewFooter;
  shopName?: string;
}

/**
 * React twin of the Android renderer. Every size, gap and colour comes from callScreenTokens.json
 * (the same file the app bundles), and text colour is always derived from the surface colour.
 */
export function CallScreenPreview({ design, sample, appearance, locked, phoneSize, amounts, textScale, footer, shopName }: Props) {
  const { t } = useTranslation();
  const brief = SAMPLE_BRIEFS[sample];
  const mode = design.theme.mode === "auto" ? appearance : design.theme.mode;
  const palette = CALL_TOKENS.palettes[mode];
  const size = CALL_TOKENS.sizes[design.size];
  const rules = evaluateRules(design, brief);
  const accentKey = rules.accent ?? (design.theme.accent === "brand" ? "brand" : "neutral");
  const accent = CALL_TOKENS.accents[accentKey as keyof typeof CALL_TOKENS.accents];
  // Text on an accent fill is picked for contrast: dark on amber, light on red / slate.
  const onAccent = accentKey === "brand" || accentKey === "warning" ? "#0F172A" : "#F8FAFC";
  const rows = renderRows(design, brief, amounts, locked ? design.locked.mode : undefined);
  const phoneWidth = phoneSize === "small" ? 300 : 380;
  const phoneHeight = phoneSize === "small" ? 560 : 680;
  const collapsedRows = design.behaviour.collapsed_rows ?? CALL_TOKENS.layout.defaultCollapsedRows;
  const px = (sp: number) => Math.round(sp * textScale * 10) / 10;

  // The card may use at most maxCardHeightPercent of the screen; lower rows then collapse.
  const estimateRowHeight = (r: (typeof rows)[number]) => {
    const spBase = CALL_TOKENS.sizes[design.size][CALL_TOKENS.styles[r.style].size as keyof typeof size] as number;
    const lines = r.items ? r.items.length : 1;
    return px(spBase) * 1.35 * lines + size.rowGapDp;
  };
  const budget = (phoneHeight * CALL_TOKENS.layout.maxCardHeightPercent) / 100 - 90;
  let used = 0;
  let fit = 0;
  for (const r of rows) {
    used += estimateRowHeight(r);
    if (used > budget) break;
    fit += 1;
  }
  const capped = fit < rows.length;
  const visibleRows = capped ? rows.slice(0, Math.max(1, Math.min(fit, rows.length))) : rows;
  const hiddenCount = rows.length - visibleRows.length;
  const shownRows = design.behaviour.tap_to_expand && rows.length > collapsedRows && !capped ? rows : visibleRows;

  const footerText =
    footer === "live"
      ? t("phoneAssistant.callScreen.footer.live")
      : footer === "synced"
        ? t("phoneAssistant.callScreen.footer.synced", { minutes: 12 })
        : t("phoneAssistant.callScreen.footer.offline", { time: "14:05, 12 Nov" });
  const footerColour = footer === "offline" ? (mode === "dark" ? CALL_TOKENS.footer.warningTextDark : CALL_TOKENS.footer.warningText) : palette.muted;

  const justify = design.shape.position === "top" ? "flex-start" : design.shape.position === "middle" ? "center" : "flex-end";
  const margin = design.shape.width === "inset" ? CALL_TOKENS.layout.insetMarginDp : 0;

  return (
    <Box
      data-testid="call-screen-preview"
      sx={{
        width: phoneWidth,
        maxWidth: "100%",
        height: phoneHeight,
        borderRadius: "28px",
        border: "8px solid",
        borderColor: "text.primary",
        bgcolor: "#0B1220",
        position: "relative",
        overflow: "hidden",
        mx: "auto",
        display: "flex",
        flexDirection: "column",
        justifyContent: justify,
        pt: design.theme.status_bar ? 3 : 1,
        pb: 2,
      }}
    >
      {design.theme.status_bar && (
        <Box sx={{ position: "absolute", top: 4, left: 14, right: 14, display: "flex", justifyContent: "space-between", color: "#CBD5E1", fontSize: 11, fontVariantNumeric: "tabular-nums" }}>
          <span>{locked ? "🔒" : ""} 14:05</span>
          <span>▮▮▮ 78%</span>
        </Box>
      )}
      <Box
        sx={{
          mx: `${margin}px`,
          bgcolor: palette.surface,
          color: palette.text,
          border: `1px solid ${palette.border}`,
          borderLeft: `5px solid ${accent}`,
          borderRadius: `${design.shape.width === "full" ? 0 : design.shape.corner_radius}px`,
          opacity: design.shape.opacity,
          boxShadow: design.shape.elevation ? "0 8px 24px rgba(0,0,0,0.35)" : "none",
          px: `${CALL_TOKENS.layout.horizontalPaddingDp}px`,
          py: `${CALL_TOKENS.layout.verticalPaddingDp}px`,
          display: "flex",
          flexDirection: "column",
          gap: `${size.rowGapDp}px`,
        }}
      >
        {(design.header.show_logo || design.header.show_shop_name) && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: palette.muted, fontSize: px(size.captionSp) }}>
            {design.header.show_logo && <Box sx={{ width: 16, height: 16, borderRadius: 0.5, bgcolor: accent }} />}
            {design.header.show_shop_name && <span>{shopName || "GearGrid"}</span>}
          </Box>
        )}
        {rules.banner && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              px: 1,
              py: 0.5,
              borderRadius: 1,
              bgcolor: accent,
              color: onAccent,
              fontWeight: 700,
              fontSize: px(size.captionSp),
            }}
          >
            <ReportProblemRoundedIcon sx={{ fontSize: px(size.captionSp) + 4 }} />
            {brief.blacklisted ? t("phoneAssistant.callScreen.sample.blacklistedBanner") : t("phoneAssistant.callScreen.sample.attention")}
          </Box>
        )}
        {shownRows.map((r) => {
          const style = CALL_TOKENS.styles[r.style];
          const fontSize = px(size[style.size as keyof typeof size] as number);
          const text = String(r.text.key ? t(r.text.key, r.text.values as any) : r.text.plain ?? "");
          const labelNode = r.label ? (
            <Box component="span" sx={{ color: palette.muted, fontWeight: 400, mr: 0.75 }}>
              {t(`phoneAssistant.callScreen.fields.${r.field}`)}:
            </Box>
          ) : null;
          if (r.style === "stars" && r.stars !== undefined) {
            return (
              <Box key={r.key} sx={{ display: "flex", alignItems: "center", gap: 0.25, color: accent }} aria-label={String(text)}>
                {[1, 2, 3, 4, 5].map((i) =>
                  i <= (r.stars ?? 0) ? (
                    <StarRoundedIcon key={i} sx={{ fontSize }} />
                  ) : (
                    <StarBorderRoundedIcon key={i} sx={{ fontSize }} />
                  ),
                )}
              </Box>
            );
          }
          if (r.items) {
            return (
              <Box key={r.key} sx={{ fontSize, lineHeight: 1.35 }}>
                {labelNode}
                {r.items.map((it) => (
                  <Box key={it} sx={{ fontVariantNumeric: "tabular-nums" }}>
                    • {it}
                  </Box>
                ))}
              </Box>
            );
          }
          if (r.style === "chip") {
            return (
              <Box key={r.key}>
                <Box
                  component="span"
                  sx={{ display: "inline-block", px: 1, py: 0.25, borderRadius: 99, bgcolor: accent, color: onAccent, fontSize, fontWeight: 700 }}
                >
                  {text}
                </Box>
              </Box>
            );
          }
          return (
            <Typography
              key={r.key}
              component="div"
              sx={{
                fontSize,
                lineHeight: 1.3,
                fontWeight: style.bold ? 700 : 400,
                color: "muted" in style && style.muted ? palette.muted : palette.text,
                fontVariantNumeric: "tabular-nums",
                overflowWrap: "anywhere",
              }}
            >
              {labelNode}
              {text}
            </Typography>
          );
        })}
        {hiddenCount > 0 && (
          <Typography sx={{ fontSize: px(size.captionSp), color: palette.muted }}>
            {t("phoneAssistant.callScreen.moreRows", { count: hiddenCount })}
          </Typography>
        )}
        {design.actions.length > 0 && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, pt: 0.5 }}>
            {design.actions.map((a) => (
              <Box
                key={a}
                sx={{
                  px: 1.25,
                  py: 0.5,
                  borderRadius: 1.5,
                  border: `1px solid ${palette.border}`,
                  fontSize: px(size.captionSp),
                  fontWeight: 700,
                  color: palette.text,
                }}
              >
                {t(`phoneAssistant.callScreen.actions.${a}`)}
              </Box>
            ))}
          </Box>
        )}
        <Box sx={{ fontSize: px(size.captionSp) * CALL_TOKENS.layout.footerSizeFactor, color: footerColour, fontVariantNumeric: "tabular-nums" }}>
          {footerText}
        </Box>
      </Box>
    </Box>
  );
}
