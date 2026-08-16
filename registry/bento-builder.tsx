import { Plus, X } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Tile = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  hue: number;
  label: string;
};

const DEFAULT_COLS = 6;
const DEFAULT_ROW_H = 110;
const DEFAULT_GAP = 12;
/** Matches Tailwind's rounded-3xl (1.5rem), the radius this canvas always used before it became adjustable. */
const DEFAULT_CORNER_RADIUS = 24;

const LABELS = [
  "Overview",
  "Analytics",
  "Revenue",
  "Uptime",
  "Calendar",
  "Team",
];

const makeTile = (x = 0, y = 0): Tile => ({
  id: crypto.randomUUID(),
  x,
  y,
  w: 2,
  h: 2,
  hue: Math.floor(Math.random() * 360),
  label: LABELS[Math.floor(Math.random() * LABELS.length)],
});

const DEFAULT_PATTERN: Array<{
  w: number;
  h: number;
  hue: number;
  label: string;
}> = [
  { w: 2, h: 2, hue: 265, label: "Overview" },
  { w: 2, h: 1, hue: 200, label: "Analytics" },
  { w: 1, h: 1, hue: 340, label: "Revenue" },
  { w: 1, h: 2, hue: 30, label: "Uptime" },
  { w: 2, h: 1, hue: 160, label: "Calendar" },
  { w: 1, h: 1, hue: 290, label: "Team" },
];

