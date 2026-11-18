export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 2000;

export type ImportParseErrorCode =
  | "file_too_large"
  | "unsupported_type"
  | "xls_binary_unsupported"
  | "too_many_rows"
  | "empty_file"
  | "corrupt_file";

export class ImportParseError extends Error {
  code: ImportParseErrorCode;
  meta?: Record<string, string | number>;

  constructor(code: ImportParseErrorCode, meta?: Record<string, string | number>) {
    super(code);
    this.name = "ImportParseError";
    this.code = code;
    this.meta = meta;
  }
}

export interface ParsedSheet {
  name: string;
  rows: string[][];
}

export interface ParsedWorkbook {
  fileName: string;
  fileType: "csv" | "xlsx";
  sheets: ParsedSheet[];
}

export interface SheetTable {
  headerRowIndex: number;
  headers: string[];
  dataRows: string[][];
  dataStartRowNumber: number; // 1-based line number of first data row in sheet
  sourceRowNumbers: number[]; // 1-based row number per row in dataRows
}

const formatUtcDate = (d: Date): string => {
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export const normalizeCell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return formatUtcDate(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value).replace(/\r\n/g, "\n");
};

const isBlankRow = (row: string[]): boolean => row.every((cell) => cell.trim() === "");

const trimTrailingEmptyRows = (rows: string[][]): string[][] => {
  let end = rows.length;
  while (end > 0 && isBlankRow(rows[end - 1])) end--;
  return rows.slice(0, end);
};

/** Guess which row contains column headings (prefers first row with >=2 filled cells in top 5 rows). */
export const detectHeaderRowIndex = (rows: string[][]): number => {
  const limit = Math.min(rows.length, 5);
  for (let i = 0; i < limit; i++) {
    const filled = rows[i].filter((c) => c.trim() !== "").length;
    if (filled >= 2) return i;
  }
  const firstNonEmpty = rows.findIndex((r) => !isBlankRow(r));
  return firstNonEmpty >= 0 ? firstNonEmpty : 0;
};

const countNonEmptyDataRows = (rows: string[][], headerRowIndex: number): number => {
  let count = 0;
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    if (!isBlankRow(rows[i])) count++;
  }
  return count;
};

/** Extract headers and raw data rows for a selected header row, enforcing MAX_IMPORT_ROWS. */
export const extractSheetTable = (sheet: ParsedSheet, headerRowIndex: number): SheetTable => {
  const rows = sheet.rows;
  if (!rows.length || headerRowIndex < 0 || headerRowIndex >= rows.length) {
    throw new ImportParseError("empty_file");
  }
  const rawHeaderRow = rows[headerRowIndex] ?? [];
  let maxCols = rawHeaderRow.length;
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    if (rows[i].length > maxCols) maxCols = rows[i].length;
  }
  // Drop trailing unnamed completely empty columns across the whole table
  while (maxCols > 0) {
    const colIdx = maxCols - 1;
    const anyFilled =
      (rawHeaderRow[colIdx] ?? "").trim() !== "" ||
      rows.slice(headerRowIndex + 1).some((r) => (r[colIdx] ?? "").trim() !== "");
    if (anyFilled) break;
    maxCols--;
  }

  const headers = Array.from({ length: maxCols }, (_, c) => (rawHeaderRow[c] ?? "").trim());
  const dataRows: string[][] = [];
  const sourceRowNumbers: number[] = [];

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = Array.from({ length: maxCols }, (_, c) => rows[i][c] ?? "");
    dataRows.push(row);
    sourceRowNumbers.push(i + 1);
  }

  const nonEmptyCount = dataRows.filter((r) => !isBlankRow(r)).length;
  if (nonEmptyCount > MAX_IMPORT_ROWS) {
    throw new ImportParseError("too_many_rows", { max: MAX_IMPORT_ROWS, count: nonEmptyCount });
  }

  return {
    headerRowIndex,
    headers,
    dataRows,
    dataStartRowNumber: headerRowIndex + 2,
    sourceRowNumbers,
  };
};

