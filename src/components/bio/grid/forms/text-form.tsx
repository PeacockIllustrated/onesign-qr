'use client';

import { Bold, Italic, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import type { BioBlockContentText } from '@/types/bio';

interface TextFormProps {
  content: BioBlockContentText;
  onChange: (content: BioBlockContentText) => void;
}

export function TextForm({ content, onChange }: TextFormProps) {
  const maxLength = 500;
  const charCount = content.text.length;
  const align = content.align ?? 'left';

  return (
    <div className="space-y-3">
      {/* Text */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Text
        </label>
        <textarea
          value={content.text}
          onChange={(e) =>
            onChange({
              ...content,
              text: e.target.value.slice(0, maxLength),
            })
          }
          placeholder="Enter your text..."
          rows={4}
          maxLength={maxLength}
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <div className="mt-1 text-right text-xs text-muted-foreground">
          {charCount}/{maxLength}
        </div>
      </div>

      {/* Formatting */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Formatting
        </label>
        <div className="flex items-center gap-1">
          {/* Bold */}
          <button
            type="button"
            onClick={() => onChange({ ...content, bold: !content.bold })}
            className={`flex h-8 w-8 items-center justify-center rounded-sm transition-colors ${
              content.bold
                ? 'bg-foreground text-background'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>

          {/* Italic */}
          <button
            type="button"
            onClick={() => onChange({ ...content, italic: !content.italic })}
            className={`flex h-8 w-8 items-center justify-center rounded-sm transition-colors ${
              content.italic
                ? 'bg-foreground text-background'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>

          {/* Separator */}
          <div className="mx-1 h-5 w-px bg-border" />

          {/* Align Left */}
          <button
            type="button"
            onClick={() => onChange({ ...content, align: 'left' })}
            className={`flex h-8 w-8 items-center justify-center rounded-sm transition-colors ${
              align === 'left'
                ? 'bg-foreground text-background'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
            title="Align left"
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </button>

          {/* Align Center */}
          <button
            type="button"
            onClick={() => onChange({ ...content, align: 'center' })}
            className={`flex h-8 w-8 items-center justify-center rounded-sm transition-colors ${
              align === 'center'
                ? 'bg-foreground text-background'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
            title="Align center"
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </button>

          {/* Align Right */}
          <button
            type="button"
            onClick={() => onChange({ ...content, align: 'right' })}
            className={`flex h-8 w-8 items-center justify-center rounded-sm transition-colors ${
              align === 'right'
                ? 'bg-foreground text-background'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
            title="Align right"
          >
            <AlignRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
