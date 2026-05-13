import 'server-only';
import type { BrandDesignHydrated } from '@/types/brand';
import { renderTemplate, isDoubleSidedTemplate } from '@/components/brand/templates';
import { CARD_DIMENSIONS } from '@/lib/brand/templates';

/**
 * Build a complete HTML document for Puppeteer to render to PDF.
 *
 * For double-sided cards, emits a two-page document — front then back.
 * The @page rule pins the page size to the card dimensions (including
 * bleed) so there's no scaling. Pages are separated by a CSS page break.
 */
export async function buildCardPrintHtml(design: BrandDesignHydrated): Promise<string> {
  const { renderToStaticMarkup } = await import('react-dom/server');

  const front = renderToStaticMarkup(
    renderTemplate(design, { print: true, side: 'front' }) as React.ReactElement
  );
  const back = isDoubleSidedTemplate(design.template_id)
    ? renderToStaticMarkup(
        renderTemplate(design, { print: true, side: 'back' }) as React.ReactElement
      )
    : null;

  const fontParam = (font: string) => font.trim().replace(/\s+/g, '+');
  const fontFamilies = new Set([design.profile.font_heading, design.profile.font_body]);
  // Mono template uses JetBrains Mono for the contact stack — request it too.
  if (design.template_id === 'card-mono') fontFamilies.add('JetBrains Mono');

  const fontHrefs = Array.from(fontFamilies)
    .filter((f) => /^[A-Za-z0-9 ]+$/.test(f))
    .map((f) => `https://fonts.googleapis.com/css2?family=${fontParam(f)}:wght@400;500;600;700;800&display=swap`);

  const body = back
    ? `${front}<div class="page-break"></div>${back}`
    : front;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${fontHrefs.map((href) => `<link rel="stylesheet" href="${href}" />`).join('\n  ')}
  <style>
    @page {
      size: ${CARD_DIMENSIONS.bleed_width_mm}mm ${CARD_DIMENSIONS.bleed_height_mm}mm;
      margin: 0;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    img { max-width: 100%; }
    .page-break {
      page-break-after: always;
      break-after: page;
    }
  </style>
</head>
<body>
  ${body}
</body>
</html>`;
}
