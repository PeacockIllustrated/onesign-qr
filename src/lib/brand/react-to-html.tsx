import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';

/** Render a React element to a static HTML string for server-side template emission. */
export function reactToHtml(element: ReactElement): string {
  return renderToStaticMarkup(element);
}
