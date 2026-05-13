import type { BrandDesignHydrated } from '@/types/brand';
import { resolveColors, pickLogo } from '@/lib/brand/hydrate';
import { CARD_DIMENSIONS } from '@/lib/brand/templates';
import { getInitials, PrintBleed, isDarkColor } from './shared';
import { CardBack, backBgColor } from './card-back';

/**
 * Portrait — the front is dominated by a photo of the person.
 *
 * Front layout:
 *   - Left ~50% of the card: full-bleed person photo (or a coloured fallback
 *     with their initials if no photo).
 *   - Right ~50%: name, role, contact stack — typographic and tight.
 *
 * Use case: client-facing roles where personal recognition matters — real
 * estate, sales, recruiting, advisors, talent.
 *
 * Best with a photo uploaded for the person; falls back gracefully to a
 * colour-block with initials if none is set.
 */
export function CardPortrait({ design, side }: { design: BrandDesignHydrated; side: 'front' | 'back' }) {
  return side === 'front' ? <Front design={design} /> : <CardBack design={design} defaultStyle="logo-centered" />;
}

function Front({ design }: { design: BrandDesignHydrated }) {
  const colors = resolveColors(design);
  const { profile, person, person_photo_url } = design;
  const accent = colors.accent ?? colors.primary;
  const { url: logoUrl, needsInvert } = pickLogo(design, isDarkColor(colors.secondary) ? 'dark' : 'light');
  const photoSurfaceDark = !person_photo_url; // colour block fallback uses primary
  const initials = getInitials(person?.full_name);

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
      }}
    >
      {/* Left half: photo (or fallback) */}
      <div
        style={{
          width: '42mm',
          flexShrink: 0,
          backgroundColor: photoSurfaceDark ? colors.primary : '#000',
          color: colors.secondary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {person_photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person_photo_url}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
            }}
          />
        ) : (
          <span
            style={{
              fontSize: '18mm',
              fontFamily: `'${profile.font_heading}', Georgia, serif`,
              fontWeight: 600,
              letterSpacing: '-0.02em',
            }}
          >
            {initials}
          </span>
        )}
      </div>

      {/* Right half: type stack */}
      <div
        style={{
          flex: 1,
          padding: '5mm 5mm 5mm 5mm',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        {/* Top: logo */}
        {logoUrl && design.config.show_logo !== false && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            style={{
              maxHeight: '6mm',
              maxWidth: '28mm',
              objectFit: 'contain',
              objectPosition: 'left center',
              filter: needsInvert ? 'brightness(0) invert(1)' : undefined,
            }}
          />
        )}

        {/* Middle: name + role */}
        <div style={{ marginTop: 'auto', marginBottom: 'auto' }}>
          <h1
            style={{
              margin: 0,
              fontFamily: `'${profile.font_heading}', Arial, sans-serif`,
              fontSize: '5mm',
              fontWeight: 600,
              letterSpacing: '-0.015em',
              lineHeight: 1.05,
            }}
          >
            {person?.full_name ?? 'Your Name'}
          </h1>
          {person?.role && (
            <p
              style={{
                margin: '1mm 0 0 0',
                fontSize: '2.3mm',
                color: accent,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontWeight: 500,
              }}
            >
              {person.role}
            </p>
          )}
        </div>

        {/* Bottom: contact */}
        <div style={{ fontSize: '2.2mm', lineHeight: 1.45, opacity: 0.85 }}>
          {person?.email && <div>{person.email}</div>}
          {person?.phone && <div>{person.phone}</div>}
          {design.config.show_mobile !== false && person?.mobile && <div>{person.mobile}</div>}
          {profile.website && <div>{profile.website.replace(/^https?:\/\//, '')}</div>}
        </div>
      </div>
    </article>
  );
}

export function CardPortraitPrint({ design, side }: { design: BrandDesignHydrated; side: 'front' | 'back' }) {
  const colors = resolveColors(design);
  const bg = side === 'front' ? colors.secondary : backBgColor(design, 'logo-centered');
  return (
    <PrintBleed bgColor={bg}>
      <CardPortrait design={design} side={side} />
    </PrintBleed>
  );
}
