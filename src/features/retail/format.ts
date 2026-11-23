/** "Rs 1,250" or "Rs 1,250.50": money in the shop's currency, for display next to tabular numerals. */
export const formatRs = (n: number | string | null | undefined): string => {
  if (n === null || n === undefined || n === "") return "";
  const v = Number(n);
  if (!Number.isFinite(v)) return "";
  return `Rs ${v.toLocaleString("en-LK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

/** Formats quantities cleanly (e.g. 15, 2.5, 0.125), trimming trailing decimal zeros. */
export const formatQty = (n: number | string | null | undefined, allowDecimal = true): string => {
  if (n === null || n === undefined || n === "") return "";
  const v = Number(n);
  if (!Number.isFinite(v)) return "";
  const rounded = allowDecimal ? Math.round(v * 1000) / 1000 : Math.round(v);
  return rounded.toLocaleString("en-LK", { minimumFractionDigits: 0, maximumFractionDigits: allowDecimal ? 3 : 0 });
};

/** Signed movement delta: "+15", "−3", "0". */
export const formatSignedQty = (n: number | string | null | undefined, allowDecimal = true): string => {
  if (n === null || n === undefined || n === "") return "";
  const v = Number(n);
  if (!Number.isFinite(v)) return "";
  if (v === 0) return "0";
  const abs = formatQty(Math.abs(v), allowDecimal);
  return v > 0 ? `+${abs}` : `−${abs}`;
};
