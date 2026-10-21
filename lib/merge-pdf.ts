import { PDFDocument } from "pdf-lib";

const decodeBase64 = (value: string) => {
  const normalized = value.includes(",") ? value.slice(value.indexOf(",") + 1) : value;
  return Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0));
};

/** Merge provider PDF copies without rasterizing their pages or changing their resolution. */
export async function mergeProviderPdfs(base64Values: string[]) {
  const merged = await PDFDocument.create();
  for (const value of base64Values) {
    const source = await PDFDocument.load(decodeBase64(value));
    const pages = await merged.copyPages(source, source.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }
  return merged.save({ useObjectStreams: false });
}
