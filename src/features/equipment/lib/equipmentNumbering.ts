// Automatic machine numbers (EQ-110) and names ("Drill with Hammer - 6"). The server has the final
// say when saving; these keep what the grid shows ahead of rows that aren't saved yet.

export const serialValue = (s: unknown): number | null => {
  const m = String(s ?? "").trim().match(/^EQ-(\d+)$/i);
  return m ? Number(m[1]) : null;
};
export const formatSerial = (n: number) => `EQ-${String(n).padStart(3, "0")}`;

export const stripNameNumber = (name: unknown) => String(name ?? "").replace(/\s*[-–]\s*\d+\s*$/, "").trim();
export const nameNumber = (name: unknown) => {
  const m = String(name ?? "").match(/[-–]\s*(\d+)\s*$/);
  return m ? Number(m[1]) : 0;
};
export const withNumber = (base: string, n: number) => (base ? `${base} - ${n}` : "");

/** The next free EQ number: after the server's next and after every number already in the grid. */
export const nextGridSerial = (serverNext: string | null | undefined, serials: unknown[]) => {
  const fromServer = serialValue(serverNext) ?? 1;
  const highest = serials.reduce<number>((max, s) => Math.max(max, serialValue(s) ?? 0), 0);
  return Math.max(fromServer, highest + 1);
};

/** The next number for a base name, after the server's next and after the same base in the grid. */
export const nextGridNameNumber = (base: string, serverNext: number | null | undefined, names: unknown[]) =>
  names.reduce<number>((max, n) => (stripNameNumber(n) === base ? Math.max(max, nameNumber(n) + 1) : max), serverNext || 1);

/**
 * Split text pasted from Excel: rows by line, cells by tab. Null when it is one plain value, so
 * normal pasting into a cell is left alone.
 */
export const parsePaste = (text: string): string[][] | null => {
  const clean = text.replace(/\r/g, "").replace(/\n$/, "");
  if (!clean.includes("\t") && !clean.includes("\n")) return null;
  return clean.split("\n").map((line) => line.split("\t").map((c) => c.trim()));
};
