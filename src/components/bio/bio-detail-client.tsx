'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ExternalLink,
  Copy,
  Eye,
  Link2,
  BarChart3,
  Paintbrush,
  ChevronRight,
  X,
  Loader2,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  useToast,
} from '@/components/ui';
import { BioDesignControls } from '@/components/bio/bio-design-controls';
import { BioPreviewPanel } from '@/components/bio/bio-preview-panel';
import { BioContentEditor } from '@/components/bio/grid/bio-content-editor';
import { BioAnalyticsPanel } from '@/components/bio/bio-analytics-panel';
import { PreviewModeToggle, PREVIEW_WIDTHS } from '@/components/bio/preview-mode-toggle';
import type { PreviewMode } from '@/components/bio/preview-mode-toggle';
import { THEME_CONFIGS } from '@/lib/bio/theme-definitions';
import { formatNumber } from '@/lib/utils';
import type {
  BioLinkPage,
  BioLinkItem,
  BioBlock,
  BioLinkTheme,
  BioLayoutMode,
  BioSpacing,
  BioBorderRadius,
  BioCardLayout,
} from '@/types/bio';

interface BioDetailClientProps {
  page: BioLinkPage;
  items: BioLinkItem[];
  blocks?: BioBlock[];
}

export function BioDetailClient({ page, items, blocks: initialBlocks = [] }: BioDetailClientProps) {
  const router = useRouter();
  const { addToast } = useToast();

  // Links & blocks
  const [links, setLinks] = useState<BioLinkItem[]>(items);
  const [blocks, setBlocks] = useState<BioBlock[]>(initialBlocks);
  const layoutMode: BioLayoutMode = page.layout_mode ?? (initialBlocks.length > 0 ? 'grid' : 'list');

  // Theme
  const [theme, setTheme] = useState<BioLinkTheme>(page.theme);
  const [customBgColor, setCustomBgColor] = useState<string | null>(page.custom_bg_color);
  const [customTextColor, setCustomTextColor] = useState<string | null>(page.custom_text_color);
  const [customAccentColor, setCustomAccentColor] = useState<string | null>(page.custom_accent_color);

  const themeDefaults = THEME_CONFIGS[page.theme] ?? THEME_CONFIGS.minimal;
  const [fontTitle, setFontTitle] = useState<string>(page.font_title ?? themeDefaults.fonts.title.family);
  const [fontBody, setFontBody] = useState<string>(page.font_body ?? themeDefaults.fonts.body.family);
  const [borderRadius, setBorderRadius] = useState<BioBorderRadius | null>(page.border_radius);
  const [spacing, setSpacing] = useState<BioSpacing | null>(page.spacing);
  const [backgroundVariant, setBackgroundVariant] = useState<string | null>(page.background_variant);

  // Media
  const buildStorageUrl = (path: string | null) =>
    path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/bio-avatars/${path}` : null;
  const [avatarUrl, setAvatarUrl] = useState<string | null>(buildStorageUrl(page.avatar_storage_path));
  const [faviconUrl, setFaviconUrl] = useState<string | null>(buildStorageUrl(page.favicon_storage_path));
  const [coverUrl, setCoverUrl] = useState<string | null>(buildStorageUrl(page.cover_storage_path));

  // Card layout & contact
  const [cardLayout, setCardLayout] = useState<BioCardLayout | null>(page.card_layout);
  const [coverAspectRatio, setCoverAspectRatio] = useState<string | null>(page.cover_aspect_ratio);
  const [coverPositionY, setCoverPositionY] = useState<number | null>(page.cover_position_y);
  const [subtitle, setSubtitle] = useState<string>(page.subtitle ?? '');
  const [company, setCompany] = useState<string>(page.company ?? '');
  const [jobTitle, setJobTitle] = useState<string>(page.job_title ?? '');
  const [location, setLocation] = useState<string>(page.location ?? '');
  const [contactEmail, setContactEmail] = useState<string>(page.contact_email ?? '');
  const [contactPhone, setContactPhone] = useState<string>(page.contact_phone ?? '');
  const [contactWebsite, setContactWebsite] = useState<string>(page.contact_website ?? '');

  // UI
  const [isUpdating, setIsUpdating] = useState(false);
  const [stylePanelOpen, setStylePanelOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');

  const pageUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/p/${page.slug}`;

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    addToast({ title: 'Copied to clipboard', variant: 'success' });
  };

  const handleContactFieldChange = (field: string, value: string) => {
    switch (field) {
      case 'subtitle': setSubtitle(value); break;
      case 'company': setCompany(value); break;
      case 'jobTitle': setJobTitle(value); break;
      case 'location': setLocation(value); break;
      case 'contactEmail': setContactEmail(value); break;
      case 'contactPhone': setContactPhone(value); break;
      case 'contactWebsite': setContactWebsite(value); break;
    }
  };

  const handleThemeChange = (newTheme: BioLinkTheme) => {
    const newDefaults = THEME_CONFIGS[newTheme] ?? THEME_CONFIGS.minimal;
    const oldDefaults = THEME_CONFIGS[theme] ?? THEME_CONFIGS.minimal;
    setTheme(newTheme);
    if (fontTitle === oldDefaults.fonts.title.family) setFontTitle(newDefaults.fonts.title.family);
    if (fontBody === oldDefaults.fonts.body.family) setFontBody(newDefaults.fonts.body.family);
    setBackgroundVariant(null);
  };

  const updateAppearance = async () => {
    setIsUpdating(true);
    try {
      const currentDefaults = THEME_CONFIGS[theme] ?? THEME_CONFIGS.minimal;
      const fontTitleOverride = fontTitle !== currentDefaults.fonts.title.family ? fontTitle : null;
      const fontBodyOverride = fontBody !== currentDefaults.fonts.body.family ? fontBody : null;

      const res = await fetch(`/api/bio/${page.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme,
          custom_bg_color: customBgColor,
          custom_text_color: customTextColor,
          custom_accent_color: customAccentColor,
          font_title: fontTitleOverride,
          font_body: fontBodyOverride,
          border_radius: borderRadius,
          spacing,
          background_variant: backgroundVariant,
          card_layout: cardLayout,
          subtitle: subtitle || null,
          company: company || null,
          job_title: jobTitle || null,
          location: location || null,
          contact_email: contactEmail || null,
          contact_phone: contactPhone || null,
          contact_website: contactWebsite || null,
          cover_aspect_ratio: coverAspectRatio,
          cover_position_y: coverPositionY,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      addToast({ title: 'Saved', variant: 'success' });
      router.refresh();
    } catch (error: any) {
      addToast({ title: 'Failed to save', description: error.message, variant: 'error' });
    } finally {
      setIsUpdating(false);
    }
  };

  const previewPanel = (
    <BioPreviewPanel
      title={page.title}
      bio={page.bio}
      theme={theme}
      customBgColor={customBgColor}
      customTextColor={customTextColor}
      customAccentColor={customAccentColor}
      fontTitle={fontTitle}
      fontBody={fontBody}
      borderRadius={borderRadius}
      spacing={spacing}
      backgroundVariant={backgroundVariant}
      avatarUrl={avatarUrl}
      links={links}
      layoutMode={layoutMode}
      blocks={blocks}
      cardLayout={cardLayout}
      coverUrl={coverUrl}
      subtitle={subtitle}
      company={company}
      jobTitle={jobTitle}
      location={location}
      contactEmail={contactEmail}
      contactPhone={contactPhone}
      contactWebsite={contactWebsite}
      coverAspectRatio={coverAspectRatio}
      coverPositionY={coverPositionY}
    />
  );

  return (
    <div className="space-y-4">
      {/* ─── Compact Header Bar ─── */}
      <Card>
        <CardContent className="py-3 px-4 flex flex-wrap items-center gap-3">
          <Badge variant={page.is_active ? 'success' : 'secondary'} className="shrink-0">
            {page.is_active ? 'live' : 'draft'}
          </Badge>

          <button
            type="button"
            onClick={() => copyToClipboard(pageUrl)}
            className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors truncate min-w-0"
            title="Copy URL"
          >
            <Link2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">/p/{page.slug}</span>
            <Copy className="h-3 w-3 shrink-0 opacity-50" />
          </button>

          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="h-3.5 w-3.5" />
            {formatNumber(page.total_views)}
          </span>

          <div className="flex items-center gap-2 ml-auto">
            {page.is_active && (
              <a href={pageUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  view live
                </Button>
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── Main Tabs ─── */}
      <Tabs defaultValue="design">
        <TabsList>
          <TabsTrigger value="design">
            <Paintbrush className="h-3.5 w-3.5 mr-1.5" />
            design
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
            analytics
          </TabsTrigger>
        </TabsList>

        {/* ─── Design Tab: Content + Style + Preview ─── */}
        <TabsContent value="design" className="min-h-[500px]">
          <div className="flex gap-6">
            {/* Left: Content editor + collapsible style panel */}
            <div className="flex-1 min-w-0">
              {/* Style toggle bar */}
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStylePanelOpen(!stylePanelOpen)}
                  className="gap-2"
                >
                  <Paintbrush className="h-3.5 w-3.5" />
                  {stylePanelOpen ? 'hide style' : 'style & profile'}
                  <ChevronRight className={`h-3.5 w-3.5 transition-transform ${stylePanelOpen ? 'rotate-180' : ''}`} />
                </Button>

                {stylePanelOpen && (
                  <Button size="sm" onClick={updateAppearance} disabled={isUpdating}>
                    {isUpdating ? (
                      <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />saving...</>
                    ) : (
                      'save style'
                    )}
                  </Button>
                )}
              </div>

              {/* Collapsible Style Panel */}
              {stylePanelOpen && (
                <Card className="mb-6">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-sm">style & profile</h3>
                      <button
                        type="button"
                        onClick={() => setStylePanelOpen(false)}
                        className="p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <BioDesignControls
                      theme={theme}
                      onThemeChange={handleThemeChange}
                      fontTitle={fontTitle}
                      fontBody={fontBody}
                      onFontTitleChange={setFontTitle}
                      onFontBodyChange={setFontBody}
                      customBgColor={customBgColor}
                      customTextColor={customTextColor}
                      customAccentColor={customAccentColor}
                      onBgColorChange={setCustomBgColor}
                      onTextColorChange={setCustomTextColor}
                      onAccentColorChange={setCustomAccentColor}
                      backgroundVariant={backgroundVariant}
                      onBackgroundVariantChange={setBackgroundVariant}
                      borderRadius={borderRadius}
                      onBorderRadiusChange={setBorderRadius}
                      spacing={spacing}
                      onSpacingChange={setSpacing}
                      pageId={page.id}
                      avatarUrl={avatarUrl}
                      onAvatarChange={(url) => { setAvatarUrl(url); router.refresh(); }}
                      faviconUrl={faviconUrl}
                      onFaviconChange={(url) => { setFaviconUrl(url); router.refresh(); }}
                      cardLayout={cardLayout}
                      onCardLayoutChange={setCardLayout}
                      coverUrl={coverUrl}
                      onCoverChange={(url) => { setCoverUrl(url); router.refresh(); }}
                      coverAspectRatio={coverAspectRatio}
                      onCoverAspectRatioChange={setCoverAspectRatio}
                      coverPositionY={coverPositionY}
                      onCoverPositionYChange={setCoverPositionY}
                      subtitle={subtitle}
                      company={company}
                      jobTitle={jobTitle}
                      location={location}
                      contactEmail={contactEmail}
                      contactPhone={contactPhone}
                      contactWebsite={contactWebsite}
                      onContactFieldChange={handleContactFieldChange}
                    />
                    <div className="pt-6">
                      <Button onClick={updateAppearance} disabled={isUpdating} className="w-full sm:w-auto">
                        {isUpdating ? (
                          <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />saving...</>
                        ) : (
                          'save style'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Content Editor (blocks / links) */}
              <BioContentEditor
                layoutMode={layoutMode}
                blocks={blocks}
                links={links}
                pageId={page.id}
                onBlocksChange={setBlocks}
                onLinksChange={setLinks}
              />
            </div>

            {/* Right: Live preview (desktop, sticky) */}
            <div className="hidden xl:block w-[320px] shrink-0">
              <div className="sticky top-6">
                <div className="mb-3 flex justify-center">
                  <PreviewModeToggle mode={previewMode} onChange={setPreviewMode} />
                </div>
                <div
                  className="mx-auto transition-all duration-200"
                  style={{ maxWidth: PREVIEW_WIDTHS[previewMode] }}
                >
                  {previewPanel}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ─── Analytics Tab ─── */}
        <TabsContent value="analytics">
          <BioAnalyticsPanel pageId={page.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
