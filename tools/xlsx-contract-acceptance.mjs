import assert from "node:assert/strict";
import { unzipSync } from "fflate";
import { buildWorkbook } from "../lib/xlsx.ts";

const bytes = buildWorkbook([{ name: "Shipments", headers: ["Reference", "Amount", "Date"], rows: [["LR-1", 1250, "2026-10-28"]], columnWidths: [24, 16, 18], freezeRows: 1, autoFilter: true, currencyColumns: [1], dateColumns: [2] }]);
assert.equal(bytes[0], 0x50, "XLSX must be a ZIP container");
const files = unzipSync(bytes);
const sheet = new TextDecoder().decode(files["xl/worksheets/sheet1.xml"]);
const styles = new TextDecoder().decode(files["xl/styles.xml"]);
assert.match(sheet, /state="frozen"/);
assert.match(sheet, /autoFilter ref="A1:C2"/);
assert.match(sheet, /<v>1250<\/v>/);
assert.match(styles, /₹/);
console.log("XLSX artifact contract checks passed (5 checks).");
