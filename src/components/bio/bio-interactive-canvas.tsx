'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Pencil, Package, Check, GripVertical, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { BlockRenderer } from '@/components/bio/grid/bio-block-renderers';
import {
  findNextEmptyPosition,
  checkOverlap,
  isValidPlacement,
  GRID_COLUMNS,
} from '@/components/bio/grid/grid-utils';
import type {
  BioBlock,
  BioLinkItem,
  BioLayoutMode,
  BioCardLayout,
  BioLinkPage,
  BioThemeConfig,
  BioGridPosition,
} from '@/types/bio';

/* ═══════════════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════════════ */

const LONG_PRESS_MS = 500;
const MOVE_CANCEL_THRESHOLD = 10;
const STASH_ZONE_HEIGHT = 72;
const GRID_ROW_MIN_HEIGHT = 60; // matches gridAutoRows minmax

/* ═══════════════════════════════════════════════════════════════════════
   CSS
   ═══════════════════════════════════════════════════════════════════════ */

const INJECTED_CSS = `
@keyframes bio-wiggle {
  0%, 100% { transform: rotate(0deg); }
  20% { transform: rotate(-0.7deg); }
  40% { transform: rotate(0.7deg); }
  60% { transform: rotate(-0.5deg); }
  80% { transform: rotate(0.5deg); }
}
.bio-wiggle {
  animation: bio-wiggle 0.4s ease-in-out infinite;
}
.bio-drop-indicator {
  background: hsl(var(--foreground) / 0.08);
  border: 2px dashed hsl(var(--foreground) / 0.3);
  border-radius: 8px;
  transition: all 0.15s ease-out;
}
.bio-resize-handle {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  cursor: nwse-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: hsl(var(--foreground) / 0.8);
  color: hsl(var(--background));
  z-index: 12;
  touch-action: none;
}
`;

/* ═══════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════ */

type DragKind = 'move' | 'resize' | 'unstash';

interface DragInfo {
  kind: DragKind;
  blockId: string;
  /** Pointer position at start */
  startX: number;
  startY: number;
  /** Current pointer position */
  currentX: number;
  currentY: number;
  /** Offset from block top-left to pointer (for ghost positioning) */
  offsetX: number;
  offsetY: number;
  /** Block dimensions for rendering the floating ghost */
  width: number;
  height: number;
  /** Original grid position (for resize) */
  origCol: number;
  origRow: number;
  origColSpan: number;
  origRowSpan: number;
}

interface DropTarget {
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
  valid: boolean;
}

interface BioInteractiveCanvasProps {
  blocks: BioBlock[];
  links: BioLinkItem[];
  contentLayoutMode: BioLayoutMode;
  themeConfig: BioThemeConfig;
  bgStyle: React.CSSProperties;
  spacingConfig: { gap: string; padding: string };
  editMode: boolean;
  page: BioLinkPage;
  avatarUrl: string | null;
  coverUrl: string | null;
  subtitle: string;
  company: string;
  jobTitle: string;
  location: string;
  contactEmail: string;
  contactPhone: string;
  contactWebsite: string;
  coverAspectRatio: string | null;
  coverPositionY: number | null;
  cardLayout: BioCardLayout | null;
  onBlockTap: (blockId: string) => void;
  onHeaderTap: () => void;
  onMoveBlock: (blockId: string, col: number, row: number) => void;
  onResizeBlock: (blockId: string, colSpan: number, rowSpan: number) => void;
  onSavePositions: () => void;
  onLayoutModeChange?: (active: boolean) => void;
  contactCard: React.ReactNode;
}

/* ═══════════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════════ */

