import { describe, expect, it } from "vitest";
import {
  ImportParseError,
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_ROWS,
  detectHeaderRowIndex,
  extractSheetTable,
  parseCsvText,
  parseExcelInput,
  parseImportFile,
} from "../parseFile";

/** Build a tiny valid uncompressed (STORED method 0) ZIP archive for testing real `.xlsx` parsing. */
function buildZip(entries: { name: string; data: string }[]): Uint8Array {
  const enc = new TextEncoder();
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[i] = c >>> 0;
  }
  const crc32 = (bytes: Uint8Array) => {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };

  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = enc.encode(entry.name);
    const dataBytes = enc.encode(entry.data);
    const crc = crc32(dataBytes);

    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true); // stored
    lv.setUint32(14, crc, true);
    lv.setUint32(18, dataBytes.length, true);
    lv.setUint32(22, dataBytes.length, true);
    lv.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);

    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, dataBytes.length, true);
    cv.setUint32(24, dataBytes.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    central.set(nameBytes, 46);

    localParts.push(local, dataBytes);
    centralParts.push(central);
    offset += local.length + dataBytes.length;
  }

  const centralSize = centralParts.reduce((s, p) => s + p.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  const totalLen = offset + centralSize + eocd.length;
  const out = new Uint8Array(totalLen);
  let pos = 0;
  for (const p of [...localParts, ...centralParts, eocd]) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
}

function makeSampleWorkbook(): ArrayBuffer {
  const excelDateSerial = Math.round((Date.UTC(2025, 2, 14) - Date.UTC(1899, 11, 30)) / 86400000);
  const bytes = buildZip([
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`,
    },
    {
      name: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Equipment" sheetId="1" r:id="rId1"/>
    <sheet name="Backup Sheet" sheetId="2" r:id="rId2"/>
  </sheets>
</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    {
      name: "xl/styles.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cellXfs count="2">
    <xf numFmtId="0"/>
    <xf numFmtId="14" applyNumberFormat="1"/>
  </cellXfs>
</styleSheet>`,
    },
    {
      name: "xl/worksheets/sheet1.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="inlineStr"><is><t>Name</t></is></c>
      <c r="B1" t="inlineStr"><is><t>Base price</t></is></c>
      <c r="C1" t="inlineStr"><is><t>Warranty end</t></is></c>
    </row>
    <row r="2">
      <c r="A2" t="inlineStr"><is><t>Bosch Drill</t></is></c>
      <c r="B2"><v>1500</v></c>
      <c r="C2" s="1"><v>${excelDateSerial}</v></c>
    </row>
  </sheetData>
</worksheet>`,
    },
    {
      name: "xl/worksheets/sheet2.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="inlineStr"><is><t>Name</t></is></c>
      <c r="B1" t="inlineStr"><is><t>Base price</t></is></c>
    </row>
    <row r="2">
      <c r="A2" t="inlineStr"><is><t>Spare Pump</t></is></c>
      <c r="B2"><v>2500</v></c>
    </row>
  </sheetData>
</worksheet>`,
    },
  ]);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

describe("parseFile", () => {
  it("strips UTF-8 BOM and parses quoted multi-line notes and 4.5 inch marks in CSV", async () => {
    const csv = `\uFEFFName,Category,Base price\n"Angle Grinder 4.5""",Power Tools,"Rs. 1,500"\n"Heavy\nHammer",Concrete,2200`;
    const sheet = await parseCsvText(csv);
    expect(sheet.rows).toHaveLength(3);
    expect(sheet.rows[0]).toEqual(["Name", "Category", "Base price"]);
    expect(sheet.rows[1][0]).toBe('Angle Grinder 4.5"');
    expect(sheet.rows[1][2]).toBe("Rs. 1,500");
    expect(sheet.rows[2][0]).toBe("Heavy\nHammer");
  });

  it("supports semicolon and tab separated files", async () => {
    const semi = await parseCsvText("Name;Category;Rate\nCut Saw;Saws;900");
    expect(semi.rows[1]).toEqual(["Cut Saw", "Saws", "900"]);

    const tsv = await parseCsvText("Name\tCategory\tRate\nPlate Compactor\tConcrete\t3000");
    expect(tsv.rows[1]).toEqual(["Plate Compactor", "Concrete", "3000"]);
  });

  it("skips a single title row when detecting header index", () => {
    const idx = detectHeaderRowIndex([
      ["Inventory List 2026", "", ""],
      ["Name", "Category", "Base price"],
      ["Drill", "Tools", "1000"],
    ]);
    expect(idx).toBe(1);
  });

  it("rejects files over 5 MB", async () => {
    const bigFile = new File(["x"], "big.csv", { type: "text/csv" });
    Object.defineProperty(bigFile, "size", { value: MAX_IMPORT_FILE_BYTES + 1 });
    await expect(parseImportFile(bigFile)).rejects.toMatchObject({ code: "file_too_large" });
  });

  it("rejects legacy binary .xls clearly", async () => {
    const oldXls = new File([new Uint8Array([0xd0, 0xcf, 0x11, 0xe0])], "legacy.xls");
    await expect(parseImportFile(oldXls)).rejects.toMatchObject({ code: "xls_binary_unsupported" });
  });

  it("accepts 2000 rows and rejects 2001 rows", async () => {
    const rows2000 = ["Name,Category,Base price", ...Array.from({ length: MAX_IMPORT_ROWS }, (_, i) => `Drill ${i + 1},Tools,500`)].join("\n");
    const okSheet = await parseCsvText(rows2000);
    const table = extractSheetTable(okSheet, 0);
    expect(table.dataRows).toHaveLength(MAX_IMPORT_ROWS);

    const rows2001 = ["Name,Category,Base price", ...Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => `Drill ${i + 1},Tools,500`)].join("\n");
    let caught: unknown;
    try {
      await parseCsvText(rows2001);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ImportParseError);
    expect((caught as ImportParseError).code).toBe("too_many_rows");
  });

  it("parses multi-sheet .xlsx workbooks and formats Excel dates to YYYY-MM-DD", async () => {
    const buf = makeSampleWorkbook();
    const sheets = await parseExcelInput(buf, "sample.xlsx");
    expect(sheets).toHaveLength(2);
    expect(sheets[0].name).toBe("Equipment");
    expect(sheets[0].rows[0]).toEqual(["Name", "Base price", "Warranty end"]);
    expect(sheets[0].rows[1]).toEqual(["Bosch Drill", "1500", "2025-03-14"]);
    expect(sheets[1].name).toBe("Backup Sheet");
    expect(sheets[1].rows[1]).toEqual(["Spare Pump", "2500"]);
  });
});
