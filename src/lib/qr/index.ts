/**
 * QR code generation module
 *
 * This module provides complete QR code generation with:
 * - Matrix generation using 'qrcode' npm package
 * - Custom styling (shapes, colors, logos)
 * - Export to SVG, PNG, and PDF formats
 */

export {
  generateQRMatrix,
  generateBasicSVG,
  generateBasicPNGDataURL,
  generateBasicPNGBuffer,
  getQRContent,
  getRecommendedErrorCorrection,
} from './generator';

export {
  getModulePath,
  getFinderPatternPaths,
  isFinderPattern,
  isFinderSeparator,
  type ModuleShape,
  type EyeShape,
} from './shapes';

export {
  buildStyledSVG,
  buildSimpleSVG,
  type SVGOptions,
} from './svg-builder';

export {
  svgToBlob,
  svgToDataURL,
  svgToBase64DataURL,
  optimizeSVG,
} from './exporters/svg';

export {
  svgToPng,
  svgToPngDataURL,
  svgToPngTransparent,
} from './exporters/png';

export {
  svgToPdf,
  createPresetPdf,
  type PDFOptions,
} from './exporters/pdf';
