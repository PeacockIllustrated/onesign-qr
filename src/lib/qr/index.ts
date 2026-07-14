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
  type FrameShape,
} from './shapes';

export {
  buildCircleFrame,
  buildRadialFrame,
  escapeXml,
  FRAME_LABEL_MAX_LENGTH,
  RADIAL_RING_COUNT,
  type CircleFrameOptions,
  type CircleFrameResult,
  type RadialFrameOptions,
  type RadialFrameResult,
} from './frames';

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
