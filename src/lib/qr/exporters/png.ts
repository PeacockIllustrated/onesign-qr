/**
 * PNG export using Sharp
 *
 * Sharp is used for high-quality rasterization of SVG to PNG
 */

import sharp from 'sharp';

/**
 * Convert SVG string to PNG buffer
 */
export async function svgToPng(
  svgString: string,
  width: number
): Promise<Buffer> {
  const svgBuffer = Buffer.from(svgString);

  const pngBuffer = await sharp(svgBuffer)
    .resize(width, width, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png({
      compressionLevel: 9,
      quality: 100,
    })
    .toBuffer();

  return pngBuffer;
}

/**
 * Convert SVG string to PNG data URL
 */
export async function svgToPngDataURL(
  svgString: string,
  width: number
): Promise<string> {
  const pngBuffer = await svgToPng(svgString, width);
  const base64 = pngBuffer.toString('base64');
  return `data:image/png;base64,${base64}`;
}

/**
 * Convert SVG string to PNG with transparency
 */
export async function svgToPngTransparent(
  svgString: string,
  width: number
): Promise<Buffer> {
  const svgBuffer = Buffer.from(svgString);

  const pngBuffer = await sharp(svgBuffer)
    .resize(width, width, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({
      compressionLevel: 9,
    })
    .toBuffer();

  return pngBuffer;
}
