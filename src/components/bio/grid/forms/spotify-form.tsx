'use client';

import type { BioBlockContentSpotifyEmbed } from '@/types/bio';

interface SpotifyFormProps {
  content: BioBlockContentSpotifyEmbed;
  onChange: (content: BioBlockContentSpotifyEmbed) => void;
}

export function SpotifyForm({ content, onChange }: SpotifyFormProps) {
  return (
    <div className="space-y-3">
      {/* Spotify URL */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Spotify URL
        </label>
        <input
          type="url"
          value={content.spotify_url}
          onChange={(e) =>
            onChange({ ...content, spotify_url: e.target.value })
          }
          placeholder="https://open.spotify.com/track/..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Embed Type */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Embed type
        </label>
        <select
          value={content.embed_type}
          onChange={(e) =>
            onChange({
              ...content,
              embed_type: e.target.value as BioBlockContentSpotifyEmbed['embed_type'],
            })
          }
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="track">Track</option>
          <option value="album">Album</option>
          <option value="playlist">Playlist</option>
          <option value="artist">Artist</option>
        </select>
      </div>
    </div>
  );
}
