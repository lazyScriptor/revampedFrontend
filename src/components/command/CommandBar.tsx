import { useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Box, InputAdornment, List, ListItemButton, ListItemIcon, ListItemText, TextField, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Overlay, registerOverlay, useOverlay } from "@/components/overlay";
import { useAuthStore } from "@/stores/useAuthStore";
import { planAllows } from "@/features/plan/usePlan";
import { listCommands, runProviders, type CommandContext } from "./commandRegistry";
import { SHORTCUT_DEFS, formatCombo } from "./shortcuts";
import { useUiPreference } from "@/features/preferences/useUiPreference";
import "./defaultCommands";
import "./ShortcutsOverlay";

export const COMMAND_BAR_ID = "command-bar";

interface Row {
  id: string;
  title: string;
  hint?: string;
  perform: (ctx: CommandContext) => unknown;
}

function CommandBarOverlay() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const overlay = useOverlay();
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { value: overrides } = useUiPreference<Record<string, string>>("shortcuts", {});
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement | null>(null);

  const rows = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    const dynamic: Row[] = runProviders(query).map((d) => ({
      id: d.id,
      title: t(d.labelKey, d.values),
      perform: d.perform,
    }));
    const visible = listCommands()
      .filter((c) => (!c.permission || hasPermission(c.permission)) && (!c.feature || planAllows(user?.plan ?? null, c.feature)) && (!c.visible || c.visible(user)))
      .map<Row & { hay: string }>((c) => {
        const title = t(c.label);
        const def = c.shortcut ? SHORTCUT_DEFS.find((d) => d.id === c.shortcut) : undefined;
        const combo = def ? overrides[def.id] || def.defaultCombo : undefined;
        return { id: c.id, title, hint: combo ? formatCombo(combo) : undefined, perform: c.perform, hay: `${title} ${(c.keywords ?? []).join(" ")}`.toLowerCase() };
      })
      .filter((r) => words.every((w) => r.hay.includes(w)))
      .sort((a, b) => a.title.localeCompare(b.title));
    return [...dynamic, ...visible];
  }, [query, t, user, hasPermission, overrides]);

  const run = async (row: Row | undefined) => {
    if (!row) return;
    // Wait for the overlay's history entry to go before navigating, so Back keeps working.
    await overlay.closeAll();
    await row.perform({ navigate: navigate as unknown as CommandContext["navigate"], openOverlay: overlay.open });
  };

  const current = Math.min(active, Math.max(0, rows.length - 1));

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = (current + (e.key === "ArrowDown" ? 1 : -1) + rows.length) % Math.max(1, rows.length);
      setActive(next);
      listRef.current?.children[next]?.scrollIntoView?.({ block: "nearest" });
    }
  };

  return (
    <Overlay title={t("command.title")} width={520} onConfirm={() => void run(rows[current])}>
      <Box onKeyDown={onKeyDown}>
        <TextField
          autoFocus
          fullWidth
          size="small"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          placeholder={t("command.placeholder")}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
            htmlInput: { "aria-label": t("command.placeholder"), "aria-autocomplete": "list", "aria-controls": "command-list" },
          }}
        />
        <List id="command-list" ref={listRef} dense role="listbox" sx={{ mt: 1 }}>
          {rows.map((row, i) => (
            <ListItemButton
              key={row.id}
              role="option"
              aria-selected={i === current}
              selected={i === current}
              onMouseMove={() => setActive(i)}
              onClick={() => void run(row)}
              sx={{ borderRadius: 1, minHeight: 40 }}
            >
              <ListItemIcon sx={{ minWidth: 28 }}>
                <KeyboardArrowRightIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={row.title} />
              {row.hint && (
                <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums", ml: 1 }}>
                  {row.hint}
                </Typography>
              )}
            </ListItemButton>
          ))}
          {rows.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
              {t("command.empty")}
            </Typography>
          )}
        </List>
      </Box>
    </Overlay>
  );
}

registerOverlay(COMMAND_BAR_ID, CommandBarOverlay);
