'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Select,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  useToast,
} from '@/components/ui';
import { BioThemePicker } from '@/components/bio/bio-theme-picker';
import { BioColorCustomizer } from '@/components/bio/bio-color-customizer';
import { BioPreviewPanel } from '@/components/bio/bio-preview-panel';
import { BIO_DEFAULTS } from '@/lib/constants';
import type { BioLinkTheme, BioLinkButtonStyle } from '@/types/bio';

export default function NewBioPage() {
  const router = useRouter();
  const { addToast } = useToast();

  // Form state
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [slug, setSlug] = useState('');
  const [theme, setTheme] = useState<BioLinkTheme>('minimal');
  const [buttonStyle, setButtonStyle] = useState<BioLinkButtonStyle>('filled');
  const [customBgColor, setCustomBgColor] = useState<string | null>(null);
  const [customTextColor, setCustomTextColor] = useState<string | null>(null);
  const [customAccentColor, setCustomAccentColor] = useState<string | null>(null);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [createQr, setCreateQr] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!title.trim()) {
      addToast({ title: 'Please enter a title', variant: 'error' });
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          bio: bio.trim() || undefined,
          slug: slug || undefined,
          theme,
          button_style: buttonStyle,
          custom_bg_color: customBgColor || undefined,
          custom_text_color: customTextColor || undefined,
          custom_accent_color: customAccentColor || undefined,
          analytics_enabled: analyticsEnabled,
          create_qr: createQr,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details?.fieldErrors) {
          setErrors(data.details.fieldErrors);
        }
        throw new Error(data.error || 'Failed to create bio page');
      }

      addToast({ title: 'Bio page created!', variant: 'success' });
      router.push(`/app/bio/${data.id}`);
    } catch (error: any) {
      console.error('Error creating bio page:', error);
      addToast({
        title: 'Failed to create bio page',
        description: error.message,
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/app/bio"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          back to bio page
        </Link>
        <h1 className="text-2xl font-bold">create your bio page</h1>
        <p className="text-muted-foreground">
          Set up your personal link-in-bio page
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left column - Form */}
          <div className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">basic info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., John Doe"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={BIO_DEFAULTS.MAX_TITLE_LENGTH}
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
                    className="flex w-full rounded-sm border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-150 resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {bio.length}/{BIO_DEFAULTS.MAX_BIO_LENGTH}
                  </p>
                  {errors.bio && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.bio[0]}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">custom slug (optional)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground shrink-0">
                      /p/
                    </span>
                    <Input
                      id="slug"
                      placeholder="auto-generated"
                      value={slug}
                      onChange={(e) =>
                        setSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, '')
                        )
                      }
                      pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Leave empty to auto-generate. Use lowercase letters, numbers,
                    and hyphens.
                  </p>
                  {errors.slug && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.slug[0]}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Appearance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">appearance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>theme</Label>
                  <BioThemePicker value={theme} onChange={setTheme} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buttonStyle">button style</Label>
                  <Select
                    id="buttonStyle"
                    value={buttonStyle}
                    onChange={(e) =>
                      setButtonStyle(e.target.value as BioLinkButtonStyle)
                    }
                  >
                    <option value="filled">Filled</option>
                    <option value="outline">Outline</option>
                    <option value="shadow">Shadow</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>custom colors (optional)</Label>
                  <BioColorCustomizer
                    bgColor={customBgColor}
                    textColor={customTextColor}
                    accentColor={customAccentColor}
                    onBgChange={setCustomBgColor}
                    onTextChange={setCustomTextColor}
                    onAccentChange={setCustomAccentColor}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="analytics"
                    checked={analyticsEnabled}
                    onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                    className="rounded border-input"
                  />
                  <Label
                    htmlFor="analytics"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Enable page view analytics
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="createQr"
                    checked={createQr}
                    onChange={(e) => setCreateQr(e.target.checked)}
                    className="rounded border-input"
                  />
                  <Label
                    htmlFor="createQr"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Create a QR code for this page
                  </Label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column - Preview */}
          <div className="lg:sticky lg:top-8 space-y-6 self-start">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">preview</CardTitle>
              </CardHeader>
              <CardContent>
                <BioPreviewPanel
                  title={title || 'Your Name'}
                  bio={bio || null}
                  theme={theme}
                  buttonStyle={buttonStyle}
                  customBgColor={customBgColor}
                  customTextColor={customTextColor}
                  customAccentColor={customAccentColor}
                  avatarUrl={null}
                  links={[]}
                />
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex gap-4">
              <Link href="/app/bio" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  cancel
                </Button>
              </Link>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? 'creating...' : 'create bio page'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
