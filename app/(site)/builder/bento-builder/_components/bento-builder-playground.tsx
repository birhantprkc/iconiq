"use client";

import { type ReactNode, useEffect, useState } from "react";

import {
  DocsPlaygroundClearButton,
  DocsPlaygroundPanel,
  DocsPlaygroundSegmentedField,
} from "@/components/docs/playground/docs-playground-fields";
import { docsPlaygroundRowClassName } from "@/components/docs/playground/docs-playground-styles";
import { useDocStore } from "@/hooks/use-doc-store";
import { cn } from "@/lib/utils";
import { BentoBuilder } from "@/registry/bento-builder";
import { Slider } from "@/registry/slider";

type RowHeightOption = "small" | "medium" | "large";

type BentoBuilderPlaygroundState = {
  rowHeight: RowHeightOption;
  /** Corner radius of every tile, in pixels. */
  cornerRadius: number;
};

const CORNER_RADIUS_MIN = 0;
const CORNER_RADIUS_MAX = 32;

// Matches the canvas's original fixed radius (Tailwind's rounded-3xl).
const DEFAULT_STATE: BentoBuilderPlaygroundState = {
  rowHeight: "medium",
  cornerRadius: 24,
};

const ROW_HEIGHT_PRESETS: Record<RowHeightOption, number> = {
  small: 90,
  medium: 110,
  large: 130,
};

const ROW_HEIGHT_OPTIONS: Array<{ label: string; value: RowHeightOption }> = [
  { label: "S", value: "small" },
  { label: "M", value: "medium" },
  { label: "L", value: "large" },
];

type BentoBuilderPlaygroundRenderProps = {
  preview: ReactNode;
  renderSettings: (onClose: () => void) => ReactNode;
};

export function BentoBuilderPlaygroundProvider({
  children,
}: {
  children: (props: BentoBuilderPlaygroundRenderProps) => ReactNode;
}) {
  const { setPlaygroundCode } = useDocStore();
  const [state, setState] =
    useState<BentoBuilderPlaygroundState>(DEFAULT_STATE);

  const updateState = (next: Partial<BentoBuilderPlaygroundState>) => {
    setState((current) => ({ ...current, ...next }));
  };

  const resetState = () => setState(DEFAULT_STATE);

  useEffect(
    () => () => {
      setPlaygroundCode(null);
    },
    [setPlaygroundCode]
  );

  const preview = (
    <BentoBuilder
      className="min-h-full"
      cornerRadius={state.cornerRadius}
      key={state.rowHeight}
      onLayoutChange={setPlaygroundCode}
      rowHeight={ROW_HEIGHT_PRESETS[state.rowHeight]}
    />
  );

  const renderSettings = (onClose: () => void) => (
    <DocsPlaygroundPanel
      footer={
        <DocsPlaygroundClearButton label="Reset layout" onClick={resetState} />
      }
      onClose={onClose}
      title="Bento Builder"
    >
      <DocsPlaygroundSegmentedField
        label="Row height"
        onChange={(rowHeight) => updateState({ rowHeight })}
        options={ROW_HEIGHT_OPTIONS}
        value={state.rowHeight}
      />
      <div
        className={cn(
          docsPlaygroundRowClassName,
          "flex-col items-stretch gap-1 overflow-visible px-3 py-3"
        )}
      >
        <Slider
          formatValue={(radius) => `${radius}px`}
          label="Corner radius"
          max={CORNER_RADIUS_MAX}
          min={CORNER_RADIUS_MIN}
          onChange={(radius) => updateState({ cornerRadius: radius as number })}
          size="sm"
          step={2}
          value={state.cornerRadius}
        />
      </div>
    </DocsPlaygroundPanel>
  );

  return children({ preview, renderSettings });
}