/** Parse CSV / TSV text cleanly using lazy-loaded PapaParse, preserving quotes and inch marks. */
export const parseCsvText = async (text: string, sheetName = "Sheet1"): Promise<ParsedSheet> => {
  const clean = text.replace(/^\uFEFF/, "");
  if (!clean.trim()) throw new ImportParseError("empty_file");

  const papaMod = await import("papaparse");
  const Papa = (papaMod as any).default ?? papaMod;

  const result = Papa.parse(clean, {
    delimitersToGuess: [",", ";", "\t"],
    skipEmptyLines: false,
  }) as {
    data?: unknown[][];
    errors?: { code?: string; type?: string; message?: string }[];
  };

  if (result.errors?.length) {
    const fatal = result.errors.find(
      (e) => e.code !== "UndetectableDelimiter" && e.code !== "TooFewFields" && e.code !== "TooManyFields",
    );
    if (fatal && !result.data?.length) {
      throw new ImportParseError("corrupt_file", { detail: fatal.message ?? "" });
    }
  }

  const rawRows: string[][] = trimTrailingEmptyRows(
    (result.data ?? []).map((row: unknown[]) => (Array.isArray(row) ? row.map(normalizeCell) : [])),
  );

  if (!rawRows.length || rawRows.every(isBlankRow)) {
    throw new ImportParseError("empty_file");
  }

  const headerIdx = detectHeaderRowIndex(rawRows);
  const nonEmptyDataCount = countNonEmptyDataRows(rawRows, headerIdx);
  if (nonEmptyDataCount > MAX_IMPORT_ROWS) {
    throw new ImportParseError("too_many_rows", { max: MAX_IMPORT_ROWS, count: nonEmptyDataCount });
  }

  return { name: sheetName, rows: rawRows };
};

/** Parse `.xlsx` workbook buffer/blob lazily via read-excel-file/universal. */
export const parseExcelInput = async (input: Blob | ArrayBuffer, fileName = "workbook.xlsx"): Promise<ParsedSheet[]> => {
  let rawSheets: { sheet: string; data: unknown[][] }[];
  try {
    const mod = await import("read-excel-file/universal");
    const readXlsxFile = mod.default;
    const buffer =
      input instanceof ArrayBuffer
        ? input
        : typeof input.arrayBuffer === "function"
          ? await input.arrayBuffer()
          : await new Response(input).arrayBuffer();
    rawSheets = await readXlsxFile(buffer);
  } catch (err: any) {
    const code = err?.code;
    if (code === "XLS_FILE_NOT_SUPPORTED" || /\.xls$/i.test(fileName)) {
      throw new ImportParseError("xls_binary_unsupported");
    }
    if (code === "NO_DATA") {
      throw new ImportParseError("empty_file");
    }
    throw new ImportParseError("corrupt_file", { detail: String(err?.message || "") });
  }

  const parsedSheets: ParsedSheet[] = [];
  for (const s of rawSheets ?? []) {
    const rows = trimTrailingEmptyRows((s.data ?? []).map((row) => (Array.isArray(row) ? row.map(normalizeCell) : [])));
    if (rows.length && !rows.every(isBlankRow)) {
      parsedSheets.push({ name: s.sheet || "Sheet1", rows });
    }
  }

  if (!parsedSheets.length) {
    throw new ImportParseError("empty_file");
  }

  const primary = parsedSheets.find((s) => s.name.trim().toLowerCase() === "equipment") ?? parsedSheets[0];
  const headerIdx = detectHeaderRowIndex(primary.rows);
  const nonEmptyDataCount = countNonEmptyDataRows(primary.rows, headerIdx);
  if (nonEmptyDataCount > MAX_IMPORT_ROWS) {
    throw new ImportParseError("too_many_rows", { max: MAX_IMPORT_ROWS, count: nonEmptyDataCount });
  }

  return parsedSheets;
};

/** Read and parse a dropped/selected File client-side before anything is sent to the backend. */
export const parseImportFile = async (file: File): Promise<ParsedWorkbook> => {
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    throw new ImportParseError("file_too_large");
  }

  const lower = file.name.toLowerCase();
  if (lower.endsWith(".csv") || lower.endsWith(".tsv") || lower.endsWith(".txt")) {
    const text = typeof file.text === "function" ? await file.text() : await new Response(file).text();
    const sheet = await parseCsvText(text, file.name);
    return { fileName: file.name, fileType: "csv", sheets: [sheet] };
  }

  if (lower.endsWith(".xlsx")) {
    const sheets = await parseExcelInput(file, file.name);
    return { fileName: file.name, fileType: "xlsx", sheets };
  }

  if (lower.endsWith(".xls")) {
    // Reject old binary .xls clearly (some Excel exports are actually XML saved as .xlsx; genuine .xls cannot be read in-browser).
    throw new ImportParseError("xls_binary_unsupported");
  }

  throw new ImportParseError("unsupported_type");
};
