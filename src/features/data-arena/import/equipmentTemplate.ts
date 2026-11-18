import { downloadEquipmentExcelTemplate } from "@/features/equipment/api/equipment.api";

const CSV_HEADERS = [
  "Name",
  "Name (Sinhala)",
  "EQ No.",
  "Category",
  "Location",
  "Base price",
  "Extra/day",
  "Min days",
  "Qty",
  "Total",
  "Cost",
  "Warr. mo",
  "Warranty end",
];

const csvCell = (val: unknown): string => {
  const s = String(val ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const buildEquipmentCsvTemplate = (opts?: { category?: string; warehouse?: string }): string => {
  const cat = opts?.category?.trim() || "Power Tools";
  const wh = opts?.warehouse?.trim() || "Main Store";
  const rows = [
    CSV_HEADERS,
    ["Bosch Hammer Drill", "", "", cat, wh, "1500", "1500", "1", "No", "1", "45000", "12", "2027-01-15"],
    ["Scaffolding Frame 5ft", "", "", cat, wh, "450", "450", "2", "Yes", "25", "18000", "", ""],
  ];
  return `\uFEFF${rows.map((r) => r.map(csvCell).join(",")).join("\n")}\n`;
};

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const downloadCsvTemplateFile = (opts?: { category?: string; warehouse?: string }) => {
  const csv = buildEquipmentCsvTemplate(opts);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerBlobDownload(blob, "geargrid-equipment-template.csv");
};

export const downloadXlsxTemplateFile = async () => {
  const blob = await downloadEquipmentExcelTemplate();
  triggerBlobDownload(blob, "geargrid-equipment-template.xlsx");
};
