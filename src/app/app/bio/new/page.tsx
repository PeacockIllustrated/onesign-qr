'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  AlertCircle,
  Loader2,
  Eye,
  X,
} from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  useToast,
} from '@/components/ui';
import { BioThemeGallery } from '@/components/bio/bio-theme-gallery';
import { BioColorCustomizer } from '@/components/bio/bio-color-customizer';
import { BioPreviewPanel } from '@/components/bio/bio-preview-panel';
import { BIO_DEFAULTS } from '@/lib/constants';
import { BIO_TEMPLATES_LIST } from '@/lib/bio/templates';
import type { BioTemplate } from '@/lib/bio/templates';
import type { BioLinkTheme } from '@/types/bio';

type Step = 'template' | 'profile' | 'style';
const STEPS: Step[] = ['template', 'profile', 'style'];
const STEP_LABELS: Record<Step, string> = { template: 'Start', profile: 'Profile', style: 'Style' };

export default function NewBioPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [step, setStep] = useState<Step>('template');

  // Step 1: Template
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const selectedTemplate = selectedTemplateId
    ? BIO_TEMPLATES_LIST.find((t: BioTemplate) => t.id === selectedTemplateId) ?? null
    : null;

  // Step 2: Profile
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [slug, setSlug] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  // Step 3: Style
  const [theme, setTheme] = useState<BioLinkTheme>('minimal');
  const [customBgColor, setCustomBgColor] = useState<string | null>(null);
  const [customTextColor, setCustomTextColor] = useState<string | null>(null);
  const [customAccentColor, setCustomAccentColor] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  const stepIndex = STEPS.indexOf(step);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  const handleNext = () => {
    if (step === 'profile' && !title.trim()) {
      addToast({ title: 'Please enter a title', variant: 'error' });
      return;
    }
    if (step === 'template' && selectedTemplate) {
      setTheme(selectedTemplate.theme);
    }
    setStep(STEPS[stepIndex + 1]);
  };

  const handleBack = () => {
    setStep(STEPS[stepIndex - 1]);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      addToast({ title: 'Please enter a title', variant: 'error' });
      setStep('profile');
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const res = await fetch('/api/bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          bio: bio.trim() || undefined,
          slug: slug || undefined,
          theme,
          custom_bg_color: customBgColor || undefined,
          custom_text_color: customTextColor || undefined,
          custom_accent_color: customAccentColor || undefined,
          analytics_enabled: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details?.fieldErrors) {
          setErrors(data.details.fieldErrors);
          setStep('profile');
        }
        throw new Error(data.error || 'Failed to create bio page');
      }

      if (selectedTemplate) {
        try {
          for (const block of selectedTemplate.blocks) {
            await fetch(`/api/bio/${data.id}/blocks`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                block_type: block.block_type,
                grid_col: block.grid_col,
                grid_row: block.grid_row,
                grid_col_span: block.grid_col_span,
                grid_row_span: block.grid_row_span,
                content: block.content,
              }),
            });
          }
        } catch {
          // Non-critical
        }
      }

      addToast({ title: 'Bio page created!', variant: 'success' });
      router.push(`/app/bio/${data.id}`);
    } catch (error: any) {
      addToast({
        title: 'Failed to create bio page',
        description: error.message,
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const previewContent = (
    <BioPreviewPanel
      title={title || 'Your Name'}
      bio={bio || null}
      theme={theme}
      customBgColor={customBgColor}
      customTextColor={customTextColor}
      customAccentColor={customAccentColor}
      fontTitle={null}
      fontBody={null}
      borderRadius={selectedTemplate?.border_radius ?? null}
      spacing={selectedTemplate?.spacing ?? null}
      backgroundVariant={null}
      avatarUrl={null}
      links={[]}
      layoutMode={selectedTemplate ? 'grid' : 'list'}
      blocks={selectedTemplate?.blocks?.map((b, i) => ({
        id: `preview-${i}`,
        page_id: '',
        block_type: b.block_type,
        grid_col: b.grid_col,
        grid_row: b.grid_row,
        grid_col_span: b.grid_col_span,
        grid_row_span: b.grid_row_span,
        content: b.content,
        is_enabled: true,
        sort_order: i,
        total_clicks: 0,
        created_at: '',
        updated_at: '',
      })) ?? []}
      cardLayout={selectedTemplate?.card_layout ?? 'centered'}
    />
  );

  return (
    <>
      {/* Main content — bottom padding for sticky nav */}
      <div className="p-4 md:p-8 pb-28 sm:pb-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-5 sm:mb-6">
          <Link
            href="/app/bio"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            back
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold">create a new bio page</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 sm:gap-2 mb-6 sm:mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => { if (i < stepIndex) setStep(s); }}
                className={`
                  flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-full text-xs font-semibold transition-colors
                  ${i < stepIndex
                    ? 'bg-foreground text-background cursor-pointer'
                    : i === stepIndex
                      ? 'bg-foreground text-background'
                      : 'bg-muted text-muted-foreground'
                  }
                `}
              >
                {i < stepIndex ? <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : i + 1}
              </button>
              <span className={`text-xs sm:text-sm ${i === stepIndex ? 'font-medium' : 'text-muted-foreground'}`}>
                {STEP_LABELS[s]}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`w-5 sm:w-8 h-px ${i < stepIndex ? 'bg-foreground' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-8">
          {/* Step content */}
          <div className="min-w-0">
            {/* Step 1: Template */}
            {step === 'template' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Pick a starting point, or start with a blank page.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedTemplateId(null)}
                    className={`group relative flex flex-col items-center justify-center gap-1.5 sm:gap-2 rounded-lg border-2 border-dashed px-3 py-6 sm:px-4 sm:py-8 transition-all active:scale-[0.97] ${
                      selectedTemplateId === null
                        ? 'border-foreground/60 bg-secondary/50'
                        : 'border-border'
                    }`}
                  >
                    {selectedTemplateId === null && (
                      <div className="absolute right-1.5 top-1.5 sm:right-2 sm:top-2 flex h-5 w-5 items-center justify-center rounded-full bg-foreground">
                        <Check className="h-3 w-3 text-background" />
                      </div>
                    )}
                    <Plus className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                    <span className="text-sm font-medium">Blank</span>
                    <span className="text-[11px] sm:text-xs text-muted-foreground">Start fresh</span>
                  </button>

                  {BIO_TEMPLATES_LIST.map((template: BioTemplate) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={`group relative flex flex-col items-start gap-1 sm:gap-1.5 rounded-lg border-2 px-3 py-3 sm:px-4 sm:py-4 text-left transition-all active:scale-[0.97] ${
                        selectedTemplateId === template.id
                          ? 'border-foreground/60 bg-secondary/50'
                          : 'border-border'
                      }`}
                    >
                      {selectedTemplateId === template.id && (
                        <div className="absolute right-1.5 top-1.5 sm:right-2 sm:top-2 flex h-5 w-5 items-center justify-center rounded-full bg-foreground">
                          <Check className="h-3 w-3 text-background" />
                        </div>
                      )}
                      <span className="text-sm font-semibold pr-5">{template.name}</span>
                      <span className="text-[11px] sm:text-xs leading-relaxed text-muted-foreground line-clamp-2">
                        {template.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Profile */}
            {step === 'profile' && (
              <div className="space-y-5 max-w-lg">
                <p className="text-sm text-muted-foreground">
                  Tell visitors who you are.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="title">name / title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Jane Doe"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={BIO_DEFAULTS.MAX_TITLE_LENGTH}
                    autoFocus
                    required
                  />
                  {errors.title && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.title[0]}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">bio</Label>
                  <textarea
                    id="bio"
                    placeholder="A short description about yourself..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={BIO_DEFAULTS.MAX_BIO_LENGTH}
                    rows={3}
                    className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors duration-150 resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {bio.length}/{BIO_DEFAULTS.MAX_BIO_LENGTH}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">custom URL (optional)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground shrink-0 font-mono">/p/</span>
                    <Input
                      id="slug"
                      placeholder="auto-generated"
                      value={slug}
                      onChange={(e) =>
                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                      }
                    />
                  </div>
                  {errors.slug && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.slug[0]}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Style */}
            {step === 'style' && (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Choose a look &mdash; you can always change this later.
                </p>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold">theme</Label>
                  <BioThemeGallery value={theme} onChange={setTheme} />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold">custom colors (optional)</Label>
                  <BioColorCustomizer
                    bgColor={customBgColor}
                    textColor={customTextColor}
                    accentColor={customAccentColor}
                    onBgChange={setCustomBgColor}
                    onTextChange={setCustomTextColor}
                    onAccentChange={setCustomAccentColor}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Desktop preview (sticky) */}
          <div className="hidden lg:block">
            <div className="sticky top-8">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-3 text-center">preview</p>
                  {previewContent}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Desktop navigation */}
        <div className="hidden sm:flex items-center justify-between mt-8 pt-6 border-t">
          <div>
            {isFirst ? (
              <Link href="/app/bio">
                <Button variant="outline">cancel</Button>
              </Link>
            ) : (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                back
              </Button>
            )}
          </div>
          <div>
            {isLast ? (
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />creating...</>
                ) : (
                  'create page'
                )}
              </Button>
            ) : (
              <Button onClick={handleNext}>
                next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Mobile: Sticky bottom nav ─── */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm px-4 py-3 safe-area-pb">
        <div className="flex items-center gap-3">
          {/* Preview button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMobilePreviewOpen(true)}
            className="shrink-0"
          >
            <Eye className="h-4 w-4" />
          </Button>

          {/* Back */}
          {isFirst ? (
            <Link href="/app/bio" className="flex-1">
              <Button variant="outline" className="w-full">cancel</Button>
            </Link>
          ) : (
            <Button variant="outline" onClick={handleBack} className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-1" />
              back
            </Button>
          )}

          {/* Next / Create */}
          {isLast ? (
            <Button onClick={handleSubmit} disabled={isLoading} className="flex-1">
              {isLoading ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" />creating</>
              ) : (
                'create page'
              )}
            </Button>
          ) : (
            <Button onClick={handleNext} className="flex-1">
              next
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* ─── Mobile: Preview bottom sheet ─── */}
      {mobilePreviewOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobilePreviewOpen(false)}
          />
          {/* Sheet */}
          <div className="absolute bottom-0 inset-x-0 bg-background rounded-t-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* Handle + close */}
            <div className="flex items-center justify-between px-5 pt-3 pb-2 border-b border-border">
              <div className="w-10 h-1 rounded-full bg-muted mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
              <span className="text-sm font-medium pt-2">preview</span>
              <button
                type="button"
                onClick={() => setMobilePreviewOpen(false)}
                className="p-2 -mr-2 rounded-sm text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Preview content */}
            <div className="flex-1 overflow-y-auto p-4 flex justify-center">
              <div className="w-full max-w-[280px]">
                {previewContent}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
