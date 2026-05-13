import type { BrandDesignHydrated, CardBackStyle } from '@/types/brand';
import { resolveColors, pickLogo } from '@/lib/brand/hydrate';
import { CARD_DIMENSIONS } from '@/lib/brand/templates';
import { PrintBleed, isDarkColor } from './shared';

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
  return side === 'front' ? <Front design={design} /> : <Back design={design} />;
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

function Back({ design }: { design: BrandDesignHydrated }) {
  const colors = resolveColors(design);
  const { profile } = design;
  const tagline = design.config.tagline ?? profile.tagline;
  const accent = colors.accent ?? colors.primary;
  const backStyle: CardBackStyle = design.config.back_style ?? 'logo-centered';
  const { url: logoUrl, needsInvert } = pickLogo(
    design,
    backStyle === 'logo-centered' && !isDarkColor(colors.secondary) ? 'light' : 'dark',
  );

  // Logo-centered (default for Minimal): a tiny logo on the same colour as
  // the front, with a single hairline rule. Quiet. Other back-styles handled
  // generically.
  if (backStyle === 'logo-centered') {
    return (
      <article
        style={{
          width: `${CARD_DIMENSIONS.width_mm}mm`,
          height: `${CARD_DIMENSIONS.height_mm}mm`,
          backgroundColor: colors.secondary,
          color: colors.primary,
          fontFamily: `'${profile.font_body}', Arial, sans-serif`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3mm',
          padding: '6mm',
          position: 'relative',
        }}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            style={{
              maxHeight: '10mm',
              maxWidth: '40mm',
              objectFit: 'contain',
              filter: needsInvert ? 'brightness(0) invert(1)' : undefined,
            }}
          />
        ) : (
          <span style={{ fontSize: '5mm', fontFamily: `'${profile.font_heading}', Georgia, serif`, fontWeight: 400 }}>
            {profile.name}
          </span>
        )}
        <div style={{ width: '8mm', height: '0.3mm', backgroundColor: accent }} />
        {tagline && (
          <p
            style={{
              fontSize: '2.2mm',
              fontStyle: 'italic',
              opacity: 0.55,
              margin: 0,
              textAlign: 'center',
              maxWidth: '60mm',
              lineHeight: 1.4,
            }}
          >
            {tagline}
          </p>
        )}
      </article>
    );
  }

  // Solid-accent / monogram — render generic solid back.
  const bg = backStyle === 'monogram' || backStyle === 'solid-accent' ? accent : colors.primary;
  return (
    <article
      style={{
        width: `${CARD_DIMENSIONS.width_mm}mm`,
        height: `${CARD_DIMENSIONS.height_mm}mm`,
        backgroundColor: bg,
        color: colors.secondary,
        fontFamily: `'${profile.font_heading}', Georgia, serif`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6mm',
      }}
    >
      {backStyle === 'monogram' ? (
        <span style={{ fontSize: '24mm', fontWeight: 400, letterSpacing: '-0.02em' }}>
          {profile.name.charAt(0).toUpperCase()}
        </span>
      ) : tagline ? (
        <p style={{ fontSize: '4mm', textAlign: 'center', margin: 0, maxWidth: '60mm', fontWeight: 400, lineHeight: 1.3 }}>
          {tagline}
        </p>
      ) : (
        <span style={{ fontSize: '5mm', fontWeight: 400 }}>{profile.name}</span>
      )}
    </article>
  );
}

export function CardMinimalTypePrint({ design, side }: { design: BrandDesignHydrated; side: 'front' | 'back' }) {
  const colors = resolveColors(design);
  const accent = colors.accent ?? colors.primary;
  const bs = design.config.back_style ?? 'logo-centered';
  const bg = side === 'front' ? colors.secondary : bs === 'logo-centered' ? colors.secondary : accent;
  return (
    <PrintBleed bgColor={bg}>
      <CardMinimalType design={design} side={side} />
    </PrintBleed>
  );
}
