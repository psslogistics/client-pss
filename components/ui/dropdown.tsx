"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

type DropdownProps = {
  label: string;
  value: string;
  options: (string | { value: string; label: string })[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onChange: (value: string) => void;
  className?: string;
  searchable?: boolean;
};

export default function Dropdown({ label, value, options, open: controlledOpen, onOpenChange, onChange, className: suppliedClassName = "", searchable = label === "Reuse saved" }: DropdownProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const open = controlledOpen ?? internalOpen;
  const className = label === "Reuse saved" ? suppliedClassName.replace("w-52", "w-[19.5rem] max-w-[55%]") : suppliedClassName;
  const setOpen = useCallback((next: boolean) => { setInternalOpen(next); onOpenChange?.(next); }, [onOpenChange]);
  useEffect(() => {
    const close = (event: PointerEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [setOpen]);
  const filteredOptions = options.filter((option) => {
    if (!option) return false;
    if (!query.trim()) return true;
    const optionLabel = typeof option === "string" ? option : option.label;
    return optionLabel.toLowerCase().includes(query.trim().toLowerCase());
  });
  return <div ref={ref} className={`relative ${className}`}><button type="button" aria-label={label} aria-haspopup="listbox" aria-expanded={open} onClick={() => { setOpen(!open); if (open) setQuery(""); }} className="flex h-9 w-full items-center justify-between rounded-xl border border-input bg-background px-3 text-left text-xs text-foreground outline-none transition hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/10"><span className={value ? "truncate" : "truncate text-muted-foreground"}>{options.find((option) => (typeof option === "string" ? option : option.value) === value) instanceof Object ? (options.find((option) => (typeof option === "string" ? option : option.value) === value) as { label: string }).label : value || label}</span><ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} /></button>{open && <div role="listbox" aria-label={`${label} options`} className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl">{searchable && <div className="sticky top-0 z-10 mb-1 flex items-center gap-2 rounded-lg border border-input bg-background px-2.5"><Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /><input autoFocus aria-label={`Search ${label.toLowerCase()}`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search saved addresses…" className="h-8 min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground" /></div>}{!query.trim() && <button type="button" role="option" aria-selected={!value} onClick={() => { onChange(""); setOpen(false); setQuery(""); }} className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition ${!value ? "bg-primary/10 font-semibold text-primary" : "hover:bg-accent"}`}>{label}{!value && <Check className="h-3.5 w-3.5" />}</button>}{filteredOptions.map((option, index) => { const optionValue = typeof option === "string" ? option : option.value; const optionLabel = typeof option === "string" ? option : option.label; return <button key={`${optionValue}-${index}`} type="button" role="option" aria-selected={value === optionValue} onClick={() => { onChange(optionValue); setOpen(false); setQuery(""); }} className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition ${value === optionValue ? "bg-primary/10 font-semibold text-primary" : "hover:bg-accent"}`}>{optionLabel || label}{value === optionValue && <Check className="h-3.5 w-3.5" />}</button>; })}{searchable && !filteredOptions.length && <p className="px-2.5 py-3 text-xs text-muted-foreground">No saved addresses match.</p>}</div>}</div>;
}
