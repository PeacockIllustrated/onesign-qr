'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ExternalLink,
  Copy,
  Eye,
  BarChart3,
  Link2,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Label,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  useToast,
} from '@/components/ui';
import { BioEditorLayout } from '@/components/bio/bio-editor-layout';
import { BioDesignControls } from '@/components/bio/bio-design-controls';
import { BioPreviewPanel } from '@/components/bio/bio-preview-panel';
import { BioContentEditor } from '@/components/bio/grid/bio-content-editor';
import { THEME_CONFIGS } from '@/lib/bio/theme-definitions';
import { formatDate, formatNumber } from '@/lib/utils';
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

  // Links state
  const [links, setLinks] = useState<BioLinkItem[]>(items);

  // Blocks state (grid mode)
  const [blocks, setBlocks] = useState<BioBlock[]>(initialBlocks);
  const layoutMode: BioLayoutMode = page.layout_mode ?? (initialBlocks.length > 0 ? 'grid' : 'list');

  // Theme state
  const [theme, setTheme] = useState<BioLinkTheme>(page.theme);

  // Color overrides
  const [customBgColor, setCustomBgColor] = useState<string | null>(
    page.custom_bg_color
  );
  const [customTextColor, setCustomTextColor] = useState<string | null>(
    page.custom_text_color
  );
  const [customAccentColor, setCustomAccentColor] = useState<string | null>(
    page.custom_accent_color
  );

  // Font overrides (default to theme's fonts)
  const themeDefaults = THEME_CONFIGS[page.theme] ?? THEME_CONFIGS.minimal;
  const [fontTitle, setFontTitle] = useState<string>(
    page.font_title ?? themeDefaults.fonts.title.family
  );
  const [fontBody, setFontBody] = useState<string>(
    page.font_body ?? themeDefaults.fonts.body.family
  );

  // Layout overrides
  const [borderRadius, setBorderRadius] = useState<BioBorderRadius | null>(
    page.border_radius
  );
  const [spacing, setSpacing] = useState<BioSpacing | null>(page.spacing);
  const [backgroundVariant, setBackgroundVariant] = useState<string | null>(
    page.background_variant
  );

  const [isUpdating, setIsUpdating] = useState(false);

  // Avatar state
  const buildAvatarUrl = (path: string | null) =>
    path
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/bio-avatars/${path}`
      : null;
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    buildAvatarUrl(page.avatar_storage_path)
  );

  // Favicon state
  const [faviconUrl, setFaviconUrl] = useState<string | null>(
    page.favicon_storage_path
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/bio-avatars/${page.favicon_storage_path}`
      : null
  );

  // Card layout & contact info state
  const [cardLayout, setCardLayout] = useState<BioCardLayout | null>(
    page.card_layout
  );
  const [coverUrl, setCoverUrl] = useState<string | null>(
    page.cover_storage_path
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/bio-avatars/${page.cover_storage_path}`
      : null
  );
  const [coverAspectRatio, setCoverAspectRatio] = useState<string | null>(
    page.cover_aspect_ratio
  );
  const [coverPositionY, setCoverPositionY] = useState<number | null>(
    page.cover_position_y
  );
  const [subtitle, setSubtitle] = useState<string>(page.subtitle ?? '');
  const [company, setCompany] = useState<string>(page.company ?? '');
  const [jobTitle, setJobTitle] = useState<string>(page.job_title ?? '');
  const [location, setLocation] = useState<string>(page.location ?? '');
  const [contactEmail, setContactEmail] = useState<string>(
    page.contact_email ?? ''
  );
  const [contactPhone, setContactPhone] = useState<string>(
    page.contact_phone ?? ''
  );
  const [contactWebsite, setContactWebsite] = useState<string>(
    page.contact_website ?? ''
  );

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

  const pageUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/p/${page.slug}`;

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    addToast({ title: 'Copied to clipboard', variant: 'success' });
  };

  // When theme changes, also update font defaults if user hasn't overridden them
  const handleThemeChange = (newTheme: BioLinkTheme) => {
    const newDefaults = THEME_CONFIGS[newTheme] ?? THEME_CONFIGS.minimal;
    const oldDefaults = THEME_CONFIGS[theme] ?? THEME_CONFIGS.minimal;

    setTheme(newTheme);

    // If fonts match old theme defaults, update to new theme defaults
    if (fontTitle === oldDefaults.fonts.title.family) {
      setFontTitle(newDefaults.fonts.title.family);
    }
    if (fontBody === oldDefaults.fonts.body.family) {
      setFontBody(newDefaults.fonts.body.family);
    }

    // Reset background variant when switching themes
    setBackgroundVariant(null);
  };

  const updateAppearance = async () => {
    setIsUpdating(true);
    try {
      // Determine if fonts are custom or theme defaults
      const currentDefaults = THEME_CONFIGS[theme] ?? THEME_CONFIGS.minimal;
      const fontTitleOverride =
        fontTitle !== currentDefaults.fonts.title.family ? fontTitle : null;
      const fontBodyOverride =
        fontBody !== currentDefaults.fonts.body.family ? fontBody : null;

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
        throw new Error(data.error || 'Failed to update appearance');
      }

      addToast({ title: 'Appearance updated', variant: 'success' });
      router.refresh();
    } catch (error: any) {
      addToast({
        title: 'Failed to update',
        description: error.message,
        variant: 'error',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">overview</TabsTrigger>
        <TabsTrigger value="content">content</TabsTrigger>
        <TabsTrigger value="appearance">appearance</TabsTrigger>
        <TabsTrigger value="analytics">analytics</TabsTrigger>
      </TabsList>

      {/* Overview Tab */}
      <TabsContent value="overview">
        <Card>
          <CardContent className="pt-6 space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label>title</Label>
              <p className="font-medium">{page.title}</p>
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Label>slug</Label>
              <div className="flex gap-2">
                <Input
                  value={`/p/${page.slug}`}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(`/p/${page.slug}`)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Page URL */}
            <div className="space-y-2">
              <Label>page url</Label>
              <div className="flex gap-2">
                <Input
                  value={pageUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(pageUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <a
                  href={pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="icon">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this URL with your audience
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">total views</p>
                <p className="font-medium flex items-center gap-1.5">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  {formatNumber(page.total_views)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">created</p>
                <p className="font-medium">{formatDate(page.created_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Content Tab */}
      <TabsContent value="content" className="min-h-[500px]">
        <BioContentEditor
          layoutMode={layoutMode}
          blocks={blocks}
          links={links}
          pageId={page.id}
          onBlocksChange={setBlocks}
          onLinksChange={setLinks}
        />
      </TabsContent>

      {/* Appearance Tab — Split-screen editor */}
      <TabsContent value="appearance">
        <BioEditorLayout
          controls={
            <>
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
                onAvatarChange={(url) => {
                  setAvatarUrl(url);
                  router.refresh();
                }}
                faviconUrl={faviconUrl}
                onFaviconChange={(url) => {
                  setFaviconUrl(url);
                  router.refresh();
                }}
                cardLayout={cardLayout}
                onCardLayoutChange={setCardLayout}
                coverUrl={coverUrl}
                onCoverChange={(url) => {
                  setCoverUrl(url);
                  router.refresh();
                }}
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
              <div className="pt-4">
                <Button onClick={updateAppearance} disabled={isUpdating} className="w-full sm:w-auto">
                  {isUpdating ? 'saving...' : 'save appearance'}
                </Button>
              </div>
            </>
          }
          preview={
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
          }
        />
      </TabsContent>

      {/* Analytics Tab */}
      <TabsContent value="analytics">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Analytics coming soon</p>
              <p className="text-sm mt-2">
                Total views: {formatNumber(page.total_views)}
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
