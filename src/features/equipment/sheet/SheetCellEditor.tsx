import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Box, Paper, Popper, Typography } from "@mui/material";

import type { Column, Lookups, SheetRow } from "./sheetModel";

export type EditorMove = "down" | "up" | "right" | "left" | "none";

interface Props {
  column: Column;
  value: string;
  /** Replaces the value: blank when typing started the edit, so the key itself goes in. */
  initial?: string;
  lookups: Lookups;
  /** New rows list saved machines to follow. */
  suggestions?: SheetRow[];
  onPickMachine?: (row: SheetRow) => void;
  onCommit: (value: string, move: EditorMove, fillSelection: boolean) => void;
  onCancel: () => void;
}

const baseStyle = { width: "100%", height: "100%", border: 0, outline: 0, padding: "0 5px", font: "inherit", color: "inherit", background: "transparent", boxSizing: "border-box" } as const;

/** The one live input in the sheet: every other cell is plain text, which keeps a big sheet fast. */
export function SheetCellEditor({ column, value, initial, lookups, suggestions, onPickMachine, onCommit, onCancel }: Props) {
  const [text, setText] = useState(initial ?? value);
  const [highlight, setHighlight] = useState(-1);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);
  const finished = useRef(false);

  const isSelect = column.kind === "category" || column.kind === "warehouse";
  const numeric = column.kind === "money" || column.kind === "int";

  // Before the browser delivers the key that opened this cell, so the key lands in the input.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    if (el instanceof HTMLInputElement && initial === undefined && el.type === "text") el.select();
    if (el instanceof HTMLSelectElement) {
      try {
        el.showPicker?.();
      } catch {
        /* the list still opens with a click or the arrow keys */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const matches = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!suggestions || q.length < 2) return [];
    return suggestions
      .filter((r) => r.values.equipment_name.toLowerCase().includes(q))
      .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))
      .slice(0, 12);
  }, [suggestions, text]);

  const commit = (next: string, move: EditorMove, fill = false) => {
    if (finished.current) return;
    finished.current = true;
    onCommit(next, move, fill);
  };
  const pick = (row: SheetRow) => {
    if (finished.current) return;
    finished.current = true;
    onPickMachine?.(row);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    e.stopPropagation();
    if (matches.length && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      setHighlight((h) => (e.key === "ArrowDown" ? Math.min(matches.length - 1, h + 1) : Math.max(-1, h - 1)));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (highlight >= 0 && matches[highlight]) pick(matches[highlight]);
      else commit(text, e.shiftKey ? "up" : "down", e.ctrlKey || e.metaKey);
    } else if (e.key === "Tab") {
      e.preventDefault();
      commit(text, e.shiftKey ? "left" : "right");
    } else if (e.key === "Escape") {
      e.preventDefault();
      finished.current = true;
      onCancel();
    } else if (!isSelect && (e.key === "ArrowUp" || e.key === "ArrowDown") && initial !== undefined) {
      // Started by typing, as in a spreadsheet: the arrows move on.
      e.preventDefault();
      commit(text, e.key === "ArrowUp" ? "up" : "down");
    }
  };

  if (isSelect) {
    const options =
      column.kind === "category"
        ? lookups.categories.map((c) => ({ id: String(c.category_id), name: c.category_name }))
        : lookups.warehouses.map((w) => ({ id: String(w.warehouse_id), name: w.location_name }));
    return (
      <select
        ref={(el) => {
          inputRef.current = el;
        }}
        aria-label={column.key}
        value={text}
        style={baseStyle}
        onChange={(e) => commit(e.target.value, "none")}
        onBlur={() => commit(text, "none")}
        onKeyDown={onKeyDown}
      >
        <option value="" />
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    );
  }

  return (
    <>
      <input
        ref={(el) => {
          inputRef.current = el;
        }}
        aria-label={column.key}
        type={column.kind === "date" ? "date" : "text"}
        data-no-sinhala={column.kind !== "text" || column.key === "serial_number" ? "" : undefined}
        inputMode={numeric ? "decimal" : undefined}
        value={text}
        style={{ ...baseStyle, textAlign: numeric ? "right" : "left", fontVariantNumeric: numeric ? "tabular-nums" : undefined }}
        onChange={(e) => {
          setText(e.target.value);
          setHighlight(-1);
        }}
        onBlur={() => commit(text, "none")}
        onKeyDown={onKeyDown}
      />
      {matches.length > 0 && inputRef.current && (
        <Popper open anchorEl={inputRef.current} placement="bottom-start" sx={{ zIndex: 1400 }}>
          <Paper elevation={6} role="listbox" sx={{ mt: 0.25, minWidth: 280, maxHeight: 280, overflowY: "auto", borderRadius: 1.5 }}>
            {matches.map((r, i) => (
              <Box
                key={r.key}
                role="option"
                aria-selected={i === highlight}
                // Before the input's blur, which would otherwise commit the half-typed text.
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(r);
                }}
                onMouseEnter={() => setHighlight(i)}
                sx={{ px: 1, py: 0.4, cursor: "pointer", bgcolor: i === highlight ? "action.selected" : "transparent" }}
              >
                <Typography sx={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3 }}>{r.values.equipment_name}</Typography>
                <Typography color="text.secondary" sx={{ fontSize: 11, lineHeight: 1.3, fontVariantNumeric: "tabular-nums" }}>
                  {[r.values.equipment_name_si, r.values.serial_number].filter(Boolean).join(" · ")}
                </Typography>
              </Box>
            ))}
          </Paper>
        </Popper>
      )}
    </>
  );
}
