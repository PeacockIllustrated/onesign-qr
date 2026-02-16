'use client';

import { useRef, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import type { DragEndEvent } from '@dnd-kit/core';
import type { BioBlock } from '@/types/bio';
import { BIO_DEFAULTS } from '@/lib/constants';
import { GRID_COLUMNS } from './grid-utils';
import { BioGridBlock } from './bio-grid-block';
import { BioGridCell } from './bio-grid-cell';
import { BlockRenderer } from './bio-block-renderers';

interface BioGridCanvasProps {
  blocks: BioBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string | null) => void;
  onMoveBlock: (blockId: string, col: number, row: number) => void;
  onResizeBlock: (blockId: string, colSpan: number, rowSpan: number) => void;
  onAddBlockAt: (col: number, row: number) => void;
}

export function BioGridCanvas({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onMoveBlock,
  onResizeBlock,
  onAddBlockAt,
}: BioGridCanvasProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  // Compute the number of rows to display (at least 4)
  const maxRow = useMemo(() => {
    let max = 0;
    for (const b of blocks) {
      const end = b.grid_row + b.grid_row_span;
      if (end > max) max = end;
    }
    return max;
  }, [blocks]);

  const totalRows = Math.max(maxRow + 2, 4);

  // Empty cells = all grid positions not covered by a block
  const emptyCells = useMemo(() => {
    const occupied = new Set<string>();
    for (const b of blocks) {
      for (let c = b.grid_col; c < b.grid_col + b.grid_col_span; c++) {
        for (let r = b.grid_row; r < b.grid_row + b.grid_row_span; r++) {
          occupied.add(`${c}-${r}`);
        }
      }
    }
    const cells: { col: number; row: number }[] = [];
    for (let r = 0; r < totalRows; r++) {
      for (let c = 0; c < GRID_COLUMNS; c++) {
        if (!occupied.has(`${c}-${r}`)) {
          cells.push({ col: c, row: r });
        }
      }
    }
    return cells;
  }, [blocks, totalRows]);

  // Handle drag end → snap to nearest cell
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta } = event;
      const blockId = active.id as string;
      const block = blocks.find((b) => b.id === blockId);
      if (!block || !gridRef.current) return;

      const gridRect = gridRef.current.getBoundingClientRect();
      const cellW =
        (gridRect.width - BIO_DEFAULTS.GRID_GAP * (GRID_COLUMNS - 1)) /
        GRID_COLUMNS;
      const cellH = BIO_DEFAULTS.GRID_ROW_HEIGHT;

      const colDelta = Math.round(delta.x / (cellW + BIO_DEFAULTS.GRID_GAP));
      const rowDelta = Math.round(delta.y / (cellH + BIO_DEFAULTS.GRID_GAP));

      const newCol = Math.max(
        0,
        Math.min(GRID_COLUMNS - block.grid_col_span, block.grid_col + colDelta)
      );
      const newRow = Math.max(0, block.grid_row + rowDelta);

      if (newCol !== block.grid_col || newRow !== block.grid_row) {
        onMoveBlock(blockId, newCol, newRow);
      }
    },
    [blocks, onMoveBlock]
  );

  return (
    <DndContext
      sensors={sensors}
      modifiers={[restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <div
        className="rounded-sm border border-border bg-card p-3"
        onClick={() => onSelectBlock(null)}
      >
        <div
          ref={gridRef}
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${GRID_COLUMNS}, 1fr)`,
            gridAutoRows: `${BIO_DEFAULTS.GRID_ROW_HEIGHT}px`,
            gap: `${BIO_DEFAULTS.GRID_GAP}px`,
          }}
        >
          {/* Empty cells behind blocks */}
          {emptyCells.map(({ col, row }) => (
            <BioGridCell
              key={`empty-${col}-${row}`}
              col={col}
              row={row}
              onAddBlock={onAddBlockAt}
            />
          ))}

          {/* Blocks */}
          {blocks.map((block) => (
            <BioGridBlock
              key={block.id}
              block={block}
              isSelected={block.id === selectedBlockId}
              onSelect={onSelectBlock}
              onResize={onResizeBlock}
              gridRef={gridRef}
            />
          ))}
        </div>
      </div>

      {/* Drag overlay — ghost of dragged block */}
      <DragOverlay dropAnimation={null}>
        {/* no overlay content — block moves in-place */}
      </DragOverlay>
    </DndContext>
  );
}
