'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { BioBlock, BioBlockType, BioBlockContent } from '@/types/bio';
import { BIO_DEFAULTS } from '@/lib/constants';
import { useGridLayout } from './use-grid-layout';
import { BioBlockToolbar } from './bio-block-toolbar';
import { BioGridCanvas } from './bio-grid-canvas';
import { BioBlockEditPanel } from './bio-block-edit-panel';

interface BioGridEditorProps {
  blocks: BioBlock[];
  pageId: string;
  onBlocksChange: (blocks: BioBlock[]) => void;
}

export function BioGridEditor({
  blocks: initialBlocks,
  pageId,
  onBlocksChange,
}: BioGridEditorProps) {
  const {
    blocks,
    addBlock,
    updateBlock,
    deleteBlock,
    moveBlock,
    resizeBlock,
    savePositions,
    saving,
  } = useGridLayout(initialBlocks, pageId);

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevBlocksRef = useRef(blocks);

  // Sync blocks back to parent
  useEffect(() => {
    if (blocks !== prevBlocksRef.current) {
      prevBlocksRef.current = blocks;
      onBlocksChange(blocks);
    }
  }, [blocks, onBlocksChange]);

  // Debounced position save
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => savePositions(), 1000);
  }, [savePositions]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // ─── Handlers ──────────────────────────────────────────────────────

  const handleAddBlock = useCallback(
    async (blockType: BioBlockType) => {
      const newBlock = await addBlock(blockType);
      if (newBlock) setSelectedBlockId(newBlock.id);
    },
    [addBlock]
  );

  const handleAddBlockAt = useCallback(
    (_col: number, _row: number) => {
      handleAddBlock('link');
    },
    [handleAddBlock]
  );

  const handleMoveBlock = useCallback(
    (blockId: string, col: number, row: number) => {
      moveBlock(blockId, col, row);
      debouncedSave();
    },
    [moveBlock, debouncedSave]
  );

  const handleResizeBlock = useCallback(
    (blockId: string, colSpan: number, rowSpan: number) => {
      resizeBlock(blockId, colSpan, rowSpan);
      debouncedSave();
    },
    [resizeBlock, debouncedSave]
  );

  const handleUpdateContent = useCallback(
    (content: BioBlockContent) => {
      if (!selectedBlockId) return;
      updateBlock(selectedBlockId, { content });
    },
    [selectedBlockId, updateBlock]
  );

  const handleDeleteBlock = useCallback(() => {
    if (!selectedBlockId) return;
    deleteBlock(selectedBlockId);
    setSelectedBlockId(null);
  }, [selectedBlockId, deleteBlock]);

  const handleToggleEnabled = useCallback(() => {
    if (!selectedBlockId) return;
    const block = blocks.find((b) => b.id === selectedBlockId);
    if (!block) return;
    updateBlock(selectedBlockId, { is_enabled: !block.is_enabled });
  }, [selectedBlockId, blocks, updateBlock]);

  const selectedBlock = selectedBlockId
    ? blocks.find((b) => b.id === selectedBlockId) ?? null
    : null;

  return (
    <div className="flex gap-0">
      {/* Left: toolbar + canvas */}
      <div className="flex flex-1 flex-col gap-4 overflow-auto">
        <BioBlockToolbar
          onAddBlock={handleAddBlock}
          blockCount={blocks.length}
          maxBlocks={BIO_DEFAULTS.MAX_BLOCKS_PER_PAGE}
        />

        <BioGridCanvas
          blocks={blocks}
          selectedBlockId={selectedBlockId}
          onSelectBlock={setSelectedBlockId}
          onMoveBlock={handleMoveBlock}
          onResizeBlock={handleResizeBlock}
          onAddBlockAt={handleAddBlockAt}
        />

        {/* Save indicator */}
        <div
          className={`flex items-center gap-2 px-1 transition-opacity duration-300 ${
            saving ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground" />
          <span className="text-xs text-muted-foreground">saving...</span>
        </div>
      </div>

      {/* Right: edit panel (slide in) */}
      <div
        className={`overflow-hidden transition-all duration-200 ease-out ${
          selectedBlock ? 'w-80 opacity-100' : 'w-0 opacity-0'
        }`}
      >
        {selectedBlock && (
          <BioBlockEditPanel
            block={selectedBlock}
            onUpdate={handleUpdateContent}
            onDelete={handleDeleteBlock}
            onToggleEnabled={handleToggleEnabled}
            onClose={() => setSelectedBlockId(null)}
          />
        )}
      </div>
    </div>
  );
}
