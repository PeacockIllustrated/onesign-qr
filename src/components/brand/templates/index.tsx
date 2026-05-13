import { CardClassic } from './card-classic';
import { CardClassicPlus, CardClassicPlusPrint } from './card-classic-plus';
import { CardMono, CardMonoPrint } from './card-mono';
import { SigClassic } from './sig-classic';
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
    case 'card-classic':
      // Legacy: single-sided.
      return <CardClassic design={design} print={opts.print} />;
    case 'sig-classic':
      return <SigClassic design={design} />;
    default:
      return null;
  }
}

export function isDoubleSidedTemplate(templateId: string): boolean {
  return DOUBLE_SIDED_CARD_TEMPLATES.has(templateId);
}

export { CardClassic, CardClassicPlus, CardMono, SigClassic };
