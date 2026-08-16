"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

const CARBON_SCRIPT_SRC =
  "https://cdn.carbonads.com/carbon.js?serve=CWBITKQL&placement=iconiquicom&format=cover";

declare global {
  interface Window {
    _carbonads?: {
      refresh: () => void;
    };
  }
}

function removeCarbonDom() {
  document.getElementById("_carbonads_js")?.remove();
  document.getElementById("carbonads")?.remove();
  document.getElementById("carbon-cover")?.remove();
  document.getElementById("carbon-responsive")?.remove();
}

/**
 * Carbon Cover unit. Loads the dashboard script into a reserved slot.
 * Do not hide ad image/text/link elements — placement policy forbids it.
 * Reloads on client-side route changes (allowed for SPA navigation).
 */
export function CarbonAds({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    removeCarbonDom();

    const script = document.createElement("script");
    script.async = true;
    script.id = "_carbonads_js";
    script.src = CARBON_SCRIPT_SRC;
    script.type = "text/javascript";
    container.appendChild(script);

    return () => {
      removeCarbonDom();
    };
  }, [pathname]);

  return (
    <div
      className={cn("carbon-ads-slot", className)}
      data-carbon-ads
      ref={containerRef}
    />
  );
}
