import type { BrandDesignHydrated, AvatarShape } from '@/types/brand';
import { resolveColors, pickLogo } from '@/lib/brand/hydrate';
import { CARD_DIMENSIONS } from '@/lib/brand/templates';
import { Avatar, getInitials, PrintBleed, isDarkColor, type SideProps } from './shared';
import { CardBack, backBgColor } from './card-back';

/**
 * Classic+ business card — editorial, asymmetric, type-led.
 *
 * Front layout:
 *   - Top-left: logo (or accent rule if no logo).
 *   - Middle-left: name (large, heading font), role (small, tracked).
 *   - Bottom: thin accent rule then contact stack.
 *   - Right column: optional avatar.
 *
 * Back layout chosen by design.config.back_style:
 *   - 'logo-centered' (default) — logo + tagline on solid secondary.
 *   - 'solid-accent' — full-bleed accent colour with small logo bottom-right.
 *   - 'monogram' — large initials on solid accent.
 */
export function CardClassicPlus({ design, side }: SideProps & { side: 'front' | 'back' }) {
  return side === 'front'
    ? <CardClassicPlusFront design={design} />
    : <CardBack design={design} defaultStyle="logo-centered" />;
}

function CardClassicPlusFront({ design }: { design: BrandDesignHydrated }) {
  const colors = resolveColors(design);
  const { profile, person, person_photo_url } = design;
  // Front uses the secondary colour as background — pick logo accordingly.
  const frontSurface = isDarkColor(colors.secondary) ? 'dark' : 'light';
  const { url: logoUrl, needsInvert: logoNeedsInvert } = pickLogo(design, frontSurface);
  const avatarShape: AvatarShape = design.config.avatar_shape ?? 'none';
  const avatarBorder = design.config.avatar_border ?? false;
  const avatarBorderColor = design.config.avatar_border_color ?? colors.accent ?? colors.primary;
  const showAvatar = avatarShape !== 'none' && (person_photo_url !== null || person !== null);

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
        padding: '5mm 6mm',
        boxSizing: 'border-box',
        display: 'flex',
        gap: '4mm',
      }}
    >
      {/* Left column: type-led */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Logo lockup */}
        {logoUrl && design.config.show_logo !== false ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            style={{
              maxHeight: '8mm',
              maxWidth: '30mm',
              objectFit: 'contain',
              objectPosition: 'left center',
              display: 'block',
              filter: logoNeedsInvert ? 'brightness(0) invert(1)' : undefined,
            }}
          />
        ) : (
          <div
            style={{
              width: '12mm',
              height: '0.7mm',
              backgroundColor: colors.accent ?? colors.primary,
              marginTop: '1mm',
            }}
          />
        )}

        {/* Name + role */}
        <div style={{ marginTop: 'auto' }}>
          <h1
            style={{
              margin: 0,
              fontFamily: `'${profile.font_heading}', Georgia, serif`,
              fontSize: '5.4mm',
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: '-0.01em',
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
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: colors.accent ?? colors.primary,
                opacity: 0.85,
              }}
            >
              {person.role}
            </p>
          )}
        </div>

        {/* Accent rule */}
        <div
          style={{
            width: '8mm',
            height: '0.4mm',
            backgroundColor: colors.accent ?? colors.primary,
            margin: '3mm 0 2mm 0',
          }}
        />

        {/* Contact stack */}
        <div style={{ fontSize: '2.4mm', lineHeight: 1.5, opacity: 0.85 }}>
          {person?.email && <div>{person.email}</div>}
          {(person?.phone || person?.mobile) && (
            <div>{[person.phone, person.mobile].filter(Boolean).join('   ·   ')}</div>
          )}
          {profile.website && <div>{profile.website.replace(/^https?:\/\//, '')}</div>}
        </div>
      </div>

      {/* Right column: avatar */}
      {showAvatar && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Avatar
            src={person_photo_url}
            initials={getInitials(person?.full_name)}
            shape={avatarShape as 'circle' | 'square'}
            border={avatarBorder}
            borderColor={avatarBorderColor}
            sizeMm={28}
            background={colors.accent ? colors.accent + '20' : '#00000010'}
          />
        </div>
      )}
    </article>
  );
}

/** Print-mode wrapper used by the PDF pipeline. */
export function CardClassicPlusPrint({ design, side }: { design: BrandDesignHydrated; side: 'front' | 'back' }) {
  const colors = resolveColors(design);
  const bg = side === 'front' ? colors.secondary : backBgColor(design, 'logo-centered');
  return (
    <PrintBleed bgColor={bg}>
      <CardClassicPlus design={design} side={side} />
    </PrintBleed>
  );
}
