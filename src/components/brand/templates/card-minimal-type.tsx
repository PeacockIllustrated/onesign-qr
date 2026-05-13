import type { BrandDesignHydrated } from '@/types/brand';
import { resolveColors } from '@/lib/brand/hydrate';
import { CARD_DIMENSIONS } from '@/lib/brand/templates';
import { PrintBleed } from './shared';
import { CardBack, backBgColor } from './card-back';

/**
 * Minimal Type — pure typography, lots of negative space.
 *
 * Front layout:
 *   - Name centred in a generous heading face.
 *   - Single hairline rule under the name in accent colour.
 *   - Role + contact set very small, centred at the bottom.
 *   - No logo on the front (intentionally — let the type breathe).
 *
 * Use case: editorial, authors, photographers, anyone whose name is the brand.
 */
export function CardMinimalType({ design, side }: { design: BrandDesignHydrated; side: 'front' | 'back' }) {
  return side === 'front' ? <Front design={design} /> : <CardBack design={design} defaultStyle="logo-centered" />;
}

function Front({ design }: { design: BrandDesignHydrated }) {
  const colors = resolveColors(design);
  const { profile, person } = design;
  const accent = colors.accent ?? colors.primary;
  const dividerStyle = design.config.divider_style ?? 'pipe';
  const sep = dividerStyle === 'pipe' ? '  ·  ' : dividerStyle === 'dot' ? '  •  ' : dividerStyle === 'line' ? '  —  ' : '   ';

  const contactBits: string[] = [];
  if (person?.email) contactBits.push(person.email);
  if (person?.phone) contactBits.push(person.phone);
  if (design.config.show_mobile !== false && person?.mobile) contactBits.push(person.mobile);
  if (profile.website) contactBits.push(profile.website.replace(/^https?:\/\//, ''));

  return (
    <article
      style={{
        width: `${CARD_DIMENSIONS.width_mm}mm`,
        height: `${CARD_DIMENSIONS.height_mm}mm`,
        backgroundColor: colors.secondary,
        color: colors.primary,
        fontFamily: `'${profile.font_body}', Arial, sans-serif`,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6mm',
        boxSizing: 'border-box',
        textAlign: 'center',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: `'${profile.font_heading}', Georgia, serif`,
          fontSize: '7.5mm',
          fontWeight: 400,
          letterSpacing: '-0.015em',
          lineHeight: 1,
        }}
      >
        {person?.full_name ?? 'Your Name'}
      </h1>
      <div
        style={{
          width: '14mm',
          height: '0.3mm',
          backgroundColor: accent,
          margin: '3mm 0',
        }}
      />
      {person?.role && (
        <p
          style={{
            margin: 0,
            fontSize: '2.2mm',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: accent,
            fontWeight: 500,
          }}
        >
          {person.role}
        </p>
      )}
      {contactBits.length > 0 && (
        <p
          style={{
            position: 'absolute',
            bottom: '6mm',
            left: '6mm',
            right: '6mm',
            margin: 0,
            fontSize: '2mm',
            opacity: 0.6,
            letterSpacing: '0.02em',
          }}
        >
          {contactBits.join(sep)}
        </p>
      )}
    </article>
  );
}

export function CardMinimalTypePrint({ design, side }: { design: BrandDesignHydrated; side: 'front' | 'back' }) {
  const colors = resolveColors(design);
  const bg = side === 'front' ? colors.secondary : backBgColor(design, 'logo-centered');
  return (
    <PrintBleed bgColor={bg}>
      <CardMinimalType design={design} side={side} />
    </PrintBleed>
  );
}
