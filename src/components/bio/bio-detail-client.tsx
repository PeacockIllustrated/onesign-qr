'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { preconnect } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Paintbrush,
  Eye,
  EyeOff,
  MoreHorizontal,
  Copy,
  ExternalLink,
  Link2,
  BarChart3,
  Loader2,
  Pencil,
  LayoutTemplate,
  ChevronLeft,
  Move,
} from 'lucide-react';
import Link from 'next/link';
import {
  Button,
  Badge,
  Card,
  CardContent,
  BottomSheet,
  useToast,
} from '@/components/ui';
import { BioDesignControls } from '@/components/bio/bio-design-controls';
import { BioPreviewPanel } from '@/components/bio/bio-preview-panel';
import { BioInteractiveCanvas } from '@/components/bio/bio-interactive-canvas';
import { BioBlockToolbar } from '@/components/bio/grid/bio-block-toolbar';
import { BioBlockEditPanel } from '@/components/bio/grid/bio-block-edit-panel';
import { BioGridCanvas } from '@/components/bio/grid/bio-grid-canvas';
import { BioAnalyticsPanel } from '@/components/bio/bio-analytics-panel';
import { TemplatePicker } from '@/components/bio/template-picker';
import { useGridLayout } from '@/components/bio/grid/use-grid-layout';
import { BlockRenderer } from '@/components/bio/grid/bio-block-renderers';
import { BioLinkEditor } from '@/components/bio/bio-link-editor';
import {
  resolveFullThemeConfig,
  buildGoogleFontsUrl,
  SPACING_MAP,
  THEME_CONFIGS,
} from '@/lib/bio/theme-definitions';
import { BIO_DEFAULTS } from '@/lib/constants';
import { formatNumber } from '@/lib/utils';
import type {
  BioLinkPage,
  BioLinkItem,
  BioBlock,
  BioBlockType,
  BioBlockContent,
  BioLinkTheme,
  BioLayoutMode,
  BioSpacing,
  BioBorderRadius,
  BioCardLayout,
} from '@/types/bio';

/* ═══════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════ */

type SheetView = 'none' | 'block-edit' | 'add-block' | 'style' | 'analytics' | 'more';

interface BioDetailClientProps {
  page: BioLinkPage;
  items: BioLinkItem[];
  blocks?: BioBlock[];
}

/* ═══════════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════════ */

