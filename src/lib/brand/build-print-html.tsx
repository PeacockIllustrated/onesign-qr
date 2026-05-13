import { renderToStaticMarkup } from 'react-dom/server';
import type { BrandDesignHydrated } from '@/types/brand';
import { renderTemplate } from '@/components/brand/templates';
import { CARD_DIMENSIONS } from '@/lib/brand/templates';

/**
 * Build a complete HTML document for Puppeteer to render to PDF.
 *
 * Includes the brand's heading and body fonts loaded from Google Fonts so
 * the PDF embeds proper typography. The @page rule pins the PDF page size
 * to the card dimensions (including bleed) so there's no scaling.
 */
export function buildCardPrintHtml(design: BrandDesignHydrated): string {
  const body = renderToStaticMarkup(
    renderTemplate(design, { print: true }) as React.ReactElement
  );

  const fontParam = (font: string) => font.trim().replace(/\s+/g, '+');
  const fontHrefs = Array.from(new Set([design.profile.font_heading, design.profile.font_body]))
    .filter((f) => /^[A-Za-z0-9 ]+$/.test(f))
    .map((f) => `https://fonts.googleapis.com/css2?family=${fontParam(f)}:wght@400;500;600;700&display=swap`);

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
  </style>
</head>
<body>
  ${body}
</body>
</html>`;
}
