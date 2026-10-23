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

const EXAMPLES: Array<[string, string]> = [
  ["mama", "මම"],
  ["amma", "අම්ම"],
  ["thaaththaa", "තාත්තා"],
  ["oyaata", "ඔයාට"],
  ["shrii", "ශ්‍රී"],
  ["laxkaa", "ලංකා"],
];

const Key = ({ roman, sinhala }: { roman: string; sinhala: string }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 1,
      px: 1,
      py: 0.4,
      borderRadius: 1,
      bgcolor: "rgba(255,255,255,0.08)",
      fontVariantNumeric: "tabular-nums",
    }}
  >
    <Box component="span" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", color: "#fbbf24", fontWeight: 700 }}>
      {roman}
    </Box>
    <Box component="span" sx={{ fontSize: "0.95rem", color: "#f8fafc", fontWeight: 600 }}>
      {sinhala}
    </Box>
  </Box>
);

const Section = ({ title, children, cols = 4 }: { title: string; children: React.ReactNode; cols?: number }) => (
  <Box sx={{ mb: 1.25 }}>
    <Typography sx={{ color: "#94a3b8", fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", mb: 0.5 }}>
      {title}
    </Typography>
    <Box sx={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 0.5 }}>{children}</Box>
  </Box>
);

/** Full typing chart shown when hovering / focusing / long-pressing the language button. */
function TypingChart({ on }: { on: boolean }) {
  const { t } = useTranslation();
  // De-duplicate vowels that share a sign (ii/ee, uu/oo): show the letter once with its sign.
  const vowels = VOWELS.filter(([roman]) => roman !== "A");
  return (
    <Box sx={{ width: { xs: 300, sm: 460 }, maxHeight: "70vh", overflowY: "auto", p: 0.5 }}>
      <Typography sx={{ color: "#f8fafc", fontWeight: 800, fontSize: "0.9rem" }}>
        {t(on ? "sinhalaTyping.titleOn" : "sinhalaTyping.titleOff")}
      </Typography>
      <Typography sx={{ color: "#cbd5e1", fontSize: "0.76rem", mb: 1.25 }}>{t("sinhalaTyping.howTo")}</Typography>

      <Section title={t("sinhalaTyping.examples")} cols={3}>
        {EXAMPLES.map(([r, s]) => (
          <Key key={r} roman={r} sinhala={s} />
        ))}
      </Section>
      <Section title={t("sinhalaTyping.vowels")}>
        {vowels.map(([roman, letter, sign]) => (
          <Key key={roman} roman={roman} sinhala={sign ? `${letter} ${sign}` : `${letter}  –`} />
        ))}
      </Section>
      <Section title={t("sinhalaTyping.consonants")}>
        {CONSONANTS.map(([roman, letter]) => (
          <Key key={roman} roman={roman} sinhala={letter} />
        ))}
      </Section>
      <Section title={t("sinhalaTyping.special")} cols={3}>
        <Key roman="x" sinhala="ං" />
        <Key roman="H" sinhala="ඃ" />
        <Key roman="kra / dya" sinhala="ක්‍ර ද්‍ය" />
      </Section>
      <Typography sx={{ color: "#94a3b8", fontSize: "0.7rem" }}>{t("sinhalaTyping.skipNote")}</Typography>
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
        tooltip: { sx: { bgcolor: "#0f172a", border: "1px solid #334155", maxWidth: "none", p: 1.5, borderRadius: 2, boxShadow: "0 12px 32px rgba(0,0,0,0.35)" } },
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
