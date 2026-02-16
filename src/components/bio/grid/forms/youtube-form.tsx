'use client';

import type { BioBlockContentYouTubeEmbed } from '@/types/bio';

interface YouTubeFormProps {
  content: BioBlockContentYouTubeEmbed;
  onChange: (content: BioBlockContentYouTubeEmbed) => void;
}

export function YouTubeForm({ content, onChange }: YouTubeFormProps) {
  return (
    <div className="space-y-3">
      {/* Video URL */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          YouTube URL
        </label>
        <input
          type="url"
          value={content.video_url}
          onChange={(e) =>
            onChange({ ...content, video_url: e.target.value })
          }
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
    </div>
  );
}
