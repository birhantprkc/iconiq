"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

const CARBON_SCRIPT_SRC =
  "https://cdn.carbonads.com/carbon.js?serve=CWBITKQL&placement=iconiquicom&format=cover";

/**
 * Carbon Cover unit. Loads the dashboard script into this slot.
 * Do not hide ad image/text/link elements — placement policy forbids it.
 */
export function CarbonAds({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // biome-ignore lint/correctness/useExhaustiveDependencies: reload on App Router navigations (SPA)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    // Clear prior markup in this slot, then inject exactly one script.
    container.innerHTML = "";

    const script = document.createElement("script");
    script.async = true;
    script.id = "_carbonads_js";
    script.src = CARBON_SCRIPT_SRC;
    script.type = "text/javascript";
    container.appendChild(script);
  }, [pathname]);

  return (
    <div
      className={cn("carbon-ads-slot", className)}
      data-carbon-ads
      ref={containerRef}
    />
  );
}
