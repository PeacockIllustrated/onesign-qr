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
  Select,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  useToast,
} from '@/components/ui';
import { BioThemePicker } from '@/components/bio/bio-theme-picker';
import { BioColorCustomizer } from '@/components/bio/bio-color-customizer';
import { BioAvatarUpload } from '@/components/bio/bio-avatar-upload';
import { BioLinkEditor } from '@/components/bio/bio-link-editor';
import { formatDate, formatNumber } from '@/lib/utils';
import type {
  BioLinkPage,
  BioLinkItem,
  BioLinkTheme,
  BioLinkButtonStyle,
} from '@/types/bio';

interface BioDetailClientProps {
  page: BioLinkPage;
  items: BioLinkItem[];
}

export function BioDetailClient({ page, items }: BioDetailClientProps) {
  const router = useRouter();
  const { addToast } = useToast();

  // Links state
  const [links, setLinks] = useState<BioLinkItem[]>(items);

  // Appearance state
  const [theme, setTheme] = useState<BioLinkTheme>(page.theme);
  const [buttonStyle, setButtonStyle] = useState<BioLinkButtonStyle>(
    page.button_style
  );
  const [customBgColor, setCustomBgColor] = useState<string | null>(
    page.custom_bg_color
  );
  const [customTextColor, setCustomTextColor] = useState<string | null>(
    page.custom_text_color
  );
  const [customAccentColor, setCustomAccentColor] = useState<string | null>(
    page.custom_accent_color
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

  const pageUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/p/${page.slug}`;

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    addToast({ title: 'Copied to clipboard', variant: 'success' });
  };

  const updateAppearance = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/bio/${page.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme,
          button_style: buttonStyle,
          custom_bg_color: customBgColor,
          custom_text_color: customTextColor,
          custom_accent_color: customAccentColor,
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
        <TabsTrigger value="links">links</TabsTrigger>
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

      {/* Links Tab */}
      <TabsContent value="links">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              manage links
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BioLinkEditor pageId={page.id} links={links} onLinksChange={setLinks} />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Appearance Tab */}
      <TabsContent value="appearance">
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <Label>profile image</Label>
              <BioAvatarUpload
                pageId={page.id}
                currentAvatarUrl={avatarUrl}
                onAvatarChange={(url) => {
                  setAvatarUrl(url);
                  router.refresh();
                }}
              />
            </div>

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

            <Button onClick={updateAppearance} disabled={isUpdating}>
              {isUpdating ? 'saving...' : 'save appearance'}
            </Button>
          </CardContent>
        </Card>
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
