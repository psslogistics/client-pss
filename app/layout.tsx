import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "PSS Logistics",
  description: "Direct To Every Direction",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", "font-sans")}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
