"use client";

import { Download, Loader2, Tag } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { getPssErrorDetails, pssApi } from "@/lib/pss-api";

const sizes = ["a4", "4x2", "4x2.5", "3x2"] as const;
type LabelSize = (typeof sizes)[number];
type LabelOption = { size: LabelSize; contentType: string; artifact: unknown; copies: number };
type ArtifactEntry = { value: string; contentType: string };
const sizeLabels: Record<LabelSize, string> = { a4: "A4", "4x2": "4 × 2 in", "4x2.5": "4 × 2.5 in", "3x2": "3 × 2 in" };

const isPdfBase64 = (value: string) => {
  const normalized = value.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
  return normalized.startsWith("JVBERi0"); // %PDF-
};

const isPdfArtifact = (value: unknown) => {
  const contentType = artifactContentType(value).toLowerCase().split(";", 1)[0].trim();
  const values = artifactBase64s(value);
  return contentType === "application/pdf" && values.length > 0 && values.every(isPdfBase64);
};

const isImageArtifact = (value: unknown) => {
  const contentType = artifactContentType(value).toLowerCase().split(";", 1)[0].trim();
  return (contentType === "image/png" || contentType === "image/jpeg") && artifactBase64s(value).length > 0;
};

const artifactBase64s = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(artifactBase64s);
  if (typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const direct = ["content_base64", "base64", "data"].flatMap((key) => typeof record[key] === "string" ? [record[key]] : []);
  return direct.length ? direct : Object.values(record).flatMap(artifactBase64s);
};

// Delhivery's get_urls response can contain both raster box labels and a
// provider-generated PDF/MPS document. Preserve the MIME type attached to
// each individual asset; using the root type for every nested asset makes
// pdf-lib try to decode a PDF as PNG (and fail with a generic UI error).
const artifactEntries = (value: unknown, inheritedType = "application/octet-stream"): ArtifactEntry[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap((item) => artifactEntries(item, inheritedType));
  if (typeof value !== "object") return [];
  const item = value as Record<string, unknown>;
  const contentType = artifactContentType(value) === "application/octet-stream" ? inheritedType : artifactContentType(value);
  const direct = ["content_base64", "base64", "data"].flatMap((key) => typeof item[key] === "string" ? [{ value: item[key] as string, contentType }] : []);
  if (direct.length) return direct;
  return Object.values(item).flatMap((child) => artifactEntries(child, contentType));
};

const artifactContentType = (value: unknown): string => {
  if (!value || typeof value !== "object") return "application/octet-stream";
  const record = value as Record<string, unknown>;
  for (const key of ["content_type", "contentType", "mime_type", "mimeType"]) {
    if (typeof record[key] === "string" && record[key]) return record[key];
  }
  return Object.values(record).map(artifactContentType).find((type) => type !== "application/octet-stream") ?? "application/octet-stream";
};

const pdfPageCount = (option: LabelOption) => option.size === "a4" ? Math.ceil(option.copies / 2) : option.copies;

const saveBase64 = (name: string, value: string, contentType: string) => {
  const normalized = value.replace(/^data:[^;]+;base64,/, "");
  const bytes = Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: contentType }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
};

const physicalSizePoints: Record<LabelSize, [number, number]> = {
  a4: [8.3 * 72, 11.7 * 72],
  "4x2": [4 * 72, 2 * 72],
  "4x2.5": [4 * 72, 2.5 * 72],
  "3x2": [3 * 72, 2 * 72],
};