/** Whether two grid rectangles occupy any of the same cells. */
function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
) {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

/** Axis-aligned bounding box of one or more grid rects. */
function boundingBox(
  rects: Array<{ x: number; y: number; w: number; h: number }>
) {
  const minX = Math.min(...rects.map((r) => r.x));
  const minY = Math.min(...rects.map((r) => r.y));
  const maxX = Math.max(...rects.map((r) => r.x + r.w));
  const maxY = Math.max(...rects.map((r) => r.y + r.h));
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/**
 * True when `tiles` exactly fill `target` — same bounding box, no overhang,
 * and no gaps (combined area equals the target area). Used so a wide tile
 * can swap with a matching-width row of smaller tiles (e.g. 3×1 ↔ 2×1+1×1).
 */
function tilesExactlyFill(
  tiles: Array<{ x: number; y: number; w: number; h: number }>,
  target: { x: number; y: number; w: number; h: number }
) {
  if (tiles.length === 0) return false;
  const box = boundingBox(tiles);
  if (
    box.x !== target.x ||
    box.y !== target.y ||
    box.w !== target.w ||
    box.h !== target.h
  ) {
    return false;
  }
  const area = tiles.reduce((sum, t) => sum + t.w * t.h, 0);
  return area === target.w * target.h;
}

/** Shrinks w, then h, until the rect at (x, y) no longer overlaps any other tile. */
function clampSizeToAvoidOverlap(
  others: Array<{ x: number; y: number; w: number; h: number }>,
  x: number,
  y: number,
  w: number,
  h: number
) {
  let clampedW = w;
  while (
    clampedW > 1 &&
    others.some((t) => rectsOverlap({ x, y, w: clampedW, h }, t))
  ) {
    clampedW--;
  }
  let clampedH = h;
  while (
    clampedH > 1 &&
    others.some((t) => rectsOverlap({ x, y, w: clampedW, h: clampedH }, t))
  ) {
    clampedH--;
  }
  return { w: clampedW, h: clampedH };
}

/** Lays the fixed default pattern out left-to-right, wrapping to fit however
 *  many columns the grid currently has (so smaller `cols` values never overflow). */
function buildDefaultTiles(cols: number): Tile[] {
  let x = 0;
  let y = 0;
  let rowSpan = 1;

  return DEFAULT_PATTERN.map((tile, index) => {
    const w = Math.min(tile.w, cols);

    if (x + w > cols) {
      x = 0;
      y += rowSpan;
      rowSpan = 1;
    }

    const placed: Tile = {
      id: String(index + 1),
      x,
      y,
      w,
      h: tile.h,
      hue: tile.hue,
      label: tile.label,
    };

    x += w;
    rowSpan = Math.max(rowSpan, tile.h);

    return placed;
  });
}

type ResizeState = {
  id: string;
  startX: number;
  startY: number;
  origW: number;
  origH: number;
};

type BentoBuilderProps = {
  /** Number of grid columns. */
  cols?: number;
  /** Height of each grid row, in pixels. */
  rowHeight?: number;
  /** Gap between tiles, in pixels. */
  gap?: number;
  /** Corner radius of every tile, in pixels. */
  cornerRadius?: number;
  className?: string;
  /** Called with the generated layout snippet whenever the canvas changes. */
  onLayoutChange?: (code: string) => void;
};

export function BentoBuilder({
  cols = DEFAULT_COLS,
  rowHeight = DEFAULT_ROW_H,
  gap = DEFAULT_GAP,
  cornerRadius = DEFAULT_CORNER_RADIUS,
  className,
  onLayoutChange,
}: BentoBuilderProps = {}) {
  const [tiles, setTiles] = useState<Tile[]>(() => buildDefaultTiles(cols));
  const [resize, setResize] = useState<ResizeState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(
    () => Math.max(4, ...tiles.map((t) => t.y + t.h)) + 1,
    [tiles]
  );

  const cellSize = useCallback(() => {
    const el = gridRef.current;
    const w = el ? el.clientWidth : 800;
    const cellW = (w - gap * (cols - 1)) / cols;
    return { cellW, cellH: rowHeight };
  }, [cols, gap, rowHeight]);

  useEffect(() => {
    onLayoutChange?.(generateCode(tiles, cols, rowHeight, gap, cornerRadius));
  }, [tiles, cols, rowHeight, gap, cornerRadius, onLayoutChange]);

  const addTile = () => {
    // find first empty row
    const maxY = tiles.reduce((m, t) => Math.max(m, t.y + t.h), 0);
    const tile = makeTile(0, maxY);
    setTiles((t) => [...t, tile]);
    // Select it immediately so the rename field is one tap away.
    setSelectedId(tile.id);
  };
  const remove = (id: string) => {
    setTiles((t) => t.filter((x) => x.id !== id));
    setSelectedId((current) => (current === id ? null : current));
  };
  const rename = (id: string, label: string) =>
    setTiles((t) => t.map((x) => (x.id === id ? { ...x, label } : x)));
  const selectTile = (id: string) =>
    setSelectedId((current) => (current === id ? null : id));

  const commitMove = useCallback((id: string, x: number, y: number) => {
    setTiles((prev) => {
      const moving = prev.find((t) => t.id === id);
      if (!moving) return prev;
      const movedRect = { x, y, w: moving.w, h: moving.h };
      const overlapping = prev.filter(
        (t) => t.id !== id && rectsOverlap(movedRect, t)
      );

      if (overlapping.length === 0) {
        return prev.map((t) => (t.id === id ? { ...t, x, y } : t));
      }

      // 1) Single identically sized tile → simple swap.
      const [only] = overlapping;
      const isCleanSwap =
        overlapping.length === 1 && only.w === moving.w && only.h === moving.h;

      if (isCleanSwap) {
        return prev.map((t) => {
          if (t.id === id) return { ...t, x, y };
          if (t.id === only.id) return { ...t, x: moving.x, y: moving.y };
          return t;
        });
      }

      // 2) Group swap: overlapping tiles exactly fill the drop rect (same
      // footprint as the mover). Shift the whole group to the mover's old
      // origin so relative positions stay intact — e.g. Love (3×1) ↔
      // Calendar (2×1) + Team (1×1).
      if (!tilesExactlyFill(overlapping, movedRect)) return prev;

      const dx = moving.x - movedRect.x;
      const dy = moving.y - movedRect.y;
      const displaced = new Set(overlapping.map((t) => t.id));

      return prev.map((t) => {
        if (t.id === id) return { ...t, x, y };
        if (displaced.has(t.id)) return { ...t, x: t.x + dx, y: t.y + dy };
        return t;
      });
    });
  }, []);

  const onResizeStart = (e: React.PointerEvent, tile: Tile) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setResize({
      id: tile.id,
      startX: e.clientX,
      startY: e.clientY,
      origW: tile.w,
      origH: tile.h,
    });
  };

  const onResizePointerMove = (e: React.PointerEvent) => {
    if (!resize) return;
    const { cellW, cellH } = cellSize();
    const dx = Math.round((e.clientX - resize.startX) / (cellW + gap));
    const dy = Math.round((e.clientY - resize.startY) / (cellH + gap));
    setTiles((prev) => {
      const tile = prev.find((t) => t.id === resize.id);
      if (!tile) return prev;
      const others = prev.filter((t) => t.id !== resize.id);
      const wantedW = Math.max(1, Math.min(cols - tile.x, resize.origW + dx));
      const wantedH = Math.max(1, resize.origH + dy);
      const { w: nw, h: nh } = clampSizeToAvoidOverlap(
        others,
        tile.x,
        tile.y,
        wantedW,
        wantedH
      );
      return prev.map((t) => (t.id === resize.id ? { ...t, w: nw, h: nh } : t));
    });
  };

  const onResizePointerUp = () => setResize(null);

  return (
    <div
      className={cn("relative w-full p-5 text-foreground sm:p-6", className)}
    >
      <div className="mb-6 flex flex-wrap gap-2">
        <ToolBtn
          icon={<Plus className="h-4 w-4" />}
          label="Add tile"
          onClick={addTile}
        />
      </div>

      {/** biome-ignore lint/a11y/useKeyWithClickEvents: deselecting the background is a pointer-only convenience — tiles themselves stay keyboard-reachable via their remove/rename controls. */}
      <div
        className="relative grid select-none"
        onClick={(e) => {
          // Deselect only when the empty grid background itself is tapped,
          // not when the click bubbled up from a tile.
          if (e.target === e.currentTarget) setSelectedId(null);
        }}
        onPointerCancel={onResizePointerUp}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
        ref={gridRef}
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridAutoRows: `${rowHeight}px`,
          gap: `${gap}px`,
          minHeight: rows * (rowHeight + gap),
        }}
      >
        {tiles.map((tile) => (
          <BentoTile
            cellSize={cellSize}
            cols={cols}
            cornerRadius={cornerRadius}
            gap={gap}
            isResizing={resize?.id === tile.id}
            isSelected={selectedId === tile.id}
            key={tile.id}
            onCommitMove={commitMove}
            onRemove={() => remove(tile.id)}
            onRename={(label) => rename(tile.id, label)}
            onResizeStart={onResizeStart}
            onSelect={() => selectTile(tile.id)}
            tile={tile}
          />
        ))}
      </div>

      {tiles.length === 0 && (
        <motion.div
          animate={{ opacity: 1 }}
          className="mt-20 text-center text-muted-foreground"
          initial={{ opacity: 0 }}
        >
          Empty canvas — press <span className="text-foreground">Add</span> to
          place a tile.
        </motion.div>
      )}

      <p className="mt-6 text-muted-foreground text-xs">
        Tip: drag a tile to reposition it — dropping on a same-size tile swaps
        them, or on a group that matches its footprint (e.g. 3×1 over 2×1+1×1).
        Tap a tile to rename it, drag its corner handle to resize, and use the ×
        to remove it — all of this works with touch too. Paste the generated
        layout into your project; set href on a tile to make it a link, then add
        descriptions and images.
      </p>
    </div>
  );
}

