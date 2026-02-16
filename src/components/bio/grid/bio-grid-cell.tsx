'use client';

import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';

interface BioGridCellProps {
  col: number;
  row: number;
  onAddBlock: (col: number, row: number) => void;
}

export function BioGridCell({ col, row, onAddBlock }: BioGridCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${col}-${row}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        group flex items-center justify-center rounded-sm transition-all duration-150
        ${isOver
          ? 'bg-primary/5 ring-1 ring-primary/20'
          : 'bg-secondary/40 hover:bg-secondary'}
      `}
      style={{
        gridColumn: col + 1,
        gridRow: row + 1,
      }}
      onClick={() => onAddBlock(col, row)}
    >
      <Plus
        className={`h-3.5 w-3.5 transition-all duration-150 ${
          isOver
            ? 'text-foreground opacity-100 scale-110'
            : 'text-muted-foreground opacity-0 group-hover:opacity-60'
        }`}
      />
    </div>
  );
}
