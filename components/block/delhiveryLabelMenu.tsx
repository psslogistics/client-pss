"use client";

import { Download, Loader2, Tag } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { getPssErrorDetails, pssApi } from "@/lib/pss-api";
import { expectedStickerCount, labelFileName, labelSizeLabel, labelSizes, type LabelSize } from "@/lib/label-contract";
import { composeAssetsToA4, pdfPageCount, printableAssetCount, type ArtifactEntry } from "@/lib/label-pdf";

type LabelOption = { size: LabelSize; contentType: string; artifact: unknown; copies: number };

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
  // Do not recursively infer a wrapper's type from an arbitrary child. A
  // Delhivery response may contain PDF MPS pages alongside raster box labels;
  // each child must retain its own MIME type while traversing the wrapper.
  return "application/octet-stream";
};

const saveBase64 = (name: string, value: string, contentType: string) => {
  const normalized = value.replace(/^data:[^;]+;base64,/, "");
  const bytes = Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: contentType }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
};

const assetsToA4 = async (reference: string, option: LabelOption, entries: ArtifactEntry[]) => {
  const pdfBytes = await composeAssetsToA4(option.size, entries);
  const url = URL.createObjectURL(new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" }));
  const link = document.createElement("a"); link.href = url; link.download = labelFileName(reference, option.size); link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
};

export function DelhiveryLabelMenu({ shipmentId, reference, boxes = 1, onNotice, compact = true, disabled = false }: { shipmentId: string; reference: string; boxes?: number; onNotice?: (message: string) => void; compact?: boolean; disabled?: boolean }) {
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
    setOptions(labelSizes.map((size) => ({ size, contentType: "", artifact: undefined, copies: expectedStickerCount(boxes) })));
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
      const returnedCopies = await printableAssetCount(entries);
      const requiredCopies = expectedStickerCount(boxes);
      if (returnedCopies < requiredCopies) throw new Error(`Delhivery returned ${returnedCopies} sticker${returnedCopies === 1 ? "" : "s"}; ${requiredCopies} were expected for ${boxes} box${boxes === 1 ? "" : "es"}, including the MPS sticker.`);
      if (pdfEntries.length === 1 && !imageEntries.length && option.size === "a4") {
        // Keep a single authoritative provider A4/MPS PDF byte-for-byte.
        saveBase64(labelFileName(reference, option.size), pdfEntries[0].value, "application/pdf");
      } else if (entries.length) {
        // For every sticker size other than a single provider A4 PDF, impose
        // the complete provider sequence onto printable A4 sheets. Images
        // retain their source pixels and PDF assets remain vector pages, so
        // the MPS/document sticker is not dropped or re-encoded.
        await assetsToA4(reference, option, entries);
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
      {loading ? <p className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" />Loading formats…</p> : options.length ? options.map((option) => <button key={option.size} type="button" disabled={downloadingSize !== null} onClick={() => void download(option)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium hover:bg-accent disabled:cursor-wait disabled:opacity-60">{downloadingSize === option.size ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}{downloadingSize === option.size ? "Preparing…" : labelSizeLabel[option.size]}{pdfPageCount(option.size, option.copies) > 1 ? ` · ${pdfPageCount(option.size, option.copies)} pages` : ""}</button>) : <p className="px-3 py-2 text-xs text-muted-foreground">No label formats available.</p>}
    </div>}
  </div>;
}
