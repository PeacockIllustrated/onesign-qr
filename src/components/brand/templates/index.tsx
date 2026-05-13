import { CardClassic } from './card-classic';
import { SigClassic } from './sig-classic';
import type { BrandDesignHydrated } from '@/types/brand';

/** Render a design with the right template component. */
export function renderTemplate(design: BrandDesignHydrated, opts: { print?: boolean } = {}) {
  switch (design.template_id) {
    case 'card-classic':
      return <CardClassic design={design} print={opts.print} />;
    case 'sig-classic':
      return <SigClassic design={design} />;
    default:
      return null;
  }
}

export { CardClassic, SigClassic };
