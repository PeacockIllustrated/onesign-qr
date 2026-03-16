'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { LayoutTemplate } from 'lucide-react';
import type { BioBlock, BioBlockType, BioBlockContent } from '@/types/bio';
import { BIO_DEFAULTS } from '@/lib/constants';
import { BIO_TEMPLATES_MAP } from '@/lib/bio/templates';
import type { BioTemplate, BioTemplateBlock } from '@/lib/bio/templates';
import { useGridLayout } from './use-grid-layout';
import { BioBlockToolbar } from './bio-block-toolbar';
import { BioGridCanvas } from './bio-grid-canvas';
import { BioBlockEditPanel } from './bio-block-edit-panel';
import { TemplatePicker } from '@/components/bio/template-picker';

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
    setBlocks,
    addBlock,
    updateBlock,
    deleteBlock,
    moveBlock,
    resizeBlock,
    savePositions,
    saving,
  } = useGridLayout(initialBlocks, pageId);

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
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

  // ─── Apply Template ───────────────────────────────────────────────

  const handleApplyTemplate = useCallback(
    async (templateId: string | null) => {
      setShowTemplatePicker(false);

      if (templateId === null) return; // "Blank" selected — nothing to do

      const template = BIO_TEMPLATES_MAP[templateId];
      if (!template) return;

      setApplyingTemplate(true);
      setSelectedBlockId(null);

      try {
        // 1. Delete all existing blocks
        const persistedBlocks = blocks.filter((b) => !b.id.startsWith('temp-'));
        await Promise.all(
          persistedBlocks.map((b) =>
            fetch(`/api/bio/${pageId}/blocks/${b.id}`, { method: 'DELETE' })
          )
        );

        // 2. Insert template blocks sequentially to preserve order
        const createdBlocks: BioBlock[] = [];
        for (const tb of template.blocks) {
          const res = await fetch(`/api/bio/${pageId}/blocks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              block_type: tb.block_type,
              grid_col: tb.grid_col,
              grid_row: tb.grid_row,
              grid_col_span: tb.grid_col_span,
              grid_row_span: tb.grid_row_span,
              content: tb.content,
              is_enabled: true,
            }),
          });
          if (res.ok) {
            createdBlocks.push(await res.json());
          }
        }

        // 3. Update page settings (theme, layout, fonts, etc.)
        await fetch(`/api/bio/${pageId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            theme: template.theme,
            card_layout: template.card_layout,
            spacing: template.spacing,
            border_radius: template.border_radius,
            font_title: template.font_title,
            font_body: template.font_body,
          }),
        });

        // 4. Update local state with new blocks
        setBlocks(createdBlocks);
      } catch (err) {
        console.error('Failed to apply template:', err);
      } finally {
        setApplyingTemplate(false);
      }
    },
    [blocks, pageId, setBlocks]
  );

  const selectedBlock = selectedBlockId
    ? blocks.find((b) => b.id === selectedBlockId) ?? null
    : null;

  return (
    <div className="flex gap-0">
      {/* Left: toolbar + canvas */}
      <div className="flex flex-1 flex-col gap-4 overflow-auto">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <BioBlockToolbar
              onAddBlock={handleAddBlock}
              blockCount={blocks.length}
              maxBlocks={BIO_DEFAULTS.MAX_BLOCKS_PER_PAGE}
            />
          </div>
          <button
            type="button"
            disabled={applyingTemplate}
            onClick={() => setShowTemplatePicker(true)}
            className="mb-0.5 flex items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-foreground/20 hover:bg-secondary hover:text-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-50"
          >
            <LayoutTemplate className="h-4 w-4" />
            Templates
          </button>
        </div>

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

      {/* Desktop: side panel (slide in) */}
      <div
        className={`hidden md:block overflow-hidden transition-all duration-200 ease-out ${
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

      {/* Mobile: bottom sheet overlay */}
      {selectedBlock && (
        <div className="md:hidden fixed inset-0 z-30">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSelectedBlockId(null)}
            aria-hidden="true"
          />
          {/* Bottom sheet */}
          <div className="absolute bottom-0 left-0 right-0 max-h-[70vh] overflow-y-auto rounded-t-lg border-t border-border bg-card shadow-lg">
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-4 py-3 z-10">
              <span className="text-sm font-medium">Edit Block</span>
              <button
                type="button"
                onClick={() => setSelectedBlockId(null)}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-sm hover:bg-muted transition-colors"
              >
                Done
              </button>
            </div>
            <BioBlockEditPanel
              block={selectedBlock}
              onUpdate={handleUpdateContent}
              onDelete={handleDeleteBlock}
              onToggleEnabled={handleToggleEnabled}
              onClose={() => setSelectedBlockId(null)}
            />
          </div>
        </div>
      )}

      {/* Template picker modal */}
      {showTemplatePicker && (
        <TemplatePicker
          onSelect={handleApplyTemplate}
          onClose={() => setShowTemplatePicker(false)}
          isReplace={blocks.length > 0}
        />
      )}
    </div>
  );
}
