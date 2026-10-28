const escapeXml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

const crc32 = (bytes: Uint8Array) => {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

export const columnName = (index: number) => {
  let result = "";
  let value = index + 1;
  while (value) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
};

const zipStore = (files: { name: string; content: string }[]) => {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const p16 = (view: DataView, index: number, value: number) => view.setUint16(index, value, true);
  const p32 = (view: DataView, index: number, value: number) => view.setUint32(index, value, true);

  files.forEach(({ name, content }) => {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(content);
    const local = new Uint8Array(30 + nameBytes.length + data.length);
    const localView = new DataView(local.buffer);
    p32(localView, 0, 0x04034b50); p16(localView, 4, 20); p32(localView, 14, crc32(data));
    p32(localView, 18, data.length); p32(localView, 22, data.length); p16(localView, 26, nameBytes.length);
    local.set(nameBytes, 30); local.set(data, 30 + nameBytes.length); parts.push(local);

    const directory = new Uint8Array(46 + nameBytes.length);
    const directoryView = new DataView(directory.buffer);
    p32(directoryView, 0, 0x02014b50); p16(directoryView, 4, 20); p16(directoryView, 6, 20);
    p32(directoryView, 16, crc32(data)); p32(directoryView, 20, data.length); p32(directoryView, 24, data.length);
    p16(directoryView, 28, nameBytes.length); p32(directoryView, 42, offset);
    directory.set(nameBytes, 46); central.push(directory); offset += local.length;
  });

  const centralSize = central.reduce((sum, item) => sum + item.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  p32(endView, 0, 0x06054b50); p16(endView, 8, files.length); p16(endView, 10, files.length);
  p32(endView, 12, centralSize); p32(endView, 16, offset);
  const result = new Uint8Array(offset + centralSize + end.length);
  let cursor = 0;
  [...parts, ...central, end].forEach((part) => { result.set(part, cursor); cursor += part.length; });
  return result;
};

export type WorkbookCell = string | number | boolean | null;
export type WorkbookSheet = {
  name: string;
  headers: string[];
  rows: WorkbookCell[][];
  columnWidths?: number[];
  freezeRows?: number;
  autoFilter?: boolean;
  numericColumns?: number[];
  dateColumns?: number[];
  currencyColumns?: number[];
};

const excelDate = (value: string) => {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  return (time - Date.UTC(1899, 11, 30)) / 86400000;
};

const stylesXml = `<?xml version="1.0" encoding="UTF-8"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="5"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/><numFmt numFmtId="165" formatCode="yyyy-mm-dd hh:mm"/><numFmt numFmtId="166" formatCode="#,##0"/><numFmt numFmtId="167" formatCode="#,##0.00"/><numFmt numFmtId="168" formatCode="&quot;₹&quot;#,##0.00"/></numFmts>
  <fonts count="3"><font><sz val="10"/><name val="Aptos"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="Aptos"/></font><font><b/><sz val="10"/><name val="Aptos"/></font></fonts>
  <fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1D4ED8"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="2"><border/><border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="166" fontId="0" fillId="0" borderId="0"/><xf numFmtId="167" fontId="0" fillId="0" borderId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0"/><xf numFmtId="168" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0"/></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

export function buildWorkbook(sheets: WorkbookSheet[]) {
  const sheetXml = (sheet: WorkbookSheet) => {
    const widthXml = sheet.columnWidths?.length ? `<cols>${sheet.columnWidths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("")}</cols>` : "";
    const freezeRows = sheet.freezeRows ?? 1;
    const viewXml = freezeRows > 0 ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${freezeRows}" topLeftCell="A${freezeRows + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${freezeRows + 1}" sqref="A${freezeRows + 1}"/></sheetView></sheetViews>` : "<sheetViews><sheetView workbookViewId=\"0\"/></sheetViews>";
    const totalRows = sheet.rows.length + 1;
    const lastColumn = columnName(Math.max(0, sheet.headers.length - 1));
    const row = (values: WorkbookCell[], rowNumber: number, header = false) => {
      const cells = values.map((value, index) => {
        if (value == null || value === "") return "";
        const column = columnName(index);
        if (header) return `<c r="${column}${rowNumber}" s="1" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
        const isDate = sheet.dateColumns?.includes(index);
        const isCurrency = sheet.currencyColumns?.includes(index);
        const isNumeric = sheet.numericColumns?.includes(index) || isCurrency || isDate;
        const parsedDate = isDate && typeof value === "string" ? excelDate(value) : null;
        const numericValue = parsedDate ?? (isNumeric ? Number(value) : null);
        if (isNumeric && numericValue !== null && Number.isFinite(numericValue)) {
          const style = isCurrency ? 5 : isDate ? 4 : Number.isInteger(numericValue) ? 2 : 3;
          return `<c r="${column}${rowNumber}" s="${style}"><v>${numericValue}</v></c>`;
        }
        if (typeof value === "boolean") return `<c r="${column}${rowNumber}" t="b"><v>${value ? 1 : 0}</v></c>`;
        return `<c r="${column}${rowNumber}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
      }).join("");
      return `<row r="${rowNumber}"${header ? " ht=\"30\" customHeight=\"1\"" : ""}>${cells}</row>`;
    };
    const rows = `${row(sheet.headers, 1, true)}${sheet.rows.map((values, index) => row(values, index + 2)).join("")}`;
    const filter = sheet.autoFilter === false ? "" : `<autoFilter ref="A1:${lastColumn}${totalRows}"/>`;
    return `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>${viewXml}${widthXml}<sheetData>${rows}</sheetData>${filter}<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/></worksheet>`;
  };
  const files = [
    { name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>` },
    { name: "_rels/.rels", content: `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", content: `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((sheet, index) => `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("")}</sheets><calcPr fullCalcOnLoad="1"/></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", content: `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: "xl/styles.xml", content: stylesXml },
    ...sheets.map((sheet, index) => ({ name: `xl/worksheets/sheet${index + 1}.xml`, content: sheetXml(sheet) })),
  ];
  return zipStore(files);
}

export function downloadWorkbook(filename: string, sheets: WorkbookSheet[]) {
  const url = URL.createObjectURL(new Blob([buildWorkbook(sheets)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}
