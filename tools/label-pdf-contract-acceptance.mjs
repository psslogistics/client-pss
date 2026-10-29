import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { composeAssetsToA4, printableAssetCount } from "../lib/label-pdf.ts";
import { labelFileName } from "../lib/label-contract.ts";

const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const providerPdf = await PDFDocument.create();
const providerPage = providerPdf.addPage([100, 50]);
providerPage.drawRectangle({ x: 5, y: 5, width: 90, height: 40 });
const providerPdfBase64 = Buffer.from(await providerPdf.save()).toString("base64");
const entries = [
  { value: png, contentType: "image/png" },
  { value: providerPdfBase64, contentType: "application/pdf" },
  { value: png, contentType: "image/png" },
];

const onePage = await PDFDocument.load(await composeAssetsToA4("4x2", entries));
assert.equal(await printableAssetCount(entries), 3, "mixed provider assets should count as three printable stickers");
assert.equal(onePage.getPageCount(), 1, "three provider assets should fit one 4x2 A4 sheet");
assert.ok(Math.abs(onePage.getPages()[0].getWidth() - 595.28) < 1, "label sheet width should be A4");
assert.ok(Math.abs(onePage.getPages()[0].getHeight() - 841.89) < 1, "label sheet height should be A4");

const eleven = await PDFDocument.load(await composeAssetsToA4("4x2", Array.from({ length: 11 }, () => ({ value: png, contentType: "image/png" }))));
assert.equal(eleven.getPageCount(), 2, "eleven 4x2 stickers should create two A4 pages");
assert.equal(labelFileName(" LR/321964753 ", "4x2.5"), "LR-321964753-LABEL-4x2.5.pdf", "label filename should sanitize the LR reference and preserve size");
assert.equal(labelFileName("321964753", "a4"), "321964753-LABEL-A4.pdf", "A4 label filename should use the exact requested format");

console.log("Label PDF artifact contract checks passed (8 checks).");
