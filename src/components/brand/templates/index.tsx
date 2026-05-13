import { CardClassic } from './card-classic';
import { CardClassicPlus, CardClassicPlusPrint } from './card-classic-plus';
import { CardMono, CardMonoPrint } from './card-mono';
import { CardBoldBlock, CardBoldBlockPrint } from './card-bold-block';
import { CardMinimalType, CardMinimalTypePrint } from './card-minimal-type';
import { CardSerifPremium, CardSerifPremiumPrint } from './card-serif-premium';
import { CardDiagonal, CardDiagonalPrint } from './card-diagonal';
import { CardPortrait, CardPortraitPrint } from './card-portrait';
import { SigClassic } from './sig-classic';
import { SigPhotoLed } from './sig-photo-led';
import { SigCompact } from './sig-compact';
import { SigBanner } from './sig-banner';
import { SigCard } from './sig-card';
import { SigMinimalBar } from './sig-minimal-bar';
import { SigStacked } from './sig-stacked';
import { SigEco } from './sig-eco';
import { DOUBLE_SIDED_CARD_TEMPLATES } from '@/lib/brand/templates';
import type { BrandDesignHydrated } from '@/types/brand';

/**
 * Render a design.
 *
 * For double-sided cards, callers pass `side` to render front or back. If
 * `side` is omitted on a double-sided template, the front is rendered.
 * When `print: true`, double-sided cards are wrapped in a bleed area with
 * crop marks for the PDF pipeline.
 */
export function renderTemplate(
  design: BrandDesignHydrated,
  opts: { print?: boolean; side?: 'front' | 'back' } = {}
) {
  const side = opts.side ?? 'front';

  switch (design.template_id) {
    case 'card-classic-plus':
      return opts.print
        ? <CardClassicPlusPrint design={design} side={side} />
        : <CardClassicPlus design={design} side={side} />;
    case 'card-mono':
      return opts.print
        ? <CardMonoPrint design={design} side={side} />
        : <CardMono design={design} side={side} />;
    case 'card-bold-block':
      return opts.print
        ? <CardBoldBlockPrint design={design} side={side} />
        : <CardBoldBlock design={design} side={side} />;
    case 'card-minimal-type':
      return opts.print
        ? <CardMinimalTypePrint design={design} side={side} />
        : <CardMinimalType design={design} side={side} />;
    case 'card-serif-premium':
      return opts.print
        ? <CardSerifPremiumPrint design={design} side={side} />
        : <CardSerifPremium design={design} side={side} />;
    case 'card-diagonal':
      return opts.print
        ? <CardDiagonalPrint design={design} side={side} />
        : <CardDiagonal design={design} side={side} />;
    case 'card-portrait':
      return opts.print
        ? <CardPortraitPrint design={design} side={side} />
        : <CardPortrait design={design} side={side} />;
    case 'card-classic':
      // Legacy: single-sided.
      return <CardClassic design={design} print={opts.print} />;
    case 'sig-classic':
      return <SigClassic design={design} />;
    case 'sig-photo-led':
      return <SigPhotoLed design={design} />;
    case 'sig-compact':
      return <SigCompact design={design} />;
    case 'sig-banner':
      return <SigBanner design={design} />;
    case 'sig-card':
      return <SigCard design={design} />;
    case 'sig-minimal-bar':
      return <SigMinimalBar design={design} />;
    case 'sig-stacked':
      return <SigStacked design={design} />;
    case 'sig-eco':
      return <SigEco design={design} />;
    default:
      return null;
  }
}

export function isDoubleSidedTemplate(templateId: string): boolean {
  return DOUBLE_SIDED_CARD_TEMPLATES.has(templateId);
}

export {
  CardClassic,
  CardClassicPlus,
  CardMono,
  CardBoldBlock,
  CardMinimalType,
  CardSerifPremium,
  CardDiagonal,
  CardPortrait,
  SigClassic,
  SigPhotoLed,
  SigCompact,
  SigBanner,
  SigCard,
  SigMinimalBar,
  SigStacked,
  SigEco,
};
