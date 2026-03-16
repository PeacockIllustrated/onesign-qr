'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { Button } from '@/components/ui';
import { PreviewModeToggle, PREVIEW_WIDTHS } from '@/components/bio/preview-mode-toggle';
import type { PreviewMode } from '@/components/bio/preview-mode-toggle';

interface BioEditorLayoutProps {
  controls: React.ReactNode;
  preview: React.ReactNode;
}

export function BioEditorLayout({ controls, preview }: BioEditorLayoutProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[1fr_340px] lg:gap-6">
      {/* Mobile preview toggle */}
      <div className="lg:hidden mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPreviewOpen(!previewOpen)}
          className="w-full flex items-center justify-center gap-2"
        >
          <Eye className="h-4 w-4" />
          {previewOpen ? 'Hide Preview' : 'Show Preview'}
          {previewOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        {previewOpen && (
          <div className="mt-4 flex flex-col items-center gap-3">
            <PreviewModeToggle mode={previewMode} onChange={setPreviewMode} />
            <div
              className="mx-auto transition-all duration-200"
              style={{ maxWidth: PREVIEW_WIDTHS[previewMode] }}
            >
              {preview}
            </div>
          </div>
        )}
      </div>

      {/* Controls panel (left, scrollable) */}
      <div className="space-y-6 min-w-0">
        {controls}
      </div>

      {/* Preview panel (right, sticky on desktop) */}
      <div className="hidden lg:block">
        <div className="sticky top-6">
          <div className="mb-3 flex justify-center">
            <PreviewModeToggle mode={previewMode} onChange={setPreviewMode} />
          </div>
          <div
            className="mx-auto transition-all duration-200"
            style={{ maxWidth: PREVIEW_WIDTHS[previewMode] }}
          >
            {preview}
          </div>
        </div>
      </div>
    </div>
  );
}
