import { useEffect, useSyncExternalStore } from "react";
import { Box, ButtonBase, Tooltip, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import {
  installSinhalaTyping,
  isSinhalaTypingEnabled,
  setSinhalaTyping,
  subscribeSinhalaTyping,
} from "@/lib/singlishInput";
import { CONSONANTS, VOWELS } from "@/lib/singlish";

const Key = ({ roman, sinhala }: { roman: string; sinhala: string }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 0.5,
      px: 0.75,
      py: 0.25,
      borderRadius: 1,
      bgcolor: "rgba(255,255,255,0.08)",
      fontVariantNumeric: "tabular-nums",
    }}
  >
    <Box component="span" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem", color: "#fbbf24", fontWeight: 700 }}>
      {roman}
    </Box>
    <Box component="span" sx={{ fontSize: "0.88rem", color: "#f8fafc", fontWeight: 600 }}>
      {sinhala}
    </Box>
  </Box>
);

const Section = ({ title, children, cols = { xs: 4, sm: 4 } }: { title: string; children: React.ReactNode; cols?: Record<string, number> | number }) => (
  <Box sx={{ mb: 0.9 }}>
    <Typography sx={{ color: "#94a3b8", fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", mb: 0.5 }}>
      {title}
    </Typography>
    <Box sx={{ display: "grid", gridTemplateColumns: typeof cols === "number" ? `repeat(${cols}, minmax(0, 1fr))` : Object.fromEntries(Object.entries(cols).map(([k, n]) => [k, `repeat(${n}, minmax(0, 1fr))`])), gap: 0.4 }}>{children}</Box>
  </Box>
);

/** Full typing chart shown when hovering / focusing / long-pressing the language button. */
function TypingChart({ on }: { on: boolean }) {
  const { t } = useTranslation();
  // De-duplicate vowels that share a sign (ii/ee, uu/oo): show the letter once with its sign.
  const vowels = VOWELS.filter(([roman]) => roman !== "A");
  return (
    <Box sx={{ width: { xs: "min(92vw, 340px)", sm: 520 }, p: 0.25 }}>
      <Typography sx={{ color: "#f8fafc", fontWeight: 800, fontSize: "0.88rem", lineHeight: 1.3 }}>
        {t(on ? "sinhalaTyping.titleOn" : "sinhalaTyping.titleOff")}
      </Typography>
      <Typography sx={{ color: "#cbd5e1", fontSize: "0.72rem", lineHeight: 1.35, mb: 1 }}>{t("sinhalaTyping.howTo")}</Typography>

      <Section title={t("sinhalaTyping.vowels")}>
        {vowels.map(([roman, letter, sign]) => (
          <Key key={roman} roman={roman} sinhala={sign ? `${letter} ${sign}` : `${letter}  –`} />
        ))}
      </Section>
      <Section title={t("sinhalaTyping.consonants")} cols={{ xs: 5, sm: 6 }}>
        {CONSONANTS.map(([roman, letter]) => (
          <Key key={roman} roman={roman} sinhala={letter} />
        ))}
      </Section>
      <Section title={t("sinhalaTyping.special")} cols={{ xs: 2, sm: 3 }}>
        <Key roman="x" sinhala="ං" />
        <Key roman="H" sinhala="ඃ" />
        <Key roman="kra / dya" sinhala="ක්‍ර ද්‍ය" />
      </Section>
      <Typography sx={{ color: "#94a3b8", fontSize: "0.66rem", lineHeight: 1.3 }}>{t("sinhalaTyping.skipNote")}</Typography>
    </Box>
  );
}

/** Top-bar switch for phonetic Sinhala typing (Singlish). Ctrl+Alt+S toggles it too. */
export function SinhalaTypingToggle() {
  const { t } = useTranslation();
  useEffect(() => installSinhalaTyping(), []);
  const on = useSyncExternalStore(subscribeSinhalaTyping, isSinhalaTypingEnabled, () => false);

  return (
    <Tooltip
      title={<TypingChart on={on} />}
      arrow
      placement="bottom-end"
      enterDelay={150}
      enterTouchDelay={400}
      leaveTouchDelay={8000}
      slotProps={{
        tooltip: { sx: { bgcolor: "#0f172a", border: "1px solid #334155", maxWidth: "none", p: 1.25, borderRadius: 2, boxShadow: "0 12px 32px rgba(0,0,0,0.35)" } },
        arrow: { sx: { color: "#0f172a" } },
        popper: { modifiers: [{ name: "offset", options: { offset: [0, 6] } }] },
      }}
    >
      <ButtonBase
        onClick={() => setSinhalaTyping(!on)}
        aria-pressed={on}
        aria-label={t("sinhalaTyping.label")}
        sx={{
          minWidth: 44,
          height: 32,
          px: 1.25,
          borderRadius: 2,
          border: "1px solid",
          borderColor: on ? "#f59e0b" : "#cbd5e1",
          bgcolor: on ? "#fef3c7" : "transparent",
          "&:focus-visible": { outline: "3px solid #f59e0b88", outlineOffset: 2 },
        }}
      >
        <Typography sx={{ fontWeight: 800, fontSize: "0.82rem", color: on ? "#92400e" : "#475569" }}>
          {on ? "සිං" : "EN"}
        </Typography>
      </ButtonBase>
    </Tooltip>
  );
}
