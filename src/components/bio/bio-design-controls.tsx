'use client';

import { Label } from '@/components/ui';
import { BioThemeGallery } from '@/components/bio/bio-theme-gallery';
import { BioFontPicker } from '@/components/bio/bio-font-picker';
import { BioColorCustomizer } from '@/components/bio/bio-color-customizer';
import { BioBackgroundPicker } from '@/components/bio/bio-background-picker';
import { BioBorderRadiusPicker } from '@/components/bio/bio-radius-picker';
import { BioSpacingPicker } from '@/components/bio/bio-spacing-picker';
import { BioAvatarUpload } from '@/components/bio/bio-avatar-upload';
import type {
  BioLinkTheme,
  BioSpacing,
  BioBorderRadius,
} from '@/types/bio';

interface BioDesignControlsProps {
  // Theme
  theme: BioLinkTheme;
  onThemeChange: (theme: BioLinkTheme) => void;

  // Fonts
  fontTitle: string;
  fontBody: string;
  onFontTitleChange: (family: string) => void;
  onFontBodyChange: (family: string) => void;

  // Colors
  customBgColor: string | null;
  customTextColor: string | null;
  customAccentColor: string | null;
  onBgColorChange: (color: string | null) => void;
  onTextColorChange: (color: string | null) => void;
  onAccentColorChange: (color: string | null) => void;

  // Background variant
  backgroundVariant: string | null;
  onBackgroundVariantChange: (variant: string | null) => void;

  // Border radius
  borderRadius: BioBorderRadius | null;
  onBorderRadiusChange: (radius: BioBorderRadius | null) => void;

  // Spacing
  spacing: BioSpacing | null;
  onSpacingChange: (spacing: BioSpacing | null) => void;

  // Avatar
  pageId: string;
  avatarUrl: string | null;
  onAvatarChange: (url: string | null) => void;
}

export function BioDesignControls({
  theme,
  onThemeChange,
  fontTitle,
  fontBody,
  onFontTitleChange,
  onFontBodyChange,
  customBgColor,
  customTextColor,
  customAccentColor,
  onBgColorChange,
  onTextColorChange,
  onAccentColorChange,
  backgroundVariant,
  onBackgroundVariantChange,
  borderRadius,
  onBorderRadiusChange,
  spacing,
  onSpacingChange,
  pageId,
  avatarUrl,
  onAvatarChange,
}: BioDesignControlsProps) {
  return (
    <div className="space-y-8">
      {/* Profile Image */}
      <section className="space-y-3">
        <Label className="text-sm font-semibold">profile image</Label>
        <BioAvatarUpload
          pageId={pageId}
          currentAvatarUrl={avatarUrl}
          onAvatarChange={onAvatarChange}
        />
      </section>

      {/* Theme Selection */}
      <section className="space-y-3">
        <Label className="text-sm font-semibold">theme</Label>
        <BioThemeGallery value={theme} onChange={onThemeChange} />
      </section>

      {/* Fonts */}
      <section className="space-y-3">
        <Label className="text-sm font-semibold">fonts</Label>
        <div className="grid gap-4 sm:grid-cols-2">
          <BioFontPicker
            label="Title font"
            value={fontTitle}
            onChange={onFontTitleChange}
          />
          <BioFontPicker
            label="Body font"
            value={fontBody}
            onChange={onFontBodyChange}
          />
        </div>
      </section>

      {/* Custom Colors */}
      <section className="space-y-3">
        <Label className="text-sm font-semibold">custom colors (optional)</Label>
        <BioColorCustomizer
          bgColor={customBgColor}
          textColor={customTextColor}
          accentColor={customAccentColor}
          onBgChange={onBgColorChange}
          onTextChange={onTextColorChange}
          onAccentChange={onAccentColorChange}
        />
      </section>

      {/* Background Variant */}
      <section className="space-y-3">
        <Label className="text-sm font-semibold">background variant</Label>
        <BioBackgroundPicker
          theme={theme}
          value={backgroundVariant}
          onChange={onBackgroundVariantChange}
        />
      </section>

      {/* Button Shape */}
      <section className="space-y-3">
        <Label className="text-sm font-semibold">button shape</Label>
        <BioBorderRadiusPicker
          value={borderRadius}
          onChange={onBorderRadiusChange}
        />
      </section>

      {/* Spacing */}
      <section className="space-y-3">
        <Label className="text-sm font-semibold">spacing</Label>
        <BioSpacingPicker
          value={spacing}
          onChange={onSpacingChange}
        />
      </section>
    </div>
  );
}
