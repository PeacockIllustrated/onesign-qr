'use client';

import { useState, useCallback } from 'react';
import type { BioBlock, BioBlockType } from '@/types/bio';
import {
  findNextEmptyPosition,
  getDefaultContent,
  getDefaultSize,
  checkOverlap,
  isValidPlacement,
  GRID_COLUMNS,
} from './grid-utils';

export function useGridLayout(initialBlocks: BioBlock[], pageId: string) {
  const [blocks, setBlocks] = useState<BioBlock[]>(initialBlocks);
  const [saving, setSaving] = useState(false);

  // ─── Add Block ──────────────────────────────────────────────────────

  const addBlock = useCallback(
    async (blockType: BioBlockType): Promise<BioBlock | null> => {
      const { colSpan, rowSpan } = getDefaultSize(blockType);
      const { col, row } = findNextEmptyPosition(blocks, colSpan, rowSpan, GRID_COLUMNS);
      const content = getDefaultContent(blockType);

      // Optimistic placeholder
      const tempId = `temp-${Date.now()}`;
      const optimisticBlock: BioBlock = {
        id: tempId,
        page_id: pageId,
        block_type: blockType,
        grid_col: col,
        grid_row: row,
        grid_col_span: colSpan,
        grid_row_span: rowSpan,
        content,
        sort_order: blocks.length,
        is_enabled: true,
        total_clicks: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as BioBlock;

      setBlocks((prev) => [...prev, optimisticBlock]);

      try {
        const res = await fetch(`/api/bio/${pageId}/blocks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            block_type: blockType,
            grid_col: col,
            grid_row: row,
            grid_col_span: colSpan,
            grid_row_span: rowSpan,
            content,
            is_enabled: true,
          }),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          let err: Record<string, unknown> = {};
          try { err = JSON.parse(errText); } catch { /* not JSON */ }
          console.error('Failed to create block:', res.status, err.error || err.details || errText);
          // Revert optimistic add
          setBlocks((prev) => prev.filter((b) => b.id !== tempId));
          return null;
        }

        const created: BioBlock = await res.json();

        // Replace optimistic placeholder with real block
        setBlocks((prev) =>
          prev.map((b) => (b.id === tempId ? created : b))
        );

        return created;
      } catch (error) {
        console.error('Failed to create block:', error);
        setBlocks((prev) => prev.filter((b) => b.id !== tempId));
        return null;
      }
    },
    [blocks, pageId]
  );

  // ─── Update Block ───────────────────────────────────────────────────

  const updateBlock = useCallback(
    async (blockId: string, updates: Partial<BioBlock>): Promise<void> => {
      const previous = blocks.find((b) => b.id === blockId);
      if (!previous) return;

      // Optimistic update
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === blockId ? { ...b, ...updates, updated_at: new Date().toISOString() } : b
        )
      );

      try {
        const res = await fetch(`/api/bio/${pageId}/blocks/${blockId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          let err: Record<string, unknown> = {};
          try { err = JSON.parse(errText); } catch { /* not JSON */ }
          console.error('Failed to update block:', res.status, err.error || err.details || errText);
          // Revert optimistic update
          setBlocks((prev) =>
            prev.map((b) => (b.id === blockId ? previous : b))
          );
        }
      } catch (error) {
        console.error('Failed to update block:', error);
        setBlocks((prev) =>
          prev.map((b) => (b.id === blockId ? previous : b))
        );
      }
    },
    [blocks, pageId]
  );

  // ─── Delete Block ───────────────────────────────────────────────────

  const deleteBlock = useCallback(
    async (blockId: string): Promise<void> => {
      const previous = blocks.find((b) => b.id === blockId);
      if (!previous) return;

      // Optimistic removal
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));

      try {
        const res = await fetch(`/api/bio/${pageId}/blocks/${blockId}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          let err: Record<string, unknown> = {};
          try { err = JSON.parse(errText); } catch { /* not JSON */ }
          console.error('Failed to delete block:', res.status, err.error || err.details || errText);
          // Revert optimistic removal
          setBlocks((prev) => [...prev, previous]);
        }
      } catch (error) {
        console.error('Failed to delete block:', error);
        setBlocks((prev) => [...prev, previous]);
      }
    },
    [blocks, pageId]
  );

  // ─── Move Block (local / optimistic only) ──────────────────────────

  const moveBlock = useCallback(
    (blockId: string, col: number, row: number): void => {
      setBlocks((prev) => {
        const blockIndex = prev.findIndex((b) => b.id === blockId);
        if (blockIndex === -1) return prev;

        const block = prev[blockIndex];
        const colSpan = block.grid_col_span;
        const rowSpan = block.grid_row_span;

        // Validate placement is within grid bounds
        if (!isValidPlacement(col, row, colSpan, rowSpan, GRID_COLUMNS)) {
          return prev;
        }

        // Check overlap against other blocks
        const positions = prev.map((b) => ({
          col: b.grid_col,
          row: b.grid_row,
          colSpan: b.grid_col_span,
          rowSpan: b.grid_row_span,
        }));

        const candidate = { col, row, colSpan, rowSpan };
        if (checkOverlap(candidate, positions, blockIndex)) {
          return prev;
        }

        return prev.map((b) =>
          b.id === blockId
            ? { ...b, grid_col: col, grid_row: row, updated_at: new Date().toISOString() }
            : b
        );
      });
    },
    []
  );

  // ─── Resize Block (local / optimistic only) ────────────────────────

  const resizeBlock = useCallback(
    (blockId: string, colSpan: number, rowSpan: number): void => {
      setBlocks((prev) => {
        const blockIndex = prev.findIndex((b) => b.id === blockId);
        if (blockIndex === -1) return prev;

        const block = prev[blockIndex];

        // Validate placement is within grid bounds with new size
        if (!isValidPlacement(block.grid_col, block.grid_row, colSpan, rowSpan, GRID_COLUMNS)) {
          return prev;
        }

        // Check overlap with new size against other blocks
        const positions = prev.map((b) => ({
          col: b.grid_col,
          row: b.grid_row,
          colSpan: b.grid_col_span,
          rowSpan: b.grid_row_span,
        }));

        const candidate = { col: block.grid_col, row: block.grid_row, colSpan, rowSpan };
        if (checkOverlap(candidate, positions, blockIndex)) {
          return prev;
        }

        return prev.map((b) =>
          b.id === blockId
            ? {
                ...b,
                grid_col_span: colSpan,
                grid_row_span: rowSpan,
                updated_at: new Date().toISOString(),
              }
            : b
        );
      });
    },
    []
  );

  // ─── Batch Save Positions ──────────────────────────────────────────

  const savePositions = useCallback(async (): Promise<void> => {
    setSaving(true);

    // Filter out optimistic (temp) blocks that haven't been persisted yet
    const persistedBlocks = blocks.filter((b) => !b.id.startsWith('temp-'));
    if (persistedBlocks.length === 0) {
      setSaving(false);
      return;
    }

    const payload = {
      blocks: persistedBlocks.map((b) => ({
        id: b.id,
        grid_col: b.grid_col,
        grid_row: b.grid_row,
        grid_col_span: b.grid_col_span,
        grid_row_span: b.grid_row_span,
        sort_order: b.sort_order,
      })),
    };

    try {
      const res = await fetch(`/api/bio/${pageId}/blocks/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.error('Failed to save positions:', res.status, errText);
      }
    } catch (error) {
      console.error('Failed to save positions:', error);
    } finally {
      setSaving(false);
    }
  }, [blocks, pageId]);

  // ─── Return ────────────────────────────────────────────────────────

  return {
    blocks,
    setBlocks,
    addBlock,
    updateBlock,
    deleteBlock,
    moveBlock,
    resizeBlock,
    savePositions,
    saving,
  };
}
