'use client';

import { useCallback, useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import type { BioBlock } from '@/types/bio';
import { BlockRenderer } from './bio-block-renderers';
import { BIO_DEFAULTS } from '@/lib/constants';
import { GRID_COLUMNS } from './grid-utils';

interface BioGridBlockProps {
  block: BioBlock;
  isSelected: boolean;
  onSelect: (blockId: string) => void;
  onResize: (blockId: string, colSpan: number, rowSpan: number) => void;
  gridRef: React.RefObject<HTMLDivElement | null>;
}

export function BioGridBlock({
  block,
  isSelected,
  onSelect,
  onResize,
  gridRef,
}: BioGridBlockProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: block.id,
  });
  const resizing = useRef(false);

  // Real mouse-drag resize: track mouse delta from bottom-right corner
  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      resizing.current = true;

      const startX = e.clientX;
      const startY = e.clientY;
      const startColSpan = block.grid_col_span;
      const startRowSpan = block.grid_row_span;

      // Compute cell size from the live grid
      const grid = gridRef.current;
      if (!grid) return;
      const gridRect = grid.getBoundingClientRect();
      const cellW = (gridRect.width - BIO_DEFAULTS.GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
      const cellH = BIO_DEFAULTS.GRID_ROW_HEIGHT;

      const onPointerMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;

        const colDelta = Math.round(dx / (cellW + BIO_DEFAULTS.GRID_GAP));
        const rowDelta = Math.round(dy / (cellH + BIO_DEFAULTS.GRID_GAP));

        const newColSpan = Math.max(1, Math.min(GRID_COLUMNS - block.grid_col, startColSpan + colDelta));
        const newRowSpan = Math.max(1, Math.min(4, startRowSpan + rowDelta));

        if (newColSpan !== block.grid_col_span || newRowSpan !== block.grid_row_span) {
          onResize(block.id, newColSpan, newRowSpan);
        }
      };

      const onPointerUp = () => {
        resizing.current = false;
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
      };

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
    },
    [block, gridRef, onResize]
  );

  return (
    <div
      ref={setNodeRef}
      className={`
        group relative overflow-hidden rounded-sm border transition-all duration-150
        ${isSelected
          ? 'border-foreground shadow-sm'
          : 'border-border hover:border-foreground/20'}
        ${!block.is_enabled ? 'opacity-40' : ''}
        ${isDragging ? 'z-50 scale-[1.02] opacity-60 shadow-lg' : ''}
      `}
      style={{
        gridColumn: `${block.grid_col + 1} / span ${block.grid_col_span}`,
        gridRow: `${block.grid_row + 1} / span ${block.grid_row_span}`,
        background: '#FFFFFF',
        cursor: isDragging ? 'grabbing' : 'pointer',
      }}
      onClick={(e) => {
        if (resizing.current) return;
        e.stopPropagation();
        onSelect(block.id);
      }}
    >
      {/* Block content — full area */}
      <div className="flex h-full w-full items-center justify-center overflow-hidden p-2">
        <BlockRenderer block={block} />
      </div>

      {/* Drag handle — top-left pill */}
      <div
        className={`
          absolute left-1 top-1 z-10 flex h-5 w-7 cursor-grab items-center justify-center
          rounded-sm bg-secondary text-muted-foreground
          opacity-0 transition-opacity duration-150
          group-hover:opacity-100 active:cursor-grabbing
          ${isSelected ? 'opacity-100' : ''}
        `}
        {...listeners}
        {...attributes}
      >
        <GripVertical className="h-3 w-3" />
      </div>

      {/* Resize handle — bottom-right corner */}
      <div
        className={`
          absolute bottom-0 right-0 z-10 h-4 w-4 cursor-nwse-resize
          opacity-0 transition-opacity duration-150
          group-hover:opacity-100
          ${isSelected ? 'opacity-100' : ''}
        `}
        onPointerDown={handleResizePointerDown}
      >
        <svg
          viewBox="0 0 12 12"
          className="h-full w-full text-muted-foreground"
          fill="none"
        >
          <path
            d="M10 2L2 10M10 6L6 10M10 10L10 10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}
