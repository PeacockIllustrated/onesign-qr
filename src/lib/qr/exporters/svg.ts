/**
 * SVG export utilities
 */

/**
 * Convert SVG string to a downloadable blob
 */
export function svgToBlob(svgString: string): Blob {
  return new Blob([svgString], { type: 'image/svg+xml' });
}

/**
 * Get SVG as a data URL
 */
export function svgToDataURL(svgString: string): string {
  const encoded = encodeURIComponent(svgString);
  return `data:image/svg+xml,${encoded}`;
}

/**
 * Get SVG as a base64 data URL
 */
export function svgToBase64DataURL(svgString: string): string {
  const base64 = Buffer.from(svgString).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Optimize SVG string (basic cleanup)
 */
export function optimizeSVG(svgString: string): string {
  return svgString
    // Remove comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove unnecessary whitespace
    .replace(/\s+/g, ' ')
    // Remove whitespace around tags
    .replace(/>\s+</g, '><')
    // Trim
    .trim();
}
