import type { BrandDesignHydrated, AvatarShape } from '@/types/brand';
import { resolveColors, pickLogo } from '@/lib/brand/hydrate';
import { CARD_DIMENSIONS } from '@/lib/brand/templates';
import { Avatar, getInitials, PrintBleed, isDarkColor, densityScale } from './shared';
import { CardBack, backBgColor } from './card-back';

/**
 * Bold Block — split-colour front, magazine-style drop cap.
 *
 * Front layout:
 *   - Left third filled solid in the primary colour.
 *   - Initial of the person's name sits huge inside the block,
 *     in secondary colour (i.e. inverted out of the block).
 *   - Right two-thirds: name, role and contact stack on secondary.
 *
 * Use case: confident, maximalist, agency / architecture / studio brands.
 */
export function CardBoldBlock({ design, side }: { design: BrandDesignHydrated; side: 'front' | 'back' }) {
  return side === 'front' ? <Front design={design} /> : <CardBack design={design} defaultStyle="solid-accent" />;
}

function Front({ design }: { design: BrandDesignHydrated }) {
  const colors = resolveColors(design);
  const { profile, person, person_photo_url } = design;
  const d = densityScale(design.config.density);
  const accent = colors.accent ?? colors.primary;
  const showAvatar = (design.config.avatar_shape ?? 'none') !== 'none';
  const avatarShape: AvatarShape = (design.config.avatar_shape as AvatarShape) ?? 'none';
  const { url: logoUrl, needsInvert } = pickLogo(design, isDarkColor(colors.secondary) ? 'dark' : 'light');
  const initial = (person?.full_name ?? 'A').trim().charAt(0).toUpperCase();
  const dividerStyle = design.config.divider_style ?? 'pipe';

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
      {/* Left colour block with drop-cap initial */}
      <div
        style={{
          width: '32mm',
          flexShrink: 0,
          backgroundColor: colors.primary,
          color: colors.secondary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: `'${profile.font_heading}', Georgia, serif`,
        }}
      >
        <span style={{ fontSize: '22mm', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 }}>
          {initial}
        </span>
      </div>

      {/* Right content */}
      <div
        style={{
          flex: 1,
          padding: `${5 * d}mm ${5 * d}mm`,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        {/* Header row: logo + optional avatar */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '3mm' }}>
          {logoUrl && design.config.show_logo !== false ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              style={{
                maxHeight: '6mm',
                maxWidth: '24mm',
                objectFit: 'contain',
                objectPosition: 'left center',
                filter: needsInvert ? 'brightness(0) invert(1)' : undefined,
              }}
            />
          ) : (
            <div />
          )}
          {showAvatar && (
            <Avatar
              src={person_photo_url}
              initials={getInitials(person?.full_name)}
              shape={avatarShape as 'circle' | 'square'}
              border={design.config.avatar_border ?? false}
              borderColor={design.config.avatar_border_color ?? accent}
              sizeMm={12}
              background={`${accent}20`}
            />
          )}
        </div>

        {/* Name + role pinned to centre */}
        <div style={{ marginTop: 'auto', marginBottom: 'auto' }}>
          <h1
            style={{
              margin: 0,
              fontFamily: `'${profile.font_heading}', Arial, sans-serif`,
              fontSize: '6mm',
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: '-0.02em',
            }}
          >
            {person?.full_name ?? 'Your Name'}
          </h1>
          {person?.role && (
            <p
              style={{
                margin: '1mm 0 0 0',
                fontSize: '2.4mm',
                fontWeight: 500,
                color: accent,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {person.role}
            </p>
          )}
        </div>

        {/* Contact pinned to bottom */}
        <div style={{ fontSize: '2.3mm', lineHeight: 1.4, opacity: 0.85 }}>
          {person?.email && <div>{person.email}</div>}
          {(person?.phone || (person?.mobile && design.config.show_mobile !== false)) && (
            <div>
              {[person?.phone, design.config.show_mobile !== false ? person?.mobile : null]
                .filter(Boolean)
                .join(dividerStyle === 'pipe' ? '  ·  ' : dividerStyle === 'dot' ? '  •  ' : dividerStyle === 'line' ? '  —  ' : '   ')}
            </div>
          )}
          {profile.website && <div>{profile.website.replace(/^https?:\/\//, '')}</div>}
        </div>
      </div>
    </article>
  );
}

export function CardBoldBlockPrint({ design, side }: { design: BrandDesignHydrated; side: 'front' | 'back' }) {
  const colors = resolveColors(design);
  const bg = side === 'front' ? colors.secondary : backBgColor(design, 'solid-accent');
  return (
    <PrintBleed bgColor={bg}>
      <CardBoldBlock design={design} side={side} />
    </PrintBleed>
  );
}
