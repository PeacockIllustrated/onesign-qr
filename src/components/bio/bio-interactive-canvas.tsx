'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Pencil, Package, Check, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui';
import { BlockRenderer } from '@/components/bio/grid/bio-block-renderers';
import { findNextEmptyPosition, GRID_COLUMNS } from '@/components/bio/grid/grid-utils';
import type {
  BioBlock,
  BioLinkItem,
  BioLayoutMode,
  BioCardLayout,
  BioLinkPage,
  BioThemeConfig,
} from '@/types/bio';

/* ═══════════════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════════════ */

const LONG_PRESS_MS = 500;
const MOVE_CANCEL_THRESHOLD = 10; // px before cancelling long-press (scrolling)
const STASH_ZONE_HEIGHT = 72; // px from bottom of viewport

/* ═══════════════════════════════════════════════════════════════════════
   Wiggle animation (injected once via <style>)
   ═══════════════════════════════════════════════════════════════════════ */

const WIGGLE_CSS = `
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
`;

/* ═══════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════ */

interface DragState {
  blockId: string;
  /** Pointer position at start */
  startX: number;
  startY: number;
  /** Current pointer position */
  currentX: number;
  currentY: number;
  /** Offset from block top-left to pointer */
  offsetX: number;
  offsetY: number;
  /** Block dimensions for rendering the floating ghost */
  width: number;
  height: number;
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
  /** Called when blocks are repositioned during layout mode */
  onMoveBlock: (blockId: string, col: number, row: number) => void;
  /** Called when "Done" is pressed to persist positions */
  onSavePositions: () => void;
  /** Tells parent whether layout mode is active (hides floating bar) */
  onLayoutModeChange?: (active: boolean) => void;
  /** Contact card component */
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
  onSavePositions,
  onLayoutModeChange,
  contactCard,
}: BioInteractiveCanvasProps) {
  // ─── Layout mode state ─────────────────────────────────────────────
  const [layoutMode, setLayoutMode] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [stashedIds, setStashedIds] = useState<Set<string>>(new Set());
  const [hoverTarget, setHoverTarget] = useState<string | null>(null); // block being hovered
  const [overStash, setOverStash] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);
  const longPressRef = useRef<{
    timer: ReturnType<typeof setTimeout>;
    blockId: string;
    x: number;
    y: number;
    el: HTMLElement;
  } | null>(null);

  // ─── Derived ───────────────────────────────────────────────────────
  const gridBlocks = useMemo(
    () => blocks.filter((b) => b.is_enabled && !stashedIds.has(b.id)),
    [blocks, stashedIds]
  );
  const stashedBlocks = useMemo(
    () => blocks.filter((b) => stashedIds.has(b.id)),
    [blocks, stashedIds]
  );
  const draggedBlock = dragState ? blocks.find((b) => b.id === dragState.blockId) ?? null : null;

  // ─── Notify parent of layout mode changes ─────────────────────────
  useEffect(() => {
    onLayoutModeChange?.(layoutMode);
  }, [layoutMode, onLayoutModeChange]);

  // ─── Cleanup long-press timer on unmount ──────────────────────────
  useEffect(() => {
    return () => {
      if (longPressRef.current) clearTimeout(longPressRef.current.timer);
    };
  }, []);

  // ─── Enter layout mode ─────────────────────────────────────────────
  const enterLayoutMode = useCallback(() => {
    setLayoutMode(true);
  }, []);

  const exitLayoutMode = useCallback(() => {
    // Re-place any stashed blocks
    const remaining = [...stashedIds];
    if (remaining.length > 0) {
      const currentGrid = blocks.filter((b) => !stashedIds.has(b.id));
      for (const id of remaining) {
        const block = blocks.find((b) => b.id === id);
        if (!block) continue;
        const pos = findNextEmptyPosition(currentGrid, block.grid_col_span, block.grid_row_span);
        onMoveBlock(id, pos.col, pos.row);
        // Add to currentGrid so next placement doesn't overlap
        currentGrid.push({ ...block, grid_col: pos.col, grid_row: pos.row });
      }
      setStashedIds(new Set());
    }
    onSavePositions();
    setLayoutMode(false);
    setDragState(null);
    setHoverTarget(null);
    setOverStash(false);
  }, [blocks, stashedIds, onMoveBlock, onSavePositions]);

  // ─── Long-press handling ───────────────────────────────────────────

  const handleBlockPointerDown = useCallback((e: React.PointerEvent, blockId: string) => {
    if (!editMode) return;

    // In layout mode, start drag immediately
    if (layoutMode) {
      e.preventDefault();
      startDrag(blockId, e);
      return;
    }

    // In normal mode, start long-press timer
    const x = e.clientX;
    const y = e.clientY;
    const el = e.currentTarget as HTMLElement;

    longPressRef.current = {
      timer: setTimeout(() => {
        enterLayoutMode();
        longPressRef.current = null;
      }, LONG_PRESS_MS),
      blockId,
      x,
      y,
      el,
    };
  }, [editMode, layoutMode, enterLayoutMode]);

  const handleBlockPointerMove = useCallback((e: React.PointerEvent) => {
    // Cancel long-press if finger moved too much
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

  // ─── Drag handling ─────────────────────────────────────────────────

  const startDrag = useCallback((blockId: string, e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();

    setDragState({
      blockId,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    });

    // Capture pointer for smooth tracking
    el.setPointerCapture(e.pointerId);
  }, []);

  const handleDragMove = useCallback((e: React.PointerEvent) => {
    if (!dragState) return;
    e.preventDefault();

    const x = e.clientX;
    const y = e.clientY;

    setDragState((prev) => prev ? { ...prev, currentX: x, currentY: y } : null);

    // Check if over stash zone
    const isOverStashZone = y > window.innerHeight - STASH_ZONE_HEIGHT - 60; // 60px for floating bar
    setOverStash(isOverStashZone);

    if (!isOverStashZone && gridRef.current) {
      // Check which block we're hovering over
      const gridRect = gridRef.current.getBoundingClientRect();
      const relX = x - gridRect.left;
      const relY = y - gridRect.top;
      const cellWidth = gridRect.width / GRID_COLUMNS;

      // Find which block is at this position
      let found: string | null = null;
      for (const block of gridBlocks) {
        if (block.id === dragState.blockId) continue;
        const bLeft = block.grid_col * cellWidth;
        const bRight = (block.grid_col + block.grid_col_span) * cellWidth;
        // Approximate row height from grid element
        const rowHeight = gridRef.current.clientHeight / Math.max(getMaxGridRow(gridBlocks), 1);
        const bTop = block.grid_row * rowHeight;
        const bBottom = (block.grid_row + block.grid_row_span) * rowHeight;
        if (relX >= bLeft && relX <= bRight && relY >= bTop && relY <= bBottom) {
          found = block.id;
          break;
        }
      }
      setHoverTarget(found);
    } else {
      setHoverTarget(null);
    }
  }, [dragState, gridBlocks]);

  const handleDragEnd = useCallback((e: React.PointerEvent) => {
    if (!dragState) return;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);

    if (overStash) {
      // Stash the block
      setStashedIds((prev) => new Set(prev).add(dragState.blockId));
    } else if (hoverTarget) {
      // Swap positions with the hover target
      const draggedB = blocks.find((b) => b.id === dragState.blockId);
      const targetB = blocks.find((b) => b.id === hoverTarget);
      if (draggedB && targetB) {
        onMoveBlock(dragState.blockId, targetB.grid_col, targetB.grid_row);
        onMoveBlock(hoverTarget, draggedB.grid_col, draggedB.grid_row);
      }
    }

    setDragState(null);
    setHoverTarget(null);
    setOverStash(false);
  }, [dragState, overStash, hoverTarget, blocks, onMoveBlock]);

  // ─── Unstash a block ───────────────────────────────────────────────
  const unstashBlock = useCallback((blockId: string) => {
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
  }, [blocks, stashedIds, onMoveBlock]);

  // ─── Render ────────────────────────────────────────────────────────

  const visibleBlocks = gridBlocks.sort(
    (a, b) => a.grid_row - b.grid_row || a.grid_col - b.grid_col
  );

  return (
    <>
      {/* Inject wiggle CSS */}
      <style dangerouslySetInnerHTML={{ __html: WIGGLE_CSS }} />

      {/* ─── Layout mode banner ─── */}
      {layoutMode && (
        <div className="sticky top-[45px] z-40 flex items-center justify-between px-4 py-2.5 bg-foreground text-background">
          <span className="text-xs font-semibold tracking-wide uppercase">
            Rearranging
          </span>
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
        {/* Background overlay */}
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
            <div className="w-full opacity-50 pointer-events-none">
              {contactCard}
            </div>
          )}

          {/* ─── Grid blocks ─── */}
          {contentLayoutMode === 'grid' && visibleBlocks.length > 0 && (
            <div
              ref={gridRef}
              className="w-full"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gridAutoRows: 'minmax(60px, auto)',
                gap: spacingConfig.gap,
              }}
            >
              {visibleBlocks.map((block, i) => {
                const isDragging = dragState?.blockId === block.id;
                const isSwapTarget = hoverTarget === block.id;

                return (
                  <div
                    key={block.id}
                    className={`relative transition-all duration-200 ${
                      layoutMode ? 'bio-wiggle' : ''
                    } ${isDragging ? 'opacity-30 scale-95' : ''} ${
                      isSwapTarget ? 'ring-2 ring-foreground/50 ring-offset-2 rounded-lg scale-[1.02]' : ''
                    }`}
                    style={{
                      gridColumn: `${block.grid_col + 1} / span ${block.grid_col_span}`,
                      gridRow: `${block.grid_row + 1} / span ${block.grid_row_span}`,
                      minWidth: 0,
                      overflow: 'hidden',
                      animationDelay: layoutMode ? `${(i % 5) * 0.06}s` : undefined,
                    }}
                    onPointerDown={(e) => handleBlockPointerDown(e, block.id)}
                    onPointerMove={layoutMode ? handleDragMove : handleBlockPointerMove}
                    onPointerUp={layoutMode ? handleDragEnd : handleBlockPointerUp}
                    onClick={(e) => {
                      if (!layoutMode && editMode) {
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
                    {layoutMode && !isDragging && (
                      <div className="absolute left-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-md bg-foreground/80 shadow-sm">
                        <GripVertical className="h-3.5 w-3.5 text-background" />
                      </div>
                    )}

                    <div className={`h-full ${layoutMode ? 'cursor-grab active:cursor-grabbing' : editMode ? 'cursor-pointer' : ''}`}>
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
              {links.filter((l) => l.is_enabled).map((link) => (
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

      {/* ─── Drag overlay (floating ghost) ─── */}
      {dragState && draggedBlock && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: dragState.currentX - dragState.offsetX,
            top: dragState.currentY - dragState.offsetY,
            width: dragState.width,
            height: dragState.height,
            transform: 'scale(1.05) rotate(2deg)',
            opacity: 0.85,
            filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.25))',
            transition: 'transform 0.1s ease-out',
          }}
        >
          <div className="h-full w-full overflow-hidden rounded-lg bg-card">
            <BlockRenderer block={draggedBlock} />
          </div>
        </div>
      )}

      {/* ─── Stash drop zone (only visible during drag) ─── */}
      {dragState && layoutMode && (
        <div
          className={`fixed z-50 left-4 right-4 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-all duration-200 ${
            overStash
              ? 'border-foreground bg-foreground/10 scale-105'
              : 'border-muted-foreground/40 bg-background/80'
          }`}
          style={{
            bottom: 72, // above floating bar area
            height: STASH_ZONE_HEIGHT,
            backdropFilter: 'blur(8px)',
          }}
        >
          <Package className={`h-5 w-5 transition-colors ${overStash ? 'text-foreground' : 'text-muted-foreground'}`} />
          <span className={`text-sm font-medium transition-colors ${overStash ? 'text-foreground' : 'text-muted-foreground'}`}>
            {overStash ? 'Release to stash' : 'Drag here to stash'}
          </span>
        </div>
      )}

      {/* ─── Stash content strip (when stash has items) ─── */}
      {layoutMode && stashedBlocks.length > 0 && !dragState && (
        <div className="fixed bottom-[60px] left-0 right-0 z-40 px-4 py-2">
          <div className="flex items-center gap-2 rounded-xl bg-foreground/95 backdrop-blur-sm px-3 py-2 shadow-lg">
            <Package className="h-4 w-4 text-background/70 shrink-0" />
            <span className="text-xs text-background/70 font-medium shrink-0">
              Stash ({stashedBlocks.length})
            </span>
            <div className="flex-1 flex gap-1.5 overflow-x-auto">
              {stashedBlocks.map((block) => (
                <button
                  key={block.id}
                  type="button"
                  onClick={() => unstashBlock(block.id)}
                  className="shrink-0 flex items-center gap-1.5 rounded-lg bg-background/15 px-2.5 py-1.5 text-[11px] font-medium text-background hover:bg-background/25 active:scale-95 transition-all"
                >
                  <span className="truncate max-w-[80px]">
                    {getBlockPreviewLabel(block)}
                  </span>
                  <span className="text-background/50 text-[9px]">tap to return</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Layout mode bottom bar (replaces floating bar) ─── */}
      {layoutMode && !dragState && stashedBlocks.length === 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm px-4 py-3 safe-area-pb">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Hold &amp; drag to reorder blocks
            </p>
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

function getMaxGridRow(blocks: BioBlock[]): number {
  let max = 0;
  for (const b of blocks) {
    const end = b.grid_row + b.grid_row_span;
    if (end > max) max = end;
  }
  return max;
}

const BLOCK_LABELS: Record<string, string> = {
  link: 'Link', heading: 'Heading', text: 'Text', image: 'Image',
  social_icons: 'Social', divider: 'Divider', spacer: 'Spacer',
  spotify_embed: 'Spotify', youtube_embed: 'YouTube', map: 'Map',
  countdown: 'Timer', payment_link: 'Payment', gallery: 'Gallery',
  contact_form: 'Contact',
};

function getBlockPreviewLabel(block: BioBlock): string {
  const content = block.content as Record<string, unknown>;
  // Try to get a meaningful label from content
  if (content.title && typeof content.title === 'string') return content.title;
  if (content.text && typeof content.text === 'string') {
    return (content.text as string).slice(0, 20);
  }
  if (content.label && typeof content.label === 'string') return content.label;
  return BLOCK_LABELS[block.block_type] ?? 'Block';
}
