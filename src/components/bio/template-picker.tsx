'use client';

import { useState } from 'react';
import { Check, Plus, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { BIO_TEMPLATES_LIST } from '@/lib/bio/templates';
import type { BioTemplate } from '@/lib/bio/templates';

interface TemplatePickerProps {
  onSelect: (templateId: string | null) => void;
  onClose: () => void;
  isReplace?: boolean;
}

export function TemplatePicker({
  onSelect,
  onClose,
  isReplace = false,
}: TemplatePickerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleContinue = () => {
    onSelect(selectedId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 mx-4 w-full max-w-lg rounded-lg border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">
            {isReplace ? 'Apply Template' : 'Choose a Template'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Warning for replace mode */}
        {isReplace && (
          <div className="mx-6 mt-4 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-600 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>This will replace your current blocks.</span>
          </div>
        )}

        {/* Template grid */}
        <div className="grid grid-cols-2 gap-3 p-6">
          {/* Blank option */}
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className={`group relative flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-6 transition-all hover:scale-[1.02] hover:border-foreground/30 ${
              selectedId === null
                ? 'border-foreground/60 bg-secondary/50'
                : 'border-border'
            }`}
          >
            {selectedId === null && (
              <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-foreground">
                <Check className="h-3 w-3 text-background" />
              </div>
            )}
            <Plus className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-foreground" />
            <span className="text-sm font-medium">Blank</span>
            <span className="text-xs text-muted-foreground">Start from scratch</span>
          </button>

          {/* Template cards */}
          {BIO_TEMPLATES_LIST.map((template: BioTemplate) => (
            <button
              key={template.id}
              type="button"
              onClick={() => setSelectedId(template.id)}
              className={`group relative flex flex-col items-start gap-1 rounded-md border-2 px-4 py-4 text-left transition-all hover:scale-[1.02] hover:border-foreground/30 ${
                selectedId === template.id
                  ? 'border-foreground/60 bg-secondary/50'
                  : 'border-border'
              }`}
            >
              {selectedId === template.id && (
                <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-foreground">
                  <Check className="h-3 w-3 text-background" />
                </div>
              )}
              <span className="text-sm font-semibold">{template.name}</span>
              <span className="text-xs leading-relaxed text-muted-foreground">
                {template.description}
              </span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleContinue}>
            {isReplace ? 'Apply' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}
