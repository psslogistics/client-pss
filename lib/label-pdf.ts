import { PDFDocument } from "pdf-lib";
import type { LabelSize } from "@/lib/label-contract";

export type ArtifactEntry = { value: string; contentType: string };
export type LabelLayout = { width: number; height: number; columns: number; rows: number; gap: number };

export const a4Points: [number, number] = [595.28, 841.89];
export const sheetLayouts: Record<LabelSize, LabelLayout> = {
  a4: { width: a4Points[0] - 12, height: a4Points[1] - 18, columns: 1, rows: 1, gap: 0 },
  "4x2": { width: 4 * 72, height: 2 * 72, columns: 2, rows: 5, gap: 0 },
  "4x2.5": { width: 4 * 72, height: 2.5 * 72, columns: 2, rows: 4, gap: 0 },
  "3x2": { width: 3 * 72, height: 2 * 72, columns: 2, rows: 5, gap: 0 },
};

export const pdfPageCount = (size: LabelSize, copies: number) => {
  const layout = sheetLayouts[size];
  return Math.ceil(copies / (layout.columns * layout.rows));
};

export const printableAssetCount = async (entries: ArtifactEntry[]) => {
  let count = 0;
  for (const entry of entries) {
    const bytes = Uint8Array.from(atob(entry.value.replace(/^data:[^;]+;base64,/, "")), (character) => character.charCodeAt(0));
    const entryType = entry.contentType.toLowerCase().split(";", 1)[0].trim();
    if (entryType === "application/pdf") count += (await PDFDocument.load(bytes)).getPageCount();
    else if (entryType === "image/png" || entryType === "image/jpeg") count += 1;
  }
  return count;
};

const sheetSlot = (size: LabelSize, index: number) => {
  const layout = sheetLayouts[size];
  const [pageWidth, pageHeight] = a4Points;
  const totalWidth = layout.columns * layout.width + (layout.columns - 1) * layout.gap;
  const totalHeight = layout.rows * layout.height + (layout.rows - 1) * layout.gap;
  const column = index % layout.columns;
  const row = Math.floor(index / layout.columns) % layout.rows;
  return {
    x: (pageWidth - totalWidth) / 2 + column * (layout.width + layout.gap),
    y: pageHeight - (pageHeight - totalHeight) / 2 - (row + 1) * layout.height - row * layout.gap,
    width: layout.width,
    height: layout.height,
  };
};

export const composeAssetsToA4 = async (size: LabelSize, entries: ArtifactEntry[]) => {
  const pdf = await PDFDocument.create();
  const layout = sheetLayouts[size];
  const capacity = layout.columns * layout.rows;
  const assets: Array<{ kind: "image"; image: Awaited<ReturnType<typeof pdf.embedPng>> | Awaited<ReturnType<typeof pdf.embedJpg>> } | { kind: "page"; page: Awaited<ReturnType<typeof pdf.embedPage>> }> = [];
  for (const entry of entries) {
    const bytes = Uint8Array.from(atob(entry.value.replace(/^data:[^;]+;base64,/, "")), (character) => character.charCodeAt(0));
    const entryType = entry.contentType.toLowerCase().split(";", 1)[0].trim();
    if (entryType === "image/png") assets.push({ kind: "image", image: await pdf.embedPng(bytes) });
    else if (entryType === "image/jpeg") assets.push({ kind: "image", image: await pdf.embedJpg(bytes) });
    else if (entryType === "application/pdf") {
      const source = await PDFDocument.load(bytes);
      for (const sourcePage of source.getPages()) assets.push({ kind: "page", page: await pdf.embedPage(sourcePage) });
    }
  }
  if (!assets.length) throw new Error("No printable label assets were returned.");
  let page = pdf.addPage(a4Points);
  for (const [index, asset] of assets.entries()) {
    const slot = sheetSlot(size, index);
    if (asset.kind === "image") {
      const scale = Math.min(slot.width / asset.image.width, slot.height / asset.image.height);
      const width = asset.image.width * scale;
      const height = asset.image.height * scale;
      page.drawImage(asset.image, { x: slot.x + (slot.width - width) / 2, y: slot.y + (slot.height - height) / 2, width, height });
    } else {
      const scale = Math.min(slot.width / asset.page.width, slot.height / asset.page.height);
      const width = asset.page.width * scale;
      const height = asset.page.height * scale;
      page.drawPage(asset.page, { x: slot.x + (slot.width - width) / 2, y: slot.y + (slot.height - height) / 2, width, height });
    }
    if ((index + 1) % capacity === 0 && index < assets.length - 1) page = pdf.addPage(a4Points);
  }
  return pdf.save({ useObjectStreams: false });
};
