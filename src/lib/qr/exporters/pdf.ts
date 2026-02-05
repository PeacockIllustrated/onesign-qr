/**
 * PDF export using pdf-lib
 *
 * Creates PDFs with embedded QR codes at specified sizes
 */

import { PDFDocument, rgb } from 'pdf-lib';
import { svgToPng } from './png';

// Convert mm to PDF points (72 points = 1 inch, 1 inch = 25.4 mm)
const MM_TO_POINTS = 72 / 25.4;

export interface PDFOptions {
  // Page size in mm
  pageWidth: number;
  pageHeight: number;
  // QR size in mm (defaults to fit page with margins)
  qrSize?: number;
  // Margins in mm
  margin?: number;
  // Include bleed area
  bleed?: number;
}

/**
 * Create a PDF with a QR code
 */
export async function svgToPdf(
  svgString: string,
  options: PDFOptions
): Promise<Uint8Array> {
  const {
    pageWidth,
    pageHeight,
    margin = 10,
    bleed = 0,
  } = options;

  // Calculate dimensions in points
  const totalWidth = (pageWidth + bleed * 2) * MM_TO_POINTS;
  const totalHeight = (pageHeight + bleed * 2) * MM_TO_POINTS;
  const marginPts = margin * MM_TO_POINTS;
  const bleedPts = bleed * MM_TO_POINTS;

  // Calculate QR size
  const availableWidth = totalWidth - (marginPts + bleedPts) * 2;
  const availableHeight = totalHeight - (marginPts + bleedPts) * 2;
  const qrSizePts = options.qrSize
    ? options.qrSize * MM_TO_POINTS
    : Math.min(availableWidth, availableHeight);

  // Create PDF document
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([totalWidth, totalHeight]);

  // Fill background white
  page.drawRectangle({
    x: 0,
    y: 0,
    width: totalWidth,
    height: totalHeight,
    color: rgb(1, 1, 1),
  });

  // Convert SVG to PNG for embedding
  // Use high resolution for print quality
  const pngSize = Math.max(2048, Math.ceil(qrSizePts * 4));
  const pngBuffer = await svgToPng(svgString, pngSize);

  // Embed PNG image
  const pngImage = await pdfDoc.embedPng(pngBuffer);

  // Calculate position to center QR
  const x = (totalWidth - qrSizePts) / 2;
  const y = (totalHeight - qrSizePts) / 2;

  // Draw QR code
  page.drawImage(pngImage, {
    x,
    y,
    width: qrSizePts,
    height: qrSizePts,
  });

  // Draw bleed marks if bleed is specified
  if (bleed > 0) {
    const markLength = 10;
    const markColor = rgb(0, 0, 0);

    // Top-left corner marks
    page.drawLine({
      start: { x: bleedPts, y: totalHeight - bleedPts },
      end: { x: bleedPts, y: totalHeight - bleedPts - markLength },
      color: markColor,
      thickness: 0.5,
    });
    page.drawLine({
      start: { x: bleedPts, y: totalHeight - bleedPts },
      end: { x: bleedPts + markLength, y: totalHeight - bleedPts },
      color: markColor,
      thickness: 0.5,
    });

    // Top-right corner marks
    page.drawLine({
      start: { x: totalWidth - bleedPts, y: totalHeight - bleedPts },
      end: { x: totalWidth - bleedPts, y: totalHeight - bleedPts - markLength },
      color: markColor,
      thickness: 0.5,
    });
    page.drawLine({
      start: { x: totalWidth - bleedPts, y: totalHeight - bleedPts },
      end: { x: totalWidth - bleedPts - markLength, y: totalHeight - bleedPts },
      color: markColor,
      thickness: 0.5,
    });

    // Bottom-left corner marks
    page.drawLine({
      start: { x: bleedPts, y: bleedPts },
      end: { x: bleedPts, y: bleedPts + markLength },
      color: markColor,
      thickness: 0.5,
    });
    page.drawLine({
      start: { x: bleedPts, y: bleedPts },
      end: { x: bleedPts + markLength, y: bleedPts },
      color: markColor,
      thickness: 0.5,
    });

    // Bottom-right corner marks
    page.drawLine({
      start: { x: totalWidth - bleedPts, y: bleedPts },
      end: { x: totalWidth - bleedPts, y: bleedPts + markLength },
      color: markColor,
      thickness: 0.5,
    });
    page.drawLine({
      start: { x: totalWidth - bleedPts, y: bleedPts },
      end: { x: totalWidth - bleedPts - markLength, y: bleedPts },
      color: markColor,
      thickness: 0.5,
    });
  }

  return pdfDoc.save();
}

/**
 * Create a PDF with common preset sizes
 */
export async function createPresetPdf(
  svgString: string,
  preset: 'sticker-50mm' | 'sticker-75mm' | 'sticker-100mm' | 'a4'
): Promise<Uint8Array> {
  const presets = {
    'sticker-50mm': { pageWidth: 50, pageHeight: 50, margin: 2 },
    'sticker-75mm': { pageWidth: 75, pageHeight: 75, margin: 3 },
    'sticker-100mm': { pageWidth: 100, pageHeight: 100, margin: 5 },
    'a4': { pageWidth: 210, pageHeight: 297, margin: 20 },
  };

  const options = presets[preset];
  return svgToPdf(svgString, options);
}
