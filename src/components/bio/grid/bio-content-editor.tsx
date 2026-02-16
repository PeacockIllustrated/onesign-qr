'use client';

import type { BioBlock, BioLinkItem, BioLayoutMode } from '@/types/bio';
import { BioGridEditor } from './bio-grid-editor';
import { BioLinkEditor } from '@/components/bio/bio-link-editor';

interface BioContentEditorProps {
  layoutMode: BioLayoutMode;
  blocks: BioBlock[];
  links: BioLinkItem[];
  pageId: string;
  onBlocksChange: (blocks: BioBlock[]) => void;
  // Legacy link editor props
  onLinksChange?: (links: BioLinkItem[]) => void;
}

export function BioContentEditor({
  layoutMode,
  blocks,
  links,
  pageId,
  onBlocksChange,
  onLinksChange,
}: BioContentEditorProps) {
  if (layoutMode === 'grid') {
    return (
      <BioGridEditor
        blocks={blocks}
        pageId={pageId}
        onBlocksChange={onBlocksChange}
      />
    );
  }

  // Legacy list mode
  return (
    <BioLinkEditor
      pageId={pageId}
      links={links}
      onLinksChange={onLinksChange ?? (() => {})}
    />
  );
}
