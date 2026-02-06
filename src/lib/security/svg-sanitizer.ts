/**
 * DOMPurify configuration that allows only safe SVG elements and attributes.
 * Blocks script injection, event handlers, and dangerous SVG features
 * like foreignObject (which can embed arbitrary HTML).
 *
 * Used wherever SVG content is rendered via dangerouslySetInnerHTML
 * or passed to Blob constructors for export.
 */
export const SVG_PURIFY_CONFIG = {
  USE_PROFILES: { svg: true, svgFilters: true },
  ADD_TAGS: [
    'svg', 'rect', 'circle', 'path', 'g', 'defs',
    'clipPath', 'use', 'image', 'polygon', 'polyline',
    'line', 'ellipse',
  ],
  ADD_ATTR: [
    'viewBox', 'fill', 'stroke', 'stroke-width', 'd',
    'cx', 'cy', 'r', 'x', 'y', 'width', 'height',
    'rx', 'ry', 'xmlns', 'shape-rendering', 'transform',
    'clip-path', 'href', 'preserveAspectRatio', 'points',
    'x1', 'y1', 'x2', 'y2', 'opacity', 'fill-opacity',
    'stroke-opacity', 'stroke-linecap', 'stroke-linejoin',
  ],
  FORBID_TAGS: [
    'script', 'style', 'foreignObject', 'iframe',
    'object', 'embed', 'animate', 'set', 'a',
  ],
  FORBID_ATTR: [
    'onload', 'onclick', 'onerror', 'onmouseover',
    'onmouseout', 'onfocus', 'onblur', 'onanimationend',
    'ontransitionend', 'xlink:href',
  ],
};
