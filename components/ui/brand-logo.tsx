import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return <Image src={compact ? "/pss-mark.png" : "/pss-logo.png"} alt="PSS Logistics" width={compact ? 34 : 150} height={compact ? 34 : 42} priority={compact} className={cn("h-auto max-w-full object-contain", compact ? "w-8" : "w-[150px]", className)} />;
}