export function BioInteractiveCanvas({
  blocks,
  links,
  contentLayoutMode,
  themeConfig,
  bgStyle,
  spacingConfig,
  editMode,
  page,
  onBlockTap,
  onHeaderTap,
  onMoveBlock,
  onResizeBlock,
  onSavePositions,
  onLayoutModeChange,
  contactCard,
}: BioInteractiveCanvasProps) {
  /* ─── State ──────────────────────────────────────────────────────── */
  const [layoutMode, setLayoutMode] = useState(false);
  const [stashedIds, setStashedIds] = useState<Set<string>>(new Set());

  // Drag state lives in both ref (for event handlers) and state (for rendering)
  const [dragRender, setDragRender] = useState<DragInfo | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [overStash, setOverStash] = useState(false);

  // Refs for document-level event handlers (avoids stale closures)
  const dragRef = useRef<DragInfo | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const stashedRef = useRef(stashedIds);
  stashedRef.current = stashedIds;

  const longPressRef = useRef<{
    timer: ReturnType<typeof setTimeout>;
    blockId: string;
    x: number;
    y: number;
  } | null>(null);

  /* ─── Derived ────────────────────────────────────────────────────── */
  const gridBlocks = useMemo(
    () => blocks.filter((b) => b.is_enabled && !stashedIds.has(b.id)),
    [blocks, stashedIds],
  );
  const stashedBlocks = useMemo(
    () => blocks.filter((b) => stashedIds.has(b.id)),
    [blocks, stashedIds],
  );
  const draggedBlock = dragRender
    ? blocks.find((b) => b.id === dragRender.blockId) ?? null
    : null;

  /* ─── Notify parent ─────────────────────────────────────────────── */
  useEffect(() => {
    onLayoutModeChange?.(layoutMode);
  }, [layoutMode, onLayoutModeChange]);

  /* ─── Cleanup ───────────────────────────────────────────────────── */
  useEffect(() => {
    return () => {
      if (longPressRef.current) clearTimeout(longPressRef.current.timer);
    };
  }, []);

  /* ─── Grid measurement helper ───────────────────────────────────── */
  const getGridMetrics = useCallback(() => {
    const el = gridRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const gapPx = parseFloat(getComputedStyle(el).gap) || 0;
    const cellWidth = (rect.width - gapPx * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
    // Measure actual row heights from the grid
    const rows = el.getClientRects(); // fallback
    const rowTracks = getComputedStyle(el).gridTemplateRows.split(' ').map(parseFloat);
    const rowHeight = rowTracks.length > 0 && rowTracks[0] > 0
      ? rowTracks[0]
      : GRID_ROW_MIN_HEIGHT;
    return { rect, cellWidth, rowHeight, gapPx };
  }, []);

  /** Convert client coords to grid cell */
  const clientToGrid = useCallback(
    (clientX: number, clientY: number) => {
      const m = getGridMetrics();
      if (!m) return { col: 0, row: 0 };
      const relX = clientX - m.rect.left;
      const relY = clientY - m.rect.top;
      const col = Math.max(0, Math.min(GRID_COLUMNS - 1, Math.floor(relX / (m.cellWidth + m.gapPx))));
      const row = Math.max(0, Math.floor(relY / (m.rowHeight + m.gapPx)));
      return { col, row };
    },
    [getGridMetrics],
  );

  /* ═══════════════════════════════════════════════════════════════════
     Document-level pointer handlers (registered via useEffect)
     ═══════════════════════════════════════════════════════════════════ */

  const handleDocPointerMove = useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      e.preventDefault();

      const x = e.clientX;
      const y = e.clientY;

      // Update ref immediately (for drop calculation)
      drag.currentX = x;
      drag.currentY = y;

      // Render update (batched)
      setDragRender({ ...drag });

      // Check stash zone
      const isOverStashZone = y > window.innerHeight - STASH_ZONE_HEIGHT - 60;
      setOverStash(isOverStashZone);

      if (isOverStashZone || !gridRef.current) {
        setDropTarget(null);
        return;
      }

      if (drag.kind === 'move' || drag.kind === 'unstash') {
        // Calculate target grid cell
        const block = blocksRef.current.find((b) => b.id === drag.blockId);
        if (!block) return;
        const colSpan = block.grid_col_span;
        const rowSpan = block.grid_row_span;
        const { col, row } = clientToGrid(x, y);

        // Clamp so block fits within grid
        const clampedCol = Math.min(col, GRID_COLUMNS - colSpan);
        const clampedRow = Math.max(0, row);

        // Check if this is a valid placement
        const otherBlocks = blocksRef.current.filter(
          (b) => b.id !== drag.blockId && !stashedRef.current.has(b.id) && b.is_enabled,
        );
        const positions: BioGridPosition[] = otherBlocks.map((b) => ({
          col: b.grid_col,
          row: b.grid_row,
          colSpan: b.grid_col_span,
          rowSpan: b.grid_row_span,
        }));
        const candidate = { col: clampedCol, row: clampedRow, colSpan, rowSpan };
        const valid = isValidPlacement(clampedCol, clampedRow, colSpan, rowSpan) &&
          !checkOverlap(candidate, positions);

        setDropTarget({ col: clampedCol, row: clampedRow, colSpan, rowSpan, valid });
      } else if (drag.kind === 'resize') {
        // Calculate new size based on pointer distance from block origin
        const { col: pointerCol, row: pointerRow } = clientToGrid(x, y);
        const newColSpan = Math.max(1, Math.min(GRID_COLUMNS - drag.origCol, pointerCol - drag.origCol + 1));
        const newRowSpan = Math.max(1, pointerRow - drag.origRow + 1);

        // Validate
        const otherBlocks = blocksRef.current.filter(
          (b) => b.id !== drag.blockId && !stashedRef.current.has(b.id) && b.is_enabled,
        );
        const positions: BioGridPosition[] = otherBlocks.map((b) => ({
          col: b.grid_col,
          row: b.grid_row,
          colSpan: b.grid_col_span,
          rowSpan: b.grid_row_span,
        }));
        const candidate = { col: drag.origCol, row: drag.origRow, colSpan: newColSpan, rowSpan: newRowSpan };
        const valid = isValidPlacement(drag.origCol, drag.origRow, newColSpan, newRowSpan) &&
          !checkOverlap(candidate, positions);

        setDropTarget({
          col: drag.origCol,
          row: drag.origRow,
          colSpan: newColSpan,
          rowSpan: newRowSpan,
          valid,
        });
      }
    },
    [clientToGrid],
  );

  const handleDocPointerUp = useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const isOverStashZone = e.clientY > window.innerHeight - STASH_ZONE_HEIGHT - 60;

      if (drag.kind === 'move' || drag.kind === 'unstash') {
        if (isOverStashZone && drag.kind !== 'unstash') {
          // Stash the block
          setStashedIds((prev) => new Set(prev).add(drag.blockId));
        } else {
          // Try to place at drop target
          const block = blocksRef.current.find((b) => b.id === drag.blockId);
          if (block) {
            const { col, row } = clientToGrid(e.clientX, e.clientY);
            const clampedCol = Math.min(Math.max(0, col), GRID_COLUMNS - block.grid_col_span);
            const clampedRow = Math.max(0, row);

            const otherBlocks = blocksRef.current.filter(
              (b) => b.id !== drag.blockId && !stashedRef.current.has(b.id) && b.is_enabled,
            );
            const positions: BioGridPosition[] = otherBlocks.map((b) => ({
              col: b.grid_col,
              row: b.grid_row,
              colSpan: b.grid_col_span,
              rowSpan: b.grid_row_span,
            }));
            const candidate = {
              col: clampedCol,
              row: clampedRow,
              colSpan: block.grid_col_span,
              rowSpan: block.grid_row_span,
            };
            const valid = isValidPlacement(clampedCol, clampedRow, block.grid_col_span, block.grid_row_span) &&
              !checkOverlap(candidate, positions);

            if (valid) {
              onMoveBlock(drag.blockId, clampedCol, clampedRow);
              // If unstashing, remove from stash
              if (drag.kind === 'unstash') {
                setStashedIds((prev) => {
                  const next = new Set(prev);
                  next.delete(drag.blockId);
                  return next;
                });
              }
            } else {
              // Check if we're over another block — swap positions
              const targetBlock = otherBlocks.find((b) => {
                return (
                  clampedCol >= b.grid_col &&
                  clampedCol < b.grid_col + b.grid_col_span &&
                  clampedRow >= b.grid_row &&
                  clampedRow < b.grid_row + b.grid_row_span
                );
              });
              if (targetBlock) {
                const origCol = block.grid_col;
                const origRow = block.grid_row;
                onMoveBlock(drag.blockId, targetBlock.grid_col, targetBlock.grid_row);
                onMoveBlock(targetBlock.id, origCol, origRow);
                if (drag.kind === 'unstash') {
                  setStashedIds((prev) => {
                    const next = new Set(prev);
                    next.delete(drag.blockId);
                    return next;
                  });
                }
              }
              // else: invalid drop, block stays where it was
            }
          }
        }
      } else if (drag.kind === 'resize') {
        // Apply resize
        const { col: pointerCol, row: pointerRow } = clientToGrid(e.clientX, e.clientY);
        const newColSpan = Math.max(1, Math.min(GRID_COLUMNS - drag.origCol, pointerCol - drag.origCol + 1));
        const newRowSpan = Math.max(1, pointerRow - drag.origRow + 1);

        const otherBlocks = blocksRef.current.filter(
          (b) => b.id !== drag.blockId && !stashedRef.current.has(b.id) && b.is_enabled,
        );
        const positions: BioGridPosition[] = otherBlocks.map((b) => ({
          col: b.grid_col,
          row: b.grid_row,
          colSpan: b.grid_col_span,
          rowSpan: b.grid_row_span,
        }));
        const candidate = { col: drag.origCol, row: drag.origRow, colSpan: newColSpan, rowSpan: newRowSpan };
        const valid = isValidPlacement(drag.origCol, drag.origRow, newColSpan, newRowSpan) &&
          !checkOverlap(candidate, positions);

        if (valid) {
          onResizeBlock(drag.blockId, newColSpan, newRowSpan);
        }
      }

      // Clean up
      dragRef.current = null;
      setDragRender(null);
      setDropTarget(null);
      setOverStash(false);
    },
    [clientToGrid, onMoveBlock, onResizeBlock],
  );

  // Register/unregister document listeners when drag starts/ends
  useEffect(() => {
    if (!dragRender) return;
    document.addEventListener('pointermove', handleDocPointerMove, { passive: false });
    document.addEventListener('pointerup', handleDocPointerUp);
    return () => {
      document.removeEventListener('pointermove', handleDocPointerMove);
      document.removeEventListener('pointerup', handleDocPointerUp);
    };
  }, [dragRender, handleDocPointerMove, handleDocPointerUp]);

  /* ═══════════════════════════════════════════════════════════════════
     Start drag helpers
     ═══════════════════════════════════════════════════════════════════ */

  const startMoveDrag = useCallback((blockId: string, e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const block = blocksRef.current.find((b) => b.id === blockId);
    if (!block) return;

    const info: DragInfo = {
      kind: 'move',
      blockId,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      origCol: block.grid_col,
      origRow: block.grid_row,
      origColSpan: block.grid_col_span,
      origRowSpan: block.grid_row_span,
    };
    dragRef.current = info;
    setDragRender(info);
  }, []);

  const startResizeDrag = useCallback((blockId: string, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const block = blocksRef.current.find((b) => b.id === blockId);
    if (!block) return;

    // Find the block element for dimensions
    const blockEl = gridRef.current?.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement | null;
    const rect = blockEl?.getBoundingClientRect() ?? { left: 0, top: 0, width: 100, height: 60 };

    const info: DragInfo = {
      kind: 'resize',
      blockId,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      offsetX: 0,
      offsetY: 0,
      width: rect.width,
      height: rect.height,
      origCol: block.grid_col,
      origRow: block.grid_row,
      origColSpan: block.grid_col_span,
      origRowSpan: block.grid_row_span,
    };
    dragRef.current = info;
    setDragRender(info);
  }, []);

  const startUnstashDrag = useCallback((blockId: string, e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const block = blocksRef.current.find((b) => b.id === blockId);
    if (!block) return;

    const info: DragInfo = {
      kind: 'unstash',
      blockId,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      width: 120,
      height: 60,
      origCol: block.grid_col,
      origRow: block.grid_row,
      origColSpan: block.grid_col_span,
      origRowSpan: block.grid_row_span,
    };
    dragRef.current = info;
    setDragRender(info);
  }, []);

  /* ═══════════════════════════════════════════════════════════════════
     Layout mode enter/exit
     ═══════════════════════════════════════════════════════════════════ */

  const enterLayoutMode = useCallback(() => {
    setLayoutMode(true);
  }, []);

  const exitLayoutMode = useCallback(() => {
    // Re-place stashed blocks
    const remaining = [...stashedIds];
    if (remaining.length > 0) {
      const currentGrid = blocks.filter((b) => !stashedIds.has(b.id));
      for (const id of remaining) {
        const block = blocks.find((b) => b.id === id);
        if (!block) continue;
        const pos = findNextEmptyPosition(currentGrid, block.grid_col_span, block.grid_row_span);
        onMoveBlock(id, pos.col, pos.row);
        currentGrid.push({ ...block, grid_col: pos.col, grid_row: pos.row });
      }
      setStashedIds(new Set());
    }
    onSavePositions();
    setLayoutMode(false);
    dragRef.current = null;
    setDragRender(null);
    setDropTarget(null);
    setOverStash(false);
  }, [blocks, stashedIds, onMoveBlock, onSavePositions]);

  /* ═══════════════════════════════════════════════════════════════════
     Long-press handling
     ═══════════════════════════════════════════════════════════════════ */

  const handleBlockPointerDown = useCallback(
    (e: React.PointerEvent, blockId: string) => {
      if (!editMode) return;

      // In layout mode, start drag immediately
      if (layoutMode) {
        e.preventDefault();
        startMoveDrag(blockId, e);
        return;
      }

      // Normal mode: start long-press timer
      const x = e.clientX;
      const y = e.clientY;
      longPressRef.current = {
        timer: setTimeout(() => {
          enterLayoutMode();
          longPressRef.current = null;
        }, LONG_PRESS_MS),
        blockId,
        x,
        y,
      };
    },
    [editMode, layoutMode, enterLayoutMode, startMoveDrag],
  );

  const handleBlockPointerMove = useCallback((e: React.PointerEvent) => {
    if (longPressRef.current) {
      const dx = e.clientX - longPressRef.current.x;
      const dy = e.clientY - longPressRef.current.y;
      if (Math.abs(dx) > MOVE_CANCEL_THRESHOLD || Math.abs(dy) > MOVE_CANCEL_THRESHOLD) {
        clearTimeout(longPressRef.current.timer);
        longPressRef.current = null;
      }
    }
  }, []);

  const handleBlockPointerUp = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current.timer);
      longPressRef.current = null;
    }
  }, []);

  /* ─── Unstash via tap (fallback) ─────────────────────────────────── */
  const unstashBlock = useCallback(
    (blockId: string) => {
      const block = blocks.find((b) => b.id === blockId);
      if (!block) return;
      const currentGrid = blocks.filter((b) => !stashedIds.has(b.id));
      const pos = findNextEmptyPosition(currentGrid, block.grid_col_span, block.grid_row_span);
      onMoveBlock(blockId, pos.col, pos.row);
      setStashedIds((prev) => {
        const next = new Set(prev);
        next.delete(blockId);
        return next;
      });
    },
    [blocks, stashedIds, onMoveBlock],
  );

  /* ═══════════════════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════════════════ */

  const visibleBlocks = [...gridBlocks].sort(
    (a, b) => a.grid_row - b.grid_row || a.grid_col - b.grid_col,
  );

  const isDragging = !!dragRender;
  const isMoveDrag = dragRender?.kind === 'move' || dragRender?.kind === 'unstash';
  const isResizeDrag = dragRender?.kind === 'resize';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: INJECTED_CSS }} />

      {/* ─── Layout mode banner ─── */}
      {layoutMode && (
        <div className="sticky top-[45px] z-40 flex items-center justify-between px-4 py-2.5 bg-foreground text-background">
          <span className="text-xs font-semibold tracking-wide uppercase">Rearranging</span>
          <Button
            size="sm"
            variant="outline"
            onClick={exitLayoutMode}
            className="h-7 text-xs bg-background text-foreground hover:bg-background/90 border-background/20"
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            Done
          </Button>
        </div>
      )}

      {/* ─── Canvas ─── */}
      <div
        className="min-h-full flex flex-col items-center"
        style={{
          ...bgStyle,
          color: themeConfig.colors.text,
          fontFamily: `'${themeConfig.fonts.body.family}', sans-serif`,
          touchAction: layoutMode ? 'none' : undefined,
        }}
      >
        {themeConfig.background.overlayCSS && (
          <div
            className="pointer-events-none fixed inset-0 z-0"
            style={{ backgroundImage: themeConfig.background.overlayCSS }}
          />
        )}

        <div
          className="relative w-full max-w-md mx-auto px-4 py-10 flex flex-col items-center"
          style={{ gap: spacingConfig.gap }}
        >
          {/* ─── Header / Contact Card ─── */}
          {!layoutMode ? (
            <button
              type="button"
              onClick={onHeaderTap}
              className={`relative w-full text-left group ${editMode ? '' : 'pointer-events-none'}`}
            >
              {editMode && (
                <div className="absolute -right-1 -top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 shadow-md border border-border opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
                  <Pencil className="h-3.5 w-3.5 text-foreground" />
                </div>
              )}
              {contactCard}
            </button>
          ) : (
            <div className="w-full opacity-50 pointer-events-none">{contactCard}</div>
          )}

          {/* ─── Grid blocks ─── */}
          {contentLayoutMode === 'grid' && visibleBlocks.length > 0 && (
            <div
              ref={gridRef}
              className="w-full relative"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gridAutoRows: `minmax(${GRID_ROW_MIN_HEIGHT}px, auto)`,
                gap: spacingConfig.gap,
              }}
            >
              {/* Drop target indicator */}
              {dropTarget && isMoveDrag && (
                <div
                  className="bio-drop-indicator pointer-events-none"
                  style={{
                    gridColumn: `${dropTarget.col + 1} / span ${dropTarget.colSpan}`,
                    gridRow: `${dropTarget.row + 1} / span ${dropTarget.rowSpan}`,
                    opacity: dropTarget.valid ? 1 : 0.3,
                    borderColor: dropTarget.valid ? undefined : 'hsl(0 80% 50% / 0.5)',
                  }}
                />
              )}

              {/* Resize preview indicator */}
              {dropTarget && isResizeDrag && (
                <div
                  className="bio-drop-indicator pointer-events-none"
                  style={{
                    gridColumn: `${dropTarget.col + 1} / span ${dropTarget.colSpan}`,
                    gridRow: `${dropTarget.row + 1} / span ${dropTarget.rowSpan}`,
                    opacity: dropTarget.valid ? 1 : 0.3,
                    borderColor: dropTarget.valid
                      ? 'hsl(var(--foreground) / 0.5)'
                      : 'hsl(0 80% 50% / 0.5)',
                    background: dropTarget.valid
                      ? 'hsl(var(--foreground) / 0.05)'
                      : 'hsl(0 80% 50% / 0.05)',
                  }}
                />
              )}

              {visibleBlocks.map((block, i) => {
                const isBeingDragged =
                  dragRender?.blockId === block.id && dragRender.kind !== 'resize';
                const isBeingResized =
                  dragRender?.blockId === block.id && dragRender.kind === 'resize';

                return (
                  <div
                    key={block.id}
                    data-block-id={block.id}
                    className={`relative transition-all duration-200 ${
                      layoutMode && !isBeingDragged ? 'bio-wiggle' : ''
                    } ${isBeingDragged ? 'opacity-20 scale-95' : ''} ${
                      isBeingResized ? 'ring-2 ring-foreground/40 rounded-lg' : ''
                    }`}
                    style={{
                      gridColumn: `${block.grid_col + 1} / span ${block.grid_col_span}`,
                      gridRow: `${block.grid_row + 1} / span ${block.grid_row_span}`,
                      minWidth: 0,
                      overflow: 'hidden',
                      animationDelay: layoutMode ? `${(i % 5) * 0.06}s` : undefined,
                    }}
                    onPointerDown={(e) => handleBlockPointerDown(e, block.id)}
                    onPointerMove={layoutMode ? undefined : handleBlockPointerMove}
                    onPointerUp={layoutMode ? undefined : handleBlockPointerUp}
                    onClick={(e) => {
                      if (!layoutMode && editMode && !dragRender) {
                        e.stopPropagation();
                        onBlockTap(block.id);
                      }
                    }}
                  >
                    {/* Edit indicator (normal mode) */}
                    {editMode && !layoutMode && (
                      <div className="absolute -right-1 -top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 shadow-sm border border-border opacity-0 group-hover:opacity-100 [div:active>&]:opacity-100 transition-opacity">
                        <Pencil className="h-3 w-3 text-foreground" />
                      </div>
                    )}

                    {/* Drag grip (layout mode) */}
                    {layoutMode && !isBeingDragged && (
                      <div className="absolute left-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-md bg-foreground/80 shadow-sm">
                        <GripVertical className="h-3.5 w-3.5 text-background" />
                      </div>
                    )}

                    {/* Resize handle (layout mode) */}
                    {layoutMode && !isBeingDragged && (
                      <div
                        className="bio-resize-handle"
                        onPointerDown={(e) => startResizeDrag(block.id, e)}
                      >
                        <Maximize2 className="h-3 w-3" />
                      </div>
                    )}

                    <div
                      className={`h-full ${
                        layoutMode ? 'cursor-grab active:cursor-grabbing' : editMode ? 'cursor-pointer' : ''
                      }`}
                    >
                      <BlockRenderer block={block} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── Legacy links ─── */}
          {contentLayoutMode === 'list' && links.filter((l) => l.is_enabled).length > 0 && (
            <div className="w-full flex flex-col" style={{ gap: spacingConfig.gap }}>
              {links
                .filter((l) => l.is_enabled)
                .map((link) => (
                  <div
                    key={link.id}
                    className="flex w-full items-center justify-center gap-2 text-center text-sm font-medium px-4 py-3 transition-colors"
                    style={{
                      borderRadius: themeConfig.buttonStyle.borderRadius,
                      borderWidth: themeConfig.buttonStyle.borderWidth,
                      borderStyle: 'solid',
                      backgroundColor: themeConfig.colors.buttonBg,
                      color: themeConfig.colors.buttonText,
                      borderColor: themeConfig.colors.buttonBorder,
                      fontFamily: `'${themeConfig.fonts.body.family}', sans-serif`,
                    }}
                  >
                    {link.title}
                  </div>
                ))}
            </div>
          )}

          {/* Empty state */}
          {blocks.length === 0 && links.length === 0 && (
            <p className="text-sm" style={{ color: themeConfig.colors.textSecondary }}>
              Tap + to add your first block
            </p>
          )}
        </div>
      </div>

      {/* ─── Drag ghost (floating) ─── */}
      {dragRender && draggedBlock && isMoveDrag && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: dragRender.currentX - dragRender.offsetX,
            top: dragRender.currentY - dragRender.offsetY,
            width: dragRender.width,
            height: dragRender.height,
            transform: 'scale(1.05) rotate(2deg)',
            opacity: 0.85,
            filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.25))',
          }}
        >
          <div className="h-full w-full overflow-hidden rounded-lg bg-card">
            <BlockRenderer block={draggedBlock} />
          </div>
        </div>
      )}

      {/* ─── Stash drop zone (visible during move drag) ─── */}
      {isMoveDrag && dragRender.kind === 'move' && layoutMode && (
        <div
          className={`fixed z-50 left-4 right-4 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-all duration-200 ${
            overStash
              ? 'border-foreground bg-foreground/10 scale-105'
              : 'border-muted-foreground/40 bg-background/80'
          }`}
          style={{
            bottom: 72,
            height: STASH_ZONE_HEIGHT,
            backdropFilter: 'blur(8px)',
          }}
        >
          <Package
            className={`h-5 w-5 transition-colors ${overStash ? 'text-foreground' : 'text-muted-foreground'}`}
          />
          <span
            className={`text-sm font-medium transition-colors ${overStash ? 'text-foreground' : 'text-muted-foreground'}`}
          >
            {overStash ? 'Release to stash' : 'Drag here to stash'}
          </span>
        </div>
      )}

      {/* ─── Stash content strip ─── */}
      {layoutMode && stashedBlocks.length > 0 && !isDragging && (
        <div className="fixed bottom-[60px] left-0 right-0 z-40 px-4 py-2">
          <div className="flex items-center gap-2 rounded-xl bg-foreground/95 backdrop-blur-sm px-3 py-2 shadow-lg">
            <Package className="h-4 w-4 text-background/70 shrink-0" />
            <span className="text-xs text-background/70 font-medium shrink-0">
              Stash ({stashedBlocks.length})
            </span>
            <div className="flex-1 flex gap-1.5 overflow-x-auto" style={{ touchAction: 'none' }}>
              {stashedBlocks.map((block) => (
                <div
                  key={block.id}
                  className="shrink-0 flex items-center gap-1.5 rounded-lg bg-background/15 px-2.5 py-1.5 text-[11px] font-medium text-background hover:bg-background/25 active:scale-95 transition-all cursor-grab"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    startUnstashDrag(block.id, e);
                  }}
                  onClick={(e) => {
                    // Tap fallback (if no drag occurred)
                    if (!dragRef.current) {
                      e.stopPropagation();
                      unstashBlock(block.id);
                    }
                  }}
                >
                  <GripVertical className="h-3 w-3 text-background/50" />
                  <span className="truncate max-w-[80px]">{getBlockPreviewLabel(block)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Layout mode bottom bar ─── */}
      {layoutMode && !isDragging && stashedBlocks.length === 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm px-4 py-3 safe-area-pb">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Hold &amp; drag to move · Corner to resize</p>
            <Button size="sm" onClick={exitLayoutMode}>
              <Check className="h-3.5 w-3.5 mr-1" />
              Done
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════ */

const BLOCK_LABELS: Record<string, string> = {
  link: 'Link',
  heading: 'Heading',
  text: 'Text',
  image: 'Image',
  social_icons: 'Social',
  divider: 'Divider',
  spacer: 'Spacer',
  spotify_embed: 'Spotify',
  youtube_embed: 'YouTube',
  map: 'Map',
  countdown: 'Timer',
  payment_link: 'Payment',
  gallery: 'Gallery',
  contact_form: 'Contact',
};

function getBlockPreviewLabel(block: BioBlock): string {
  const content = block.content as Record<string, unknown>;
  if (content.title && typeof content.title === 'string') return content.title;
  if (content.text && typeof content.text === 'string') {
    return (content.text as string).slice(0, 20);
  }
  if (content.label && typeof content.label === 'string') return content.label;
  return BLOCK_LABELS[block.block_type] ?? 'Block';
}
