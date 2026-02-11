'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

interface BioEditorLayoutProps {
  controls: React.ReactNode;
  preview: React.ReactNode;
}

export function BioEditorLayout({ controls, preview }: BioEditorLayoutProps) {
  const [previewOpen, setPreviewOpen] = useState(false);

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
          <div className="mt-4 flex justify-center">
            {preview}
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
          {preview}
        </div>
      </div>
    </div>
  );
}
