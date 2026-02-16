'use client';

import { Label } from '@/components/ui';
import { BioThemeGallery } from '@/components/bio/bio-theme-gallery';
import { BioFontPicker } from '@/components/bio/bio-font-picker';
import { BioColorCustomizer } from '@/components/bio/bio-color-customizer';
import { BioBackgroundPicker } from '@/components/bio/bio-background-picker';
import { BioBorderRadiusPicker } from '@/components/bio/bio-radius-picker';
import { BioSpacingPicker } from '@/components/bio/bio-spacing-picker';
import { BioAvatarUpload } from '@/components/bio/bio-avatar-upload';
import { BioFaviconUpload } from '@/components/bio/bio-favicon-upload';
import { BioCardLayoutPicker } from '@/components/bio/bio-card-layout-picker';
import { BioContactFields } from '@/components/bio/bio-contact-fields';
import { BioCoverUpload } from '@/components/bio/bio-cover-upload';
import type {
  BioLinkTheme,
  BioSpacing,
  BioBorderRadius,
  BioCardLayout,
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

  // Favicon
  faviconUrl: string | null;
  onFaviconChange: (url: string | null) => void;

  // Card layout
  cardLayout: BioCardLayout | null;
  onCardLayoutChange: (layout: BioCardLayout) => void;

  // Cover image
  coverUrl: string | null;
  onCoverChange: (url: string | null) => void;
  coverAspectRatio: string | null;
  onCoverAspectRatioChange: (ar: string) => void;
  coverPositionY: number | null;
  onCoverPositionYChange: (y: number) => void;

  // Contact info
  subtitle: string;
  company: string;
  jobTitle: string;
  location: string;
  contactEmail: string;
  contactPhone: string;
  contactWebsite: string;
  onContactFieldChange: (field: string, value: string) => void;
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
  faviconUrl,
  onFaviconChange,
  cardLayout,
  onCardLayoutChange,
  coverUrl,
  onCoverChange,
  coverAspectRatio,
  onCoverAspectRatioChange,
  coverPositionY,
  onCoverPositionYChange,
  subtitle,
  company,
  jobTitle,
  location,
  contactEmail,
  contactPhone,
  contactWebsite,
  onContactFieldChange,
}: BioDesignControlsProps) {
  const effectiveLayout = cardLayout ?? 'centered';

  return (
    <div className="space-y-8">
      {/* Profile Image */}
      <section className="space-y-3">
        <Label className="text-sm font-semibold">Profile Image</Label>
        <BioAvatarUpload
          pageId={pageId}
          currentAvatarUrl={avatarUrl}
          onAvatarChange={onAvatarChange}
        />
      </section>

      {/* Card Layout */}
      <section className="space-y-3">
        <Label className="text-sm font-semibold">Card Layout</Label>
        <BioCardLayoutPicker
          value={cardLayout}
          onChange={onCardLayoutChange}
        />
      </section>

      {/* Cover Image — only shown for split/cover layouts */}
      {(effectiveLayout === 'split' || effectiveLayout === 'cover') && (
        <section className="space-y-3">
          <Label className="text-sm font-semibold">Cover Image</Label>
          <BioCoverUpload
            pageId={pageId}
            currentCoverUrl={coverUrl}
            onCoverChange={onCoverChange}
            aspectRatio={coverAspectRatio}
            onAspectRatioChange={onCoverAspectRatioChange}
            positionY={coverPositionY}
            onPositionYChange={onCoverPositionYChange}
          />
        </section>
      )}

      {/* Contact Information */}
      <section className="space-y-3">
        <Label className="text-sm font-semibold">Contact Information</Label>
        <BioContactFields
          subtitle={subtitle}
          company={company}
          jobTitle={jobTitle}
          location={location}
          contactEmail={contactEmail}
          contactPhone={contactPhone}
          contactWebsite={contactWebsite}
          onChange={onContactFieldChange}
        />
      </section>

      {/* Page Favicon */}
      <section className="space-y-3">
        <Label className="text-sm font-semibold">Page Favicon</Label>
        <BioFaviconUpload
          pageId={pageId}
          currentFaviconUrl={faviconUrl}
          onFaviconChange={onFaviconChange}
        />
      </section>

      {/* Theme Selection */}
      <section className="space-y-3">
        <Label className="text-sm font-semibold">Theme</Label>
        <BioThemeGallery value={theme} onChange={onThemeChange} />
      </section>

      {/* Fonts */}
      <section className="space-y-3">
        <Label className="text-sm font-semibold">Fonts</Label>
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
        <Label className="text-sm font-semibold">Custom Colors (optional)</Label>
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
        <Label className="text-sm font-semibold">Background Variant</Label>
        <BioBackgroundPicker
          theme={theme}
          value={backgroundVariant}
          onChange={onBackgroundVariantChange}
        />
      </section>

      {/* Button Shape */}
      <section className="space-y-3">
        <Label className="text-sm font-semibold">Button Shape</Label>
        <BioBorderRadiusPicker
          value={borderRadius}
          onChange={onBorderRadiusChange}
        />
      </section>

      {/* Spacing */}
      <section className="space-y-3">
        <Label className="text-sm font-semibold">Spacing</Label>
        <BioSpacingPicker
          value={spacing}
          onChange={onSpacingChange}
        />
      </section>
    </div>
  );
}