function BentoTile({
  tile,
  cols,
  cornerRadius,
  gap,
  cellSize,
  isResizing,
  isSelected,
  onCommitMove,
  onRemove,
  onRename,
  onResizeStart,
  onSelect,
}: {
  tile: Tile;
  cols: number;
  cornerRadius: number;
  gap: number;
  cellSize: () => { cellW: number; cellH: number };
  isResizing: boolean;
  isSelected: boolean;
  onCommitMove: (id: string, x: number, y: number) => void;
  onRemove: () => void;
  onRename: (label: string) => void;
  onResizeStart: (e: React.PointerEvent, tile: Tile) => void;
  onSelect: () => void;
}) {
  const [movePx, setMovePx] = useState<{ x: number; y: number } | null>(null);
  const moveStart = useRef<{ x: number; y: number } | null>(null);
  const isMoving = movePx !== null;

  const onMovePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.dataset.resize || target.dataset.noDrag) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    moveStart.current = { x: e.clientX, y: e.clientY };
    setMovePx({ x: 0, y: 0 });
  };

  const onMovePointerMove = (e: React.PointerEvent) => {
    if (!moveStart.current) return;
    setMovePx({
      x: e.clientX - moveStart.current.x,
      y: e.clientY - moveStart.current.y,
    });
  };

  const onMovePointerUp = () => {
    const start = moveStart.current;
    moveStart.current = null;
    if (!(start && movePx)) {
      setMovePx(null);
      return;
    }
    const { cellW, cellH } = cellSize();
    const dx = Math.round(movePx.x / (cellW + gap));
    const dy = Math.round(movePx.y / (cellH + gap));
    // Barely-moved pointers are a tap, not a drag — select the tile so its
    // rename field shows up (this is also what makes remove/resize reachable
    // on touch, where hover never fires).
    const isTap = Math.abs(movePx.x) < 6 && Math.abs(movePx.y) < 6;
    setMovePx(null);
    if (dx !== 0 || dy !== 0) {
      const nx = Math.max(0, Math.min(cols - tile.w, tile.x + dx));
      const ny = Math.max(0, tile.y + dy);
      onCommitMove(tile.id, nx, ny);
    } else if (isTap) {
      onSelect();
    }
  };

  const isActive = isMoving || isResizing;

  return (
    <motion.div
      className="relative"
      layout={!isActive}
      style={{
        gridColumn: `${tile.x + 1} / span ${tile.w}`,
        gridRow: `${tile.y + 1} / span ${tile.h}`,
        zIndex: isActive || isSelected ? 30 : 1,
      }}
      transition={{
        layout: { type: "spring", stiffness: 260, damping: 26, mass: 0.9 },
      }}
    >
      <div
        className={cn(
          "group relative h-full w-full cursor-grab touch-none overflow-hidden text-left text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14),0_12px_28px_-16px_rgba(0,0,0,0.55)] ring-1 ring-black/5 ring-inset active:cursor-grabbing",
          isSelected && "outline outline-2 outline-white/70 outline-offset-2"
        )}
        onPointerCancel={onMovePointerUp}
        onPointerDown={onMovePointerDown}
        onPointerMove={onMovePointerMove}
        onPointerUp={onMovePointerUp}
        style={{
          background: `oklch(0.55 0.2 ${tile.hue})`,
          borderRadius: cornerRadius,
          transform: movePx
            ? `translate3d(${movePx.x}px, ${movePx.y}px, 0)`
            : undefined,
          transition: isMoving ? "none" : undefined,
        }}
      >
        {/* Header and footer are pinned to fixed insets from the tile edges
            (not a flex column pushed apart by height) so every tile — a
            short 1×1 or a tall 2×2 — gets identical padding. */}
        <button
          aria-label="Remove tile"
          className={cn(
            "pointer-events-auto absolute top-3 right-3 flex h-7 w-7 items-center justify-center text-white/80 opacity-0 transition-[opacity,color,transform] duration-150 ease-out hover:text-white active:scale-90 group-hover:opacity-100 sm:top-4 sm:right-4",
            isSelected && "opacity-100"
          )}
          data-no-drag="true"
          onClick={onRemove}
          onPointerDown={(e) => e.stopPropagation()}
          title="Remove tile"
          type="button"
        >
          <X className="h-4 w-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" />
        </button>

        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex min-w-0 flex-col gap-1.5 sm:inset-x-4 sm:bottom-4">
          {isSelected ? (
            <input
              className="pointer-events-auto w-full truncate rounded-md bg-transparent font-semibold text-[15px] text-white leading-tight tracking-[-0.01em] outline-none placeholder:text-white/50 focus-visible:ring-1 focus-visible:ring-white/60"
              data-no-drag="true"
              onChange={(e) => onRename(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              placeholder="Tile name"
              value={tile.label}
            />
          ) : (
            <div className="truncate font-semibold text-[15px] leading-tight tracking-[-0.01em]">
              {tile.label}
            </div>
          )}
          <div className="inline-flex w-fit items-center rounded-full bg-black/15 px-2 py-0.5 font-medium text-[10px] text-white/70 tabular-nums tracking-wider">
            {tile.w} × {tile.h}
          </div>
        </div>

        {/* Resize handle */}
        <div
          className={cn(
            "absolute right-2 bottom-2 flex h-6 w-6 cursor-nwse-resize items-center justify-center text-white/85 opacity-0 transition-[opacity,color] duration-150 ease-out hover:text-white group-hover:opacity-100",
            isSelected && "opacity-100"
          )}
          data-resize="true"
          onPointerDown={(e) => onResizeStart(e, tile)}
          title="Drag to resize"
        >
          <svg
            className="pointer-events-none h-3.5 w-3.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
            data-resize="true"
            viewBox="0 0 10 10"
          >
            <path
              d="M9 1 L1 9 M9 5 L5 9 M9 9 L9 9"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            />
          </svg>
        </div>
      </div>
    </motion.div>
  );
}

function generateCode(
  tiles: Tile[],
  cols: number,
  rowHeight: number,
  gap: number,
  cornerRadius: number
): string {
  const items = tiles
    .map(
      (t) =>
        `  { x: ${t.x}, y: ${t.y}, w: ${t.w}, h: ${t.h}, hue: ${t.hue}, label: ${JSON.stringify(t.label)} },`
    )
    .join("\n");

  return `// Bento layout — ${cols} columns, ${rowHeight}px row height
export type BentoTile = {
  x: number;
  y: number;
  w: number;
  h: number;
  hue: number;
  label: string;
  // These aren't set by the visual builder — add them directly here (or to
  // your own tiles array) once you've pasted this into your project.
  description?: string;
  image?: string;
  /** Turns the tile into a link — renders an <a> instead of a <div>. */
  href?: string;
};

const defaultTiles: BentoTile[] = [
${items}
];

// tiles/cols/rowHeight/gap/cornerRadius are props, not hardcoded — edit
// defaultTiles above, or pass your own <Bento tiles={...} /> from anywhere
// in your app.
export function Bento({
  tiles = defaultTiles,
  cols = ${cols},
  rowHeight = ${rowHeight},
  gap = ${gap},
  cornerRadius = ${cornerRadius},
}: {
  tiles?: BentoTile[];
  cols?: number;
  rowHeight?: number;
  gap?: number;
  cornerRadius?: number;
}) {
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: \`repeat(\${cols}, minmax(0, 1fr))\`,
        gridAutoRows: \`minmax(\${rowHeight}px, auto)\`,
        gap: \`\${gap}px\`,
      }}
    >
      {tiles.map((t, i) => {
        // The grid placement lives in CSS variables (set below) rather than
        // inline grid-column/grid-row so the max-sm: overrides — plain
        // Tailwind utilities — can win on small screens without !important
        // hacks or an injected <style> tag: each tile collapses to a single
        // stacked column below 640px and keeps its own content only.
        const placement = {
          "--bento-col": \`\${t.x + 1} / span \${t.w}\`,
          "--bento-row": \`\${t.y + 1} / span \${t.h}\`,
        } as React.CSSProperties;

        const className =
          "group relative block overflow-hidden p-5 text-white no-underline shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14),0_12px_28px_-16px_rgba(0,0,0,0.55)] ring-1 ring-black/5 ring-inset transition-transform duration-200 ease-out [grid-column:var(--bento-col)] [grid-row:var(--bento-row)] max-sm:[grid-column:auto]! max-sm:[grid-row:auto]! motion-safe:hover:-translate-y-1 motion-safe:hover:scale-[1.02]";

        const style = {
          ...placement,
          background: t.image ? undefined : \`oklch(0.55 0.2 \${t.hue})\`,
          borderRadius: cornerRadius,
        } as React.CSSProperties;

        const content = (
          <>
            {t.image && (
              <img
                alt={t.label}
                className="absolute inset-0 h-full w-full object-cover"
                height={400}
                src={t.image}
                width={400}
              />
            )}
            {t.image && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
            )}
            <div className="relative flex h-full flex-col justify-end gap-1">
              <div className="font-semibold text-[15px] leading-tight tracking-[-0.01em]">
                {t.label}
              </div>
              {t.description && (
                <div className="text-sm text-white/80 leading-snug">
                  {t.description}
                </div>
              )}
            </div>
          </>
        );

        // Rendered as a real <a> (not a wrapped <div>) whenever href is set,
        // so the tile is keyboard-focusable and works with Cmd/Ctrl-click,
        // middle-click, and screen readers — the way a link should.
        return t.href ? (
          <a className={className} href={t.href} key={i} style={style}>
            {content}
          </a>
        ) : (
          <div className={className} key={i} style={style}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
`;
}

function ToolBtn({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <motion.button
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-foreground transition-colors hover:bg-muted/70 active:bg-muted/60"
      onClick={onClick}
      title={label}
      type="button"
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.94 }}
    >
      {icon}
    </motion.button>
  );
}
