import chromium from '@sparticuz/chromium-min';
import puppeteer, { type Browser } from 'puppeteer-core';

/**
 * Launch a headless Chromium for PDF generation.
 *
 * On Vercel/production: downloads the chromium binary on cold start from
 * BRAND_CHROMIUM_URL (a public tarball, e.g. the @sparticuz/chromium release
 * asset hosted on Vercel Blob or GitHub).
 *
 * Locally: set BRAND_LOCAL_CHROME_PATH to your installed Chrome/Edge binary.
 *
 * Required env:
 *   BRAND_CHROMIUM_URL          - public URL to chromium-vXXX-pack.tar (Vercel)
 *   BRAND_LOCAL_CHROME_PATH     - filesystem path to Chrome (local dev only)
 */
export async function launchChromium(): Promise<Browser> {
  const localPath = process.env.BRAND_LOCAL_CHROME_PATH;
  if (localPath) {
    return puppeteer.launch({
      executablePath: localPath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  const binaryUrl = process.env.BRAND_CHROMIUM_URL;
  if (!binaryUrl) {
    throw new Error(
      'Chromium not configured: set BRAND_CHROMIUM_URL (production) or BRAND_LOCAL_CHROME_PATH (local)'
    );
  }

  return puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(binaryUrl),
    headless: true,
  });
}
