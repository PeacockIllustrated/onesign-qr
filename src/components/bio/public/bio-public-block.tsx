import type {
  BioBlock,
  BioThemeConfig,
  BioStyleOverrides,
  BioBlockContentLink,
  BioBlockContentHeading,
  BioBlockContentText,
  BioBlockContentImage,
  BioBlockContentSocialIcons,
  BioBlockContentDivider,
  BioBlockContentSpotifyEmbed,
  BioBlockContentYouTubeEmbed,
  BioBlockContentMap,
  BioBlockContentCountdown,
  BioBlockContentPaymentLink,
  BioBlockContentGallery,
  BioBlockContentContactForm,
} from '@/types/bio';

import { PublicLinkBlock } from './block-renderers/link-block';
import { PublicHeadingBlock } from './block-renderers/heading-block';
import { PublicTextBlock } from './block-renderers/text-block';
import { PublicImageBlock } from './block-renderers/image-block';
import { PublicSocialIconsBlock } from './block-renderers/social-icons-block';
import { PublicDividerBlock } from './block-renderers/divider-block';
import { PublicSpacerBlock } from './block-renderers/spacer-block';
import { PublicSpotifyBlock } from './block-renderers/spotify-block';
import { PublicYouTubeBlock } from './block-renderers/youtube-block';
import { PublicMapBlock } from './block-renderers/map-block';
import { PublicCountdownBlock } from './block-renderers/countdown-block';
import { PublicPaymentLinkBlock } from './block-renderers/payment-link-block';

interface BioPublicBlockProps {
  block: BioBlock;
  themeConfig: BioThemeConfig;
  staggerIndex: number;
  pageId: string;
}

/**
 * Server component that renders a single bio block based on its type.
 * Delegates to individual renderer components for each block type.
 */
export function BioPublicBlock({
  block,
  themeConfig,
  staggerIndex,
  pageId,
}: BioPublicBlockProps) {
  // Extract per-block style overrides and build a CSS style object
  const styleOverrides = (block.content as { style_overrides?: BioStyleOverrides }).style_overrides;

  const overrideStyle: React.CSSProperties = {};
  if (styleOverrides?.bg_color) overrideStyle.backgroundColor = styleOverrides.bg_color;
  if (styleOverrides?.border) overrideStyle.border = styleOverrides.border;
  if (styleOverrides?.border_radius) {
    const radiusMap: Record<string, string> = {
      sharp: '0px', rounded: '8px', pill: '9999px', soft: '12px', chunky: '16px', organic: '20px',
    };
    overrideStyle.borderRadius = radiusMap[styleOverrides.border_radius];
  }
  if (styleOverrides?.padding) {
    const paddingMap: Record<string, string> = { sm: '8px', md: '16px', lg: '24px' };
    overrideStyle.padding = paddingMap[styleOverrides.padding];
  }
  if (styleOverrides?.shadow) {
    const shadowMap: Record<string, string> = {
      none: 'none', sm: '0 1px 2px rgba(0,0,0,0.05)', md: '0 4px 6px rgba(0,0,0,0.1)', lg: '0 10px 15px rgba(0,0,0,0.1)',
    };
    overrideStyle.boxShadow = shadowMap[styleOverrides.shadow];
  }

  const hasOverrides = Object.keys(overrideStyle).length > 0;

  const rendered = (() => {
  switch (block.block_type) {
    case 'link':
      return (
        <PublicLinkBlock
          content={block.content as BioBlockContentLink}
          blockId={block.id}
          pageId={pageId}
          themeConfig={themeConfig}
          staggerIndex={staggerIndex}
        />
      );

    case 'heading':
      return (
        <PublicHeadingBlock
          content={block.content as BioBlockContentHeading}
          themeConfig={themeConfig}
        />
      );

    case 'text':
      return (
        <PublicTextBlock
          content={block.content as BioBlockContentText}
          themeConfig={themeConfig}
        />
      );

    case 'image':
      return (
        <PublicImageBlock
          content={block.content as BioBlockContentImage}
          blockId={block.id}
          pageId={pageId}
          themeConfig={themeConfig}
        />
      );

    case 'social_icons':
      return (
        <PublicSocialIconsBlock
          content={block.content as BioBlockContentSocialIcons}
          themeConfig={themeConfig}
        />
      );

    case 'divider':
      return (
        <PublicDividerBlock
          content={block.content as BioBlockContentDivider}
          themeConfig={themeConfig}
        />
      );

    case 'spacer':
      return <PublicSpacerBlock />;

    case 'spotify_embed':
      return (
        <PublicSpotifyBlock
          content={block.content as BioBlockContentSpotifyEmbed}
          themeConfig={themeConfig}
        />
      );

    case 'youtube_embed':
      return (
        <PublicYouTubeBlock
          content={block.content as BioBlockContentYouTubeEmbed}
          themeConfig={themeConfig}
        />
      );

    case 'map':
      return (
        <PublicMapBlock
          content={block.content as BioBlockContentMap}
          themeConfig={themeConfig}
        />
      );

    case 'countdown':
      return (
        <PublicCountdownBlock
          content={block.content as BioBlockContentCountdown}
          themeConfig={themeConfig}
          colSpan={block.grid_col_span}
        />
      );

    case 'payment_link':
      return (
        <PublicPaymentLinkBlock
          content={block.content as BioBlockContentPaymentLink}
          themeConfig={themeConfig}
          blockId={block.id}
          pageId={pageId}
        />
      );

    case 'gallery':
    case 'contact_form':
      return null;

    default:
      return null;
  }
  })();

  if (hasOverrides && rendered) {
    return <div style={overrideStyle}>{rendered}</div>;
  }

  return rendered;
}