const imageToPdf = async (reference: string, option: LabelOption, entries: ArtifactEntry[]) => {
  const pdf = await PDFDocument.create();
  const [pageWidth, pageHeight] = physicalSizePoints[option.size];
  const isA4 = option.size === "a4";
  const pageMargin = isA4 ? 6 : 0;
  const slotGap = isA4 ? 6 : 0;
  const slotHeight = isA4 ? (pageHeight - (pageMargin * 2) - slotGap) / 2 : pageHeight;
  let page = pdf.addPage([pageWidth, pageHeight]);
  for (const [index, entry] of entries.entries()) {
    const bytes = Uint8Array.from(atob(entry.value.replace(/^data:[^;]+;base64,/, "")), (character) => character.charCodeAt(0));
    const entryType = entry.contentType.toLowerCase().split(";", 1)[0].trim();
    const image = entryType === "image/png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    const slotWidth = pageWidth - (pageMargin * 2);
    const scale = Math.min(slotWidth / image.width, slotHeight / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    const slotTop = pageHeight - pageMargin - (isA4 ? (index % 2) * (slotHeight + slotGap) : 0);
    page.drawImage(image, { x: (pageWidth - width) / 2, y: slotTop - slotHeight + (slotHeight - height) / 2, width, height });
    if (isA4 && index % 2 === 1 && index < entries.length - 1) page = pdf.addPage([pageWidth, pageHeight]);
    if (!isA4 && index < entries.length - 1) page = pdf.addPage([pageWidth, pageHeight]);
  }
  const pdfBytes = await pdf.save({ useObjectStreams: false });
  const url = URL.createObjectURL(new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" }));
  const link = document.createElement("a"); link.href = url; link.download = `delhivery-label-${reference}-${option.size}.pdf`; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
};

export function DelhiveryLabelMenu({ shipmentId, reference, onNotice, compact = true, disabled = false }: { shipmentId: string; reference: string; onNotice?: (message: string) => void; compact?: boolean; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloadingSize, setDownloadingSize] = useState<LabelSize | null>(null);
  const [options, setOptions] = useState<LabelOption[]>([]);
  const unavailable = disabled || !reference.trim() || /unavailable/i.test(reference);

  const loadOptions = async () => {
    if (loading) return;
    setOpen(true); setLoading(true);
    // The four physical sizes are a stable Delhivery contract. Do not start
    // four full provider artifact jobs just to populate this menu: that made
    // the UI wait for slow PDF fallbacks and incorrectly show “no formats”
    // even when Delhivery's order page offered Print Label. Fetch the chosen
    // artifact only when the user selects a size.
    setOptions(sizes.map((size) => ({ size, contentType: "", artifact: undefined, copies: 1 })));
    setLoading(false);
    onNotice?.("Choose a Delhivery label size to download.");
  };

  const download = async (option: LabelOption) => {
    setDownloadingSize(option.size);
    let artifact = option.artifact;
    try {
      if (!artifact || (!isPdfArtifact(artifact) && !isImageArtifact(artifact))) {
        const result = await pssApi<{ data?: { artifact?: unknown } }>(`/v1/shipments/${encodeURIComponent(shipmentId)}/label?size=${option.size}`);
        artifact = result.data?.artifact;
      }
      const entries = artifactEntries(artifact)
        .map((entry) => ({ ...entry, value: entry.value.replace(/^data:[^;]+;base64,/, "") }))
        .filter((entry) => {
          const type = entry.contentType.toLowerCase().split(";", 1)[0].trim();
          return entry.value.length > 100 && (type === "application/pdf" ? isPdfBase64(entry.value) : type === "image/png" || type === "image/jpeg");
        });
      const pdfEntries = entries.filter((entry) => entry.contentType.toLowerCase().split(";", 1)[0].trim() === "application/pdf");
      const imageEntries = entries.filter((entry) => {
        const type = entry.contentType.toLowerCase().split(";", 1)[0].trim();
        return type === "image/png" || type === "image/jpeg";
      });
      if (!entries.length) throw new Error("Delhivery did not return a label for this size.");
      if (pdfEntries.length && (option.size === "a4" || !imageEntries.length)) {
        // Keep the provider PDF byte-for-byte when it is the authoritative
        // A4/MPS document. This avoids re-encoding mixed provider assets.
        saveBase64(`delhivery-label-${reference}-${option.size}.pdf`, pdfEntries[0].value, "application/pdf");
      } else if (imageEntries.length) {
        // Delhivery's B2B label API returns PNG/JPEG assets. Embed those exact
        // source bytes in a PDF at the selected physical size. No rasterization,
        // JPEG recompression, sharpening, or crop is performed.
        await imageToPdf(reference, option, imageEntries);
      } else {
        throw new Error("Delhivery did not return a usable label for this size.");
      }
      setOpen(false); onNotice?.(`Delhivery ${option.size} label downloaded.`);
    } catch (error) { onNotice?.(`Label download failed: ${getPssErrorDetails(error, "The Delhivery label could not be downloaded.").message}`); }
    finally { setDownloadingSize(null); }
  };

  return <div className="relative inline-flex">
    <button type="button" aria-label={unavailable ? `Label unavailable for ${reference}` : `Download label for ${reference}`} aria-expanded={open} disabled={unavailable} onClick={() => { if (unavailable) { onNotice?.("Label unavailable until Delhivery publishes an LR/AWB."); return; } if (open) setOpen(false); else void loadOptions(); }} className={cn("inline-flex items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50", compact ? "size-8" : "gap-1.5 px-2.5 py-2 text-xs font-semibold")} title={unavailable ? "Label unavailable until Delhivery publishes an LR/AWB" : "Download Delhivery label"}><Tag className="size-3.5" />{!compact && <span>Label</span>}</button>
    {open && <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl">
      <p className="px-3 py-2 text-[11px] font-semibold text-muted-foreground">Delhivery label size</p>
      {loading ? <p className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" />Loading formats…</p> : options.length ? options.map((option) => <button key={option.size} type="button" disabled={downloadingSize !== null} onClick={() => void download(option)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium hover:bg-accent disabled:cursor-wait disabled:opacity-60">{downloadingSize === option.size ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}{downloadingSize === option.size ? "Preparing…" : sizeLabels[option.size]}{pdfPageCount(option) > 1 ? ` · ${pdfPageCount(option)} pages` : ""}</button>) : <p className="px-3 py-2 text-xs text-muted-foreground">No label formats available.</p>}
    </div>}
  </div>;
}
