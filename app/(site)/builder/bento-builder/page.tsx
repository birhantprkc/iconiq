"use client";

import { BentoBuilderPlaygroundProvider } from "@/app/(site)/builder/bento-builder/_components/bento-builder-playground";
import { bentoBuilderApiDetails } from "@/components/docs/component-api";
import { ComponentDocsPage } from "@/components/docs/page-shell";
import { LINK } from "@/constants";

const usageCode = `import { BentoBuilder } from "@/components/ui/bento-builder";

export function LayoutTool() {
  return <BentoBuilder />;
}`;

const breadcrumbs = [
  { label: "Docs", href: "/" },
  { label: "Builder" },
  { label: "Bento Builder" },
];

export default function BentoBuilderPage() {
  return (
    <BentoBuilderPlaygroundProvider>
      {({ preview, renderSettings }) => (
        <ComponentDocsPage
          breadcrumbs={breadcrumbs}
          componentName="bento-builder"
          description="Drag-and-resize bento grid canvas — arrange tiles wherever you want, then copy the generated layout code straight into your own project."
          details={bentoBuilderApiDetails}
          detailsDescription="BentoBuilder handles layout, not content. Drag any tile to move it, tap it to rename it, drag its bottom-right corner to resize it, and use Add to place a new tile. Every change regenerates the layout instantly under Export layout — a typed, props-driven component ready for you to fill in your own descriptions, images, and links back in your project."
          editHref={`${LINK.GITHUB}/edit/main/app/(site)/builder/bento-builder/page.tsx`}
          fullWidthPreview
          hideFileStructure
          hideInstallation
          hidePreviewReload
          hidePreviewSource
          itemSlug="bento-builder"
          pageUrl="/builder/bento-builder"
          preview={preview}
          previewClassName="min-h-[34rem] overflow-auto"
          previewDescription="Drag a tile to reposition it — dropping it on another tile swaps the two instead of overlapping. Tap a tile to select it: a rename field appears, and its remove and resize controls stay visible without hovering, so the whole canvas works on touch too. Use Add in the toolbar, and open the floating sliders control in the bottom-right to change the row height and corner radius."
          previewPersonalize={({ onClose }) => renderSettings(onClose)}
          previewPersonalizeTitle="Bento Builder"
          railNotes={[
            "Use the floating sliders button in the bottom-right of the preview to change row height and corner radius.",
            "Drag a tile to move it — dropping it on an occupied spot swaps the two tiles rather than overlapping them.",
            "Tap a tile to select it — rename it inline and reach its remove and resize controls without needing hover, so the canvas is just as usable on a phone or tablet.",
            "Drag a tile's corner handle to resize it — this canvas is for layout, not content editing.",
            "Export layout updates live with a typed BentoTile array and a Bento component that takes tiles/cols/rowHeight/gap/cornerRadius as props.",
            "Set href on a tile in the exported code to turn it into a real, keyboard-focusable link.",
            "The exported grid is mobile-responsive out of the box — below 640px it collapses to one stacked column automatically, using plain Tailwind utilities rather than an injected <style> tag.",
            "Each exported tile lifts and scales up slightly on hover — a minimal, reduced-motion-aware touch for the people using your site.",
            "Edit descriptions and images in defaultTiles after pasting — or pass your own tiles from anywhere in your app.",
            "Use the × in a tile's top-right corner to remove it; Add places a new tile in the first open row and selects it right away.",
          ]}
          title="Bento Builder"
          usageCode={usageCode}
          usageDescription="Arrange tiles on the canvas, then grab the live snippet from Export layout and paste it into your project — a typed, prop-driven grid with no builder chrome, ready for your own descriptions, images, and links. The exported grid ships mobile-responsive: below 640px every tile stacks into a single full-width column automatically, no extra work needed."
          usageTitle="Export layout"
        />
      )}
    </BentoBuilderPlaygroundProvider>
  );
}
