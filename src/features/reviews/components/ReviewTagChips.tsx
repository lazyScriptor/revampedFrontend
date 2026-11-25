import { Box, Chip, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useActivitySettings } from "@/features/activity/hooks/useActivityHooks";
import { DEFAULT_REVIEW_TAGS } from "@/features/activity/constants";
import type { ReviewTagOption } from "@/features/activity/types";

interface ReviewTagChipsProps {
  selectedKeys: string[];
  onToggleTag: (tag: ReviewTagOption, label: string, willSelect: boolean) => void;
}

export function appendTagLabelToComment(currentComment: string, label: string, willSelect: boolean): string {
  const parts = currentComment
    .split("·")
    .map((s) => s.trim())
    .filter(Boolean);
  if (willSelect) {
    if (!parts.includes(label)) parts.push(label);
  } else {
    const idx = parts.indexOf(label);
    if (idx !== -1) parts.splice(idx, 1);
  }
  return parts.join(" · ");
}

export function ReviewTagChips({ selectedKeys, onToggleTag }: ReviewTagChipsProps) {
  const { t, i18n } = useTranslation();
  const { data: settings } = useActivitySettings();
  const isSi = i18n.language?.startsWith("si");

  const positive = (settings?.review_tags?.positive ?? DEFAULT_REVIEW_TAGS.positive).filter(
    (x) => x.active !== false,
  );
  const negative = (settings?.review_tags?.negative ?? DEFAULT_REVIEW_TAGS.negative).filter(
    (x) => x.active !== false,
  );

  const renderGroup = (items: ReviewTagOption[], tone: "positive" | "negative") => (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
      {items.map((item) => {
        const selected = selectedKeys.includes(item.key);
        const label = isSi && item.label_si ? item.label_si : item.label_en;
        const activeBg = tone === "positive" ? "#10b981" : "#ef4444";
        return (
          <Chip
            key={item.key}
            size="small"
            clickable
            label={label}
            aria-pressed={selected}
            onClick={() => onToggleTag(item, label, !selected)}
            sx={{
              fontWeight: selected ? 800 : 600,
              bgcolor: selected ? activeBg : undefined,
              color: selected ? "#ffffff" : undefined,
              borderColor: selected ? activeBg : tone === "positive" ? "#86efac" : "#fca5a5",
              "&:hover": selected ? { bgcolor: activeBg } : undefined,
            }}
            variant={selected ? "filled" : "outlined"}
          />
        );
      })}
    </Box>
  );

  return (
    <Box data-testid="review-tag-chips" sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
        {t("reviews.tagsLabel")}
      </Typography>
      {renderGroup(positive, "positive")}
      {renderGroup(negative, "negative")}
    </Box>
  );
}