export function BioDetailClient({ page, items, blocks: initialBlocks = [] }: BioDetailClientProps) {
  const router = useRouter();
  const { addToast } = useToast();

  // ─── Layout mode ────────────────────────────────────────────────────
  const layoutMode: BioLayoutMode = page.layout_mode ?? (initialBlocks.length > 0 ? 'grid' : 'list');

  // ─── Links (legacy list mode) ──────────────────────────────────────
  const [links, setLinks] = useState<BioLinkItem[]>(items);

  // ─── Grid blocks (via hook) ────────────────────────────────────────
  const {
    blocks,
    setBlocks,
    addBlock,
    updateBlock,
    deleteBlock,
    moveBlock,
    resizeBlock,
    savePositions,
    saving,
  } = useGridLayout(initialBlocks, page.id);

  // ─── Theme state ───────────────────────────────────────────────────
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

  // ─── Media ─────────────────────────────────────────────────────────
  const buildStorageUrl = (path: string | null) =>
    path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/bio-avatars/${path}` : null;
  const [avatarUrl, setAvatarUrl] = useState<string | null>(buildStorageUrl(page.avatar_storage_path));
  const [faviconUrl, setFaviconUrl] = useState<string | null>(buildStorageUrl(page.favicon_storage_path));
  const [coverUrl, setCoverUrl] = useState<string | null>(buildStorageUrl(page.cover_storage_path));

  // ─── Card layout & contact ─────────────────────────────────────────
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

  // ─── UI state ──────────────────────────────────────────────────────
  const [activeSheet, setActiveSheet] = useState<SheetView>('none');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(true); // edit indicators on/off
  const [isUpdating, setIsUpdating] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [mobileLayoutMode, setMobileLayoutMode] = useState(false);
  const [desktopRearranging, setDesktopRearranging] = useState(false);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/p/${page.slug}`;

  // ─── Derived ───────────────────────────────────────────────────────
  const selectedBlock = selectedBlockId ? blocks.find((b) => b.id === selectedBlockId) ?? null : null;
  const themeConfig = resolveFullThemeConfig(theme, {
    custom_bg_color: customBgColor,
    custom_text_color: customTextColor,
    custom_accent_color: customAccentColor,
    font_title: fontTitle,
    font_body: fontBody,
    border_radius: borderRadius,
    spacing,
    background_variant: backgroundVariant,
  });
  const spacingConfig = SPACING_MAP[themeConfig.spacing];
  const googleFontsUrl = buildGoogleFontsUrl(themeConfig);

  // ─── Google Fonts — React 19 preconnect + precedence hoists to <head> ──
  if (googleFontsUrl) {
    preconnect('https://fonts.googleapis.com');
    preconnect('https://fonts.gstatic.com', { crossOrigin: 'anonymous' });
  }

  // ─── Handlers ──────────────────────────────────────────────────────

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    addToast({ title: 'Copied to clipboard', variant: 'success' });
  };

  const openBlockEditor = (blockId: string) => {
    setSelectedBlockId(blockId);
    setActiveSheet('block-edit');
  };

  const closeSheet = () => {
    setActiveSheet('none');
    setSelectedBlockId(null);
  };

  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => savePositions(), 1000);
  }, [savePositions]);

  useEffect(() => {
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, []);

  const handleAddBlock = useCallback(async (blockType: BioBlockType) => {
    const newBlock = await addBlock(blockType);
    if (newBlock) {
      setSelectedBlockId(newBlock.id);
      setActiveSheet('block-edit');
    }
  }, [addBlock]);

  const handleUpdateContent = useCallback((content: BioBlockContent) => {
    if (!selectedBlockId) return;
    updateBlock(selectedBlockId, { content });
  }, [selectedBlockId, updateBlock]);

  const handleDeleteBlock = useCallback(() => {
    if (!selectedBlockId) return;
    deleteBlock(selectedBlockId);
    closeSheet();
  }, [selectedBlockId, deleteBlock]);

  const handleToggleEnabled = useCallback(() => {
    if (!selectedBlockId) return;
    const block = blocks.find((b) => b.id === selectedBlockId);
    if (!block) return;
    updateBlock(selectedBlockId, { is_enabled: !block.is_enabled });
  }, [selectedBlockId, blocks, updateBlock]);

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

  const handleApplyTemplate = useCallback(async (templateId: string | null) => {
    setShowTemplatePicker(false);
    if (templateId === null) return;
    const { BIO_TEMPLATES_MAP } = await import('@/lib/bio/templates');
    const template = BIO_TEMPLATES_MAP[templateId];
    if (!template) return;
    closeSheet();
    try {
      const persistedBlocks = blocks.filter((b) => !b.id.startsWith('temp-'));
      await Promise.all(persistedBlocks.map((b) => fetch(`/api/bio/${page.id}/blocks/${b.id}`, { method: 'DELETE' })));
      const createdBlocks: BioBlock[] = [];
      for (const tb of template.blocks) {
        const res = await fetch(`/api/bio/${page.id}/blocks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ block_type: tb.block_type, grid_col: tb.grid_col, grid_row: tb.grid_row, grid_col_span: tb.grid_col_span, grid_row_span: tb.grid_row_span, content: tb.content, is_enabled: true }),
        });
        if (res.ok) createdBlocks.push(await res.json());
      }
      await fetch(`/api/bio/${page.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: template.theme, card_layout: template.card_layout, spacing: template.spacing, border_radius: template.border_radius, font_title: template.font_title, font_body: template.font_body }),
      });
      setBlocks(createdBlocks);
      if (template.theme) setTheme(template.theme);
      addToast({ title: 'Template applied', variant: 'success' });
      router.refresh();
    } catch {
      addToast({ title: 'Failed to apply template', variant: 'error' });
    }
  }, [blocks, page.id, setBlocks, addToast, router]);

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
          theme, custom_bg_color: customBgColor, custom_text_color: customTextColor, custom_accent_color: customAccentColor,
          font_title: fontTitleOverride, font_body: fontBodyOverride, border_radius: borderRadius, spacing,
          background_variant: backgroundVariant, card_layout: cardLayout,
          subtitle: subtitle || null, company: company || null, job_title: jobTitle || null, location: location || null,
          contact_email: contactEmail || null, contact_phone: contactPhone || null, contact_website: contactWebsite || null,
          cover_aspect_ratio: coverAspectRatio, cover_position_y: coverPositionY,
        }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Failed to save'); }
      addToast({ title: 'Saved', variant: 'success' });
      router.refresh();
    } catch (error: any) {
      addToast({ title: 'Failed to save', description: error.message, variant: 'error' });
    } finally {
      setIsUpdating(false);
    }
  };

  // ─── Build background styles for live canvas ──────────────────────
  const bgStyle: React.CSSProperties = {};
  if (themeConfig.background.type === 'gradient' || themeConfig.background.type === 'animated') {
    bgStyle.background = themeConfig.background.css;
  } else {
    bgStyle.backgroundColor = themeConfig.background.css;
  }

  // ─── Miniature preview (for desktop sidebar) ──────────────────────
  const previewPanel = (
    <BioPreviewPanel
      title={page.title} bio={page.bio} theme={theme}
      customBgColor={customBgColor} customTextColor={customTextColor} customAccentColor={customAccentColor}
      fontTitle={fontTitle} fontBody={fontBody} borderRadius={borderRadius} spacing={spacing}
      backgroundVariant={backgroundVariant} avatarUrl={avatarUrl} links={links}
      layoutMode={layoutMode} blocks={blocks} cardLayout={cardLayout} coverUrl={coverUrl}
      subtitle={subtitle} company={company} jobTitle={jobTitle} location={location}
      contactEmail={contactEmail} contactPhone={contactPhone} contactWebsite={contactWebsite}
      coverAspectRatio={coverAspectRatio} coverPositionY={coverPositionY}
    />
  );

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════ */

  return (
    <div className="min-h-[100dvh] flex flex-col">
      {/* Google Fonts — React 19 precedence hoists to <head> */}
      {googleFontsUrl && (
        <link rel="stylesheet" href={googleFontsUrl} precedence="default" />
      )}

      {/* ─── Compact top bar ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm px-3 py-2">
        <div className="flex items-center gap-2">
          <Link href="/app/bio" className="p-1.5 -ml-1.5 rounded-lg hover:bg-muted transition-colors lg:hidden">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <Link href="/app/bio" className="hidden lg:inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
            back
          </Link>

          <Badge variant={page.is_active ? 'success' : 'secondary'} className="shrink-0 text-[10px]">
            {page.is_active ? 'live' : 'draft'}
          </Badge>

          <button
            type="button"
            onClick={() => copyToClipboard(pageUrl)}
            className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors truncate min-w-0"
          >
            <span className="truncate">/p/{page.slug}</span>
            <Copy className="h-3 w-3 shrink-0 opacity-50" />
          </button>

          <span className="flex items-center gap-1 text-[11px] text-muted-foreground ml-auto">
            <Eye className="h-3 w-3" />
            {formatNumber(page.total_views)}
          </span>

          {page.is_active && (
            <a href={pageUrl} target="_blank" rel="noopener noreferrer" className="hidden sm:inline-flex">
              <Button variant="outline" size="sm" className="h-7 text-xs">
                <ExternalLink className="h-3 w-3 mr-1" />
                view
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* ─── Main content area ───────────────────────────────────────── */}
      <div className="flex-1 flex">
        {/* === MOBILE: Full-width interactive canvas === */}
        <div className={`flex-1 lg:hidden pb-20 ${mobileLayoutMode ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <BioInteractiveCanvas
            blocks={blocks}
            links={links}
            contentLayoutMode={layoutMode}
            themeConfig={themeConfig}
            bgStyle={bgStyle}
            spacingConfig={spacingConfig}
            editMode={editMode}
            page={page}
            avatarUrl={avatarUrl}
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
            cardLayout={cardLayout}
            onBlockTap={openBlockEditor}
            onHeaderTap={() => setActiveSheet('style')}
            onMoveBlock={moveBlock}
            onResizeBlock={resizeBlock}
            onSavePositions={savePositions}
            onLayoutModeChange={setMobileLayoutMode}
            contactCard={
              <ContactCardPreview
                title={page.title}
                bio={page.bio}
                subtitle={subtitle}
                company={company}
                jobTitle={jobTitle}
                location={location}
                contactEmail={contactEmail}
                contactPhone={contactPhone}
                contactWebsite={contactWebsite}
                cardLayout={cardLayout ?? 'centered'}
                avatarUrl={avatarUrl}
                coverUrl={coverUrl}
                coverPositionY={coverPositionY ?? 50}
                coverAspectRatio={coverAspectRatio}
                themeConfig={themeConfig}
                initial={page.title ? page.title.charAt(0).toUpperCase() : '?'}
              />
            }
          />
        </div>

        {/* === DESKTOP: Two-column layout === */}
        <div className="hidden lg:flex flex-1 min-h-0">
          {/* Left: Controls */}
          <div className="w-[420px] shrink-0 border-r border-border overflow-y-auto">
            <div className="p-5 space-y-5">
              {/* Add block + templates */}
              {layoutMode === 'grid' && (
                <>
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <BioBlockToolbar
                        onAddBlock={handleAddBlock}
                        blockCount={blocks.length}
                        maxBlocks={BIO_DEFAULTS.MAX_BLOCKS_PER_PAGE}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowTemplatePicker(true)}
                      className="mb-0.5 flex items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-foreground/20 hover:bg-secondary hover:text-foreground active:scale-95"
                    >
                      <LayoutTemplate className="h-4 w-4" />
                      Templates
                    </button>
                  </div>

                  {/* Rearrange toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{blocks.length} blocks</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => setDesktopRearranging(!desktopRearranging)}
                    >
                      <Move className="h-3 w-3" />
                      {desktopRearranging ? 'done rearranging' : 'rearrange'}
                    </Button>
                  </div>

                  {/* Desktop: Grid canvas for rearranging */}
                  {desktopRearranging ? (
                    <div className="rounded-lg border border-border p-1">
                      <BioGridCanvas
                        blocks={blocks}
                        selectedBlockId={selectedBlockId}
                        onSelectBlock={(id) => { if (id) openBlockEditor(id); else setSelectedBlockId(null); }}
                        onMoveBlock={(id, col, row) => { moveBlock(id, col, row); debouncedSave(); }}
                        onResizeBlock={(id, cs, rs) => { resizeBlock(id, cs, rs); debouncedSave(); }}
                        onAddBlockAt={() => {}}
                      />
                    </div>
                  ) : (
                    /* Block list — tap to edit */
                    <div className="space-y-1.5">
                      {blocks.map((block) => (
                        <button
                          key={block.id}
                          type="button"
                          onClick={() => openBlockEditor(block.id)}
                          className={`w-full text-left rounded-lg border p-3 transition-all hover:border-foreground/20 active:scale-[0.98] ${
                            selectedBlockId === block.id ? 'border-foreground/40 bg-secondary/50' : 'border-border'
                          } ${!block.is_enabled ? 'opacity-40' : ''}`}
                        >
                          <div className="h-10 overflow-hidden rounded-sm">
                            <BlockRenderer block={block} compact />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Legacy link editor */}
              {layoutMode === 'list' && (
                <BioLinkEditor pageId={page.id} links={links} onLinksChange={setLinks} />
              )}

              {/* Style section */}
              <div className="border-t border-border pt-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Paintbrush className="h-4 w-4" />
                    style & profile
                  </h3>
                  <Button size="sm" onClick={updateAppearance} disabled={isUpdating}>
                    {isUpdating ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />saving...</> : 'save style'}
                  </Button>
                </div>
                <BioDesignControls
                  theme={theme} onThemeChange={handleThemeChange}
                  fontTitle={fontTitle} fontBody={fontBody} onFontTitleChange={setFontTitle} onFontBodyChange={setFontBody}
                  customBgColor={customBgColor} customTextColor={customTextColor} customAccentColor={customAccentColor}
                  onBgColorChange={setCustomBgColor} onTextColorChange={setCustomTextColor} onAccentColorChange={setCustomAccentColor}
                  backgroundVariant={backgroundVariant} onBackgroundVariantChange={setBackgroundVariant}
                  borderRadius={borderRadius} onBorderRadiusChange={setBorderRadius}
                  spacing={spacing} onSpacingChange={setSpacing}
                  pageId={page.id} avatarUrl={avatarUrl}
                  onAvatarChange={(url) => { setAvatarUrl(url); router.refresh(); }}
                  faviconUrl={faviconUrl}
                  onFaviconChange={(url) => { setFaviconUrl(url); router.refresh(); }}
                  cardLayout={cardLayout} onCardLayoutChange={setCardLayout}
                  coverUrl={coverUrl} onCoverChange={(url) => { setCoverUrl(url); router.refresh(); }}
                  coverAspectRatio={coverAspectRatio} onCoverAspectRatioChange={setCoverAspectRatio}
                  coverPositionY={coverPositionY} onCoverPositionYChange={setCoverPositionY}
                  subtitle={subtitle} company={company} jobTitle={jobTitle} location={location}
                  contactEmail={contactEmail} contactPhone={contactPhone} contactWebsite={contactWebsite}
                  onContactFieldChange={handleContactFieldChange}
                />
                <div className="pt-4">
                  <Button onClick={updateAppearance} disabled={isUpdating} className="w-full">
                    {isUpdating ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />saving...</> : 'save style'}
                  </Button>
                </div>
              </div>

              {/* Analytics link */}
              <div className="border-t border-border pt-5">
                <button
                  type="button"
                  onClick={() => setActiveSheet('analytics')}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <BarChart3 className="h-4 w-4" />
                  view analytics
                </button>
              </div>
            </div>
          </div>

          {/* Right: Live preview (phone frame) */}
          <div className="flex-1 flex items-start justify-center p-8 bg-muted/30 overflow-y-auto">
            <div className="sticky top-8">
              {previewPanel}
            </div>
          </div>
        </div>

        {/* Desktop block edit side panel */}
        {selectedBlock && activeSheet === 'block-edit' && (
          <div className="hidden lg:block w-80 shrink-0 border-l border-border overflow-y-auto">
            <BioBlockEditPanel
              block={selectedBlock}
              onUpdate={handleUpdateContent}
              onDelete={handleDeleteBlock}
              onToggleEnabled={handleToggleEnabled}
              onClose={closeSheet}
            />
          </div>
        )}
      </div>

      {/* ─── Mobile: Floating action bar (hidden during layout mode) ─── */}
      <div className={`lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm safe-area-pb transition-transform duration-300 ${mobileLayoutMode ? 'translate-y-full' : 'translate-y-0'}`}>
        <div className="flex items-center justify-around px-2 py-2">
          <FloatingBarButton
            icon={Plus}
            label="add"
            onClick={() => setActiveSheet('add-block')}
          />
          <FloatingBarButton
            icon={Paintbrush}
            label="style"
            onClick={() => setActiveSheet('style')}
          />
          <FloatingBarButton
            icon={editMode ? EyeOff : Eye}
            label={editMode ? 'preview' : 'edit'}
            onClick={() => setEditMode(!editMode)}
          />
          <FloatingBarButton
            icon={MoreHorizontal}
            label="more"
            onClick={() => setActiveSheet('more')}
          />
        </div>
      </div>

      {/* ─── Mobile Bottom Sheets ────────────────────────────────────── */}

      {/* Block editor sheet */}
      <BottomSheet
        open={activeSheet === 'block-edit' && !!selectedBlock}
        onClose={closeSheet}
        title={selectedBlock ? getBlockLabel(selectedBlock.block_type) : 'Edit Block'}
        maxHeight={80}
      >
        {selectedBlock && (
          <div className="lg:hidden">
            <BioBlockEditPanel
              block={selectedBlock}
              onUpdate={handleUpdateContent}
              onDelete={handleDeleteBlock}
              onToggleEnabled={handleToggleEnabled}
              onClose={closeSheet}
            />
          </div>
        )}
      </BottomSheet>

      {/* Add block sheet */}
      <BottomSheet
        open={activeSheet === 'add-block'}
        onClose={closeSheet}
        title="Add Block"
        maxHeight={70}
      >
        <div className="p-4">
          {layoutMode === 'grid' ? (
            <div className="space-y-4">
              <BioBlockToolbar
                onAddBlock={(type) => { handleAddBlock(type); }}
                blockCount={blocks.length}
                maxBlocks={BIO_DEFAULTS.MAX_BLOCKS_PER_PAGE}
              />
              <button
                type="button"
                onClick={() => { closeSheet(); setShowTemplatePicker(true); }}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
              >
                <LayoutTemplate className="h-4 w-4" />
                apply a template
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Use the content editor above to add links.</p>
          )}
        </div>
      </BottomSheet>

      {/* Style sheet */}
      <BottomSheet
        open={activeSheet === 'style'}
        onClose={closeSheet}
        title="Style & Profile"
        maxHeight={90}
        footer={
          <Button onClick={() => { updateAppearance(); closeSheet(); }} disabled={isUpdating} className="w-full">
            {isUpdating ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />saving...</> : 'save style'}
          </Button>
        }
      >
        <div className="p-4">
          <BioDesignControls
            theme={theme} onThemeChange={handleThemeChange}
            fontTitle={fontTitle} fontBody={fontBody} onFontTitleChange={setFontTitle} onFontBodyChange={setFontBody}
            customBgColor={customBgColor} customTextColor={customTextColor} customAccentColor={customAccentColor}
            onBgColorChange={setCustomBgColor} onTextColorChange={setCustomTextColor} onAccentColorChange={setCustomAccentColor}
            backgroundVariant={backgroundVariant} onBackgroundVariantChange={setBackgroundVariant}
            borderRadius={borderRadius} onBorderRadiusChange={setBorderRadius}
            spacing={spacing} onSpacingChange={setSpacing}
            pageId={page.id} avatarUrl={avatarUrl}
            onAvatarChange={(url) => { setAvatarUrl(url); router.refresh(); }}
            faviconUrl={faviconUrl}
            onFaviconChange={(url) => { setFaviconUrl(url); router.refresh(); }}
            cardLayout={cardLayout} onCardLayoutChange={setCardLayout}
            coverUrl={coverUrl} onCoverChange={(url) => { setCoverUrl(url); router.refresh(); }}
            coverAspectRatio={coverAspectRatio} onCoverAspectRatioChange={setCoverAspectRatio}
            coverPositionY={coverPositionY} onCoverPositionYChange={setCoverPositionY}
            subtitle={subtitle} company={company} jobTitle={jobTitle} location={location}
            contactEmail={contactEmail} contactPhone={contactPhone} contactWebsite={contactWebsite}
            onContactFieldChange={handleContactFieldChange}
          />
        </div>
      </BottomSheet>

      {/* Analytics sheet */}
      <BottomSheet
        open={activeSheet === 'analytics'}
        onClose={closeSheet}
        title="Analytics"
        maxHeight={90}
      >
        <div className="p-4">
          <BioAnalyticsPanel pageId={page.id} />
        </div>
      </BottomSheet>

      {/* More menu sheet */}
      <BottomSheet
        open={activeSheet === 'more'}
        onClose={closeSheet}
        title="Options"
        maxHeight={50}
      >
        <div className="p-2">
          <MoreMenuItem
            icon={BarChart3}
            label="Analytics"
            onClick={() => setActiveSheet('analytics')}
          />
          {page.is_active && (
            <MoreMenuItem
              icon={ExternalLink}
              label="View live page"
              onClick={() => { window.open(pageUrl, '_blank'); closeSheet(); }}
            />
          )}
          <MoreMenuItem
            icon={Copy}
            label="Copy page URL"
            onClick={() => { copyToClipboard(pageUrl); closeSheet(); }}
          />
          <MoreMenuItem
            icon={Link2}
            label="Back to all pages"
            onClick={() => router.push('/app/bio')}
          />
        </div>
      </BottomSheet>

      {/* Template picker modal */}
      {showTemplatePicker && (
        <TemplatePicker
          onSelect={handleApplyTemplate}
          onClose={() => setShowTemplatePicker(false)}
          isReplace={blocks.length > 0}
        />
      )}

      {/* Save indicator */}
      <div
        className={`fixed bottom-16 lg:bottom-4 left-4 z-30 flex items-center gap-2 rounded-full bg-foreground px-3 py-1.5 text-background transition-opacity duration-300 ${
          saving ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-background" />
        <span className="text-xs">saving...</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Contact Card Preview — full-size, rendered inline on the canvas
   ═══════════════════════════════════════════════════════════════════════ */

function ContactCardPreview({
  title, bio, subtitle, company, jobTitle, location,
  contactEmail, contactPhone, contactWebsite,
  cardLayout, avatarUrl, coverUrl, coverPositionY, coverAspectRatio,
  themeConfig, initial,
}: {
  title: string;
  bio: string | null;
  subtitle: string;
  company: string;
  jobTitle: string;
  location: string;
  contactEmail: string;
  contactPhone: string;
  contactWebsite: string;
  cardLayout: BioCardLayout;
  avatarUrl: string | null;
  coverUrl: string | null;
  coverPositionY: number;
  coverAspectRatio: string | null;
  themeConfig: ReturnType<typeof resolveFullThemeConfig>;
  initial: string;
}) {
  const titleStyle: React.CSSProperties = {
    color: themeConfig.colors.text,
    fontFamily: `'${themeConfig.fonts.title.family}', sans-serif`,
    fontWeight: themeConfig.fonts.title.weight,
  };
  const bodyStyle: React.CSSProperties = {
    color: themeConfig.colors.textSecondary,
    fontFamily: `'${themeConfig.fonts.body.family}', sans-serif`,
  };

  const infoLine = [jobTitle, company].filter(Boolean).join(' at ');

  const avatarEl = (
    <div
      className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2"
      style={{ borderColor: themeConfig.colors.avatarRing, backgroundColor: themeConfig.colors.accent }}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
      ) : (
        <span className="text-2xl font-bold" style={{ color: themeConfig.colors.bg, fontFamily: titleStyle.fontFamily }}>
          {initial}
        </span>
      )}
    </div>
  );

  // Centered layout (default)
  return (
    <div className="flex w-full flex-col items-center space-y-2 text-center">
      {(cardLayout === 'split' || cardLayout === 'cover') && (
        <div
          className="w-full rounded-xl overflow-hidden mb-2"
          style={{
            height: 120,
            backgroundColor: coverUrl ? undefined : themeConfig.colors.accent,
            backgroundImage: coverUrl ? `url(${coverUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: `center ${coverPositionY}%`,
          }}
        />
      )}
      {(cardLayout === 'split' || cardLayout === 'cover') ? (
        <div className="-mt-12">{avatarEl}</div>
      ) : cardLayout !== 'minimal' ? (
        avatarEl
      ) : null}
      <h1 className="text-xl font-bold leading-tight" style={titleStyle}>
        {title || 'Your Name'}
      </h1>
      {subtitle && <p className="text-sm" style={bodyStyle}>{subtitle}</p>}
      {infoLine && <p className="text-xs" style={bodyStyle}>{infoLine}</p>}
      {location && <p className="text-xs" style={bodyStyle}>{location}</p>}
      {bio && <p className="text-sm leading-relaxed max-w-sm" style={bodyStyle}>{bio}</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Small Helpers
   ═══════════════════════════════════════════════════════════════════════ */

function FloatingBarButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg text-muted-foreground hover:text-foreground active:bg-muted transition-colors min-w-[56px]"
    >
      <Icon className="h-5 w-5" />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function MoreMenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm hover:bg-muted active:bg-muted/70 transition-colors"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      {label}
    </button>
  );
}

const BLOCK_TYPE_LABELS: Record<string, string> = {
  link: 'Link', heading: 'Heading', text: 'Text', image: 'Image',
  social_icons: 'Social Icons', divider: 'Divider', spacer: 'Spacer',
  spotify_embed: 'Spotify', youtube_embed: 'YouTube', map: 'Map',
  countdown: 'Countdown', payment_link: 'Payment', gallery: 'Gallery',
  contact_form: 'Contact Form',
};

function getBlockLabel(type: string): string {
  return BLOCK_TYPE_LABELS[type] ?? 'Block';
}
