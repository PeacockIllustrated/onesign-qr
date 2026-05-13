import type { BrandDesignHydrated, AvatarShape, CardBackStyle } from '@/types/brand';
import { resolveColors, pickLogo } from '@/lib/brand/hydrate';
import { CARD_DIMENSIONS } from '@/lib/brand/templates';
import { Avatar, getInitials, PrintBleed, isDarkColor } from './shared';

/**
 * Diagonal — dynamic accent stripe slanted across the card.
 *
 * Front layout:
 *   - Diagonal band in accent colour runs corner to corner.
 *   - Name + role sit on the band, set in white.
 *   - Logo top-right corner above the band.
 *   - Contact stack bottom-left below the band.
 *
 * Use case: tech startups, creative agencies, modern services.
 */
export function CardDiagonal({ design, side }: { design: BrandDesignHydrated; side: 'front' | 'back' }) {
  return side === 'front' ? <Front design={design} /> : <Back design={design} />;
}

function Front({ design }: { design: BrandDesignHydrated }) {
  const colors = resolveColors(design);
  const { profile, person, person_photo_url } = design;
  const accent = colors.accent ?? colors.primary;
  const showAvatar = (design.config.avatar_shape ?? 'none') !== 'none';
  const avatarShape: AvatarShape = (design.config.avatar_shape as AvatarShape) ?? 'none';
  const { url: logoUrl, needsInvert } = pickLogo(design, isDarkColor(colors.secondary) ? 'dark' : 'light');

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
        boxSizing: 'border-box',
      }}
    >
      {/* Diagonal band — uses an absolutely positioned, rotated rectangle wide enough to cover */}
      <div
        style={{
          position: 'absolute',
          top: '-20mm',
          left: '-10mm',
          right: '-10mm',
          height: '32mm',
          backgroundColor: accent,
          transform: 'rotate(-12deg)',
          transformOrigin: '50% 50%',
          zIndex: 1,
        }}
      />

      {/* Top-right: logo above the band */}
      {logoUrl && design.config.show_logo !== false && (
        <div style={{ position: 'absolute', top: '5mm', right: '5mm', zIndex: 3 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt=""
            style={{
              maxHeight: '6mm',
              maxWidth: '24mm',
              objectFit: 'contain',
              objectPosition: 'right center',
              filter: needsInvert ? 'brightness(0) invert(1)' : undefined,
            }}
          />
        </div>
      )}

      {/* Centre-left: name on the band */}
      <div
        style={{
          position: 'absolute',
          left: '6mm',
          top: '17mm',
          right: '6mm',
          zIndex: 3,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: '4mm',
        }}
      >
        {showAvatar && (
          <Avatar
            src={person_photo_url}
            initials={getInitials(person?.full_name)}
            shape={avatarShape as 'circle' | 'square'}
            border={design.config.avatar_border ?? true}
            borderColor={design.config.avatar_border_color ?? '#fff'}
            sizeMm={14}
            background={`${colors.primary}30`}
          />
        )}
        <div>
          <h1
            style={{
              margin: 0,
              fontFamily: `'${profile.font_heading}', Arial, sans-serif`,
              fontSize: '5.4mm',
              fontWeight: 700,
              letterSpacing: '-0.015em',
              lineHeight: 1.05,
            }}
          >
            {person?.full_name ?? 'Your Name'}
          </h1>
          {person?.role && (
            <p
              style={{
                margin: '0.5mm 0 0 0',
                fontSize: '2.3mm',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                opacity: 0.95,
              }}
            >
              {person.role}
            </p>
          )}
        </div>
      </div>

      {/* Bottom-left: contact below the band */}
      <div
        style={{
          position: 'absolute',
          left: '6mm',
          bottom: '5mm',
          right: '6mm',
          zIndex: 3,
          fontSize: '2.3mm',
          lineHeight: 1.5,
          color: colors.primary,
          opacity: 0.85,
        }}
      >
        {person?.email && <div>{person.email}</div>}
        {(person?.phone || (design.config.show_mobile !== false && person?.mobile)) && (
          <div>{[person?.phone, design.config.show_mobile !== false ? person?.mobile : null].filter(Boolean).join('   ·   ')}</div>
        )}
        {profile.website && <div>{profile.website.replace(/^https?:\/\//, '')}</div>}
      </div>
    </article>
  );
}

function Back({ design }: { design: BrandDesignHydrated }) {
  const colors = resolveColors(design);
  const { profile } = design;
  const accent = colors.accent ?? colors.primary;
  const tagline = design.config.tagline ?? profile.tagline;
  const backStyle: CardBackStyle = design.config.back_style ?? 'solid-accent';
  const { url: logoUrl, needsInvert } = pickLogo(design, 'dark');

  return (
    <article
      style={{
        width: `${CARD_DIMENSIONS.width_mm}mm`,
        height: `${CARD_DIMENSIONS.height_mm}mm`,
        backgroundColor: backStyle === 'logo-centered' ? colors.primary : accent,
        color: colors.secondary,
        fontFamily: `'${profile.font_heading}', Arial, sans-serif`,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6mm',
        flexDirection: 'column',
        gap: '3mm',
      }}
    >
      {/* Subtle diagonal line echo */}
      <div
        style={{
          position: 'absolute',
          top: '-20mm',
          left: '-10mm',
          right: '-10mm',
          height: '32mm',
          backgroundColor: 'rgba(255,255,255,0.07)',
          transform: 'rotate(-12deg)',
        }}
      />
      {backStyle === 'monogram' ? (
        <span style={{ fontSize: '26mm', fontWeight: 800, letterSpacing: '-0.04em' }}>
          {profile.name.charAt(0).toUpperCase()}
        </span>
      ) : logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          style={{
            maxHeight: '14mm',
            maxWidth: '52mm',
            objectFit: 'contain',
            filter: needsInvert ? 'brightness(0) invert(1)' : undefined,
            zIndex: 1,
          }}
        />
      ) : (
        <span style={{ fontSize: '6mm', fontWeight: 700, zIndex: 1 }}>{profile.name}</span>
      )}
      {tagline && backStyle !== 'monogram' && (
        <p style={{ fontSize: '2.4mm', fontStyle: 'italic', opacity: 0.8, margin: 0, textAlign: 'center', maxWidth: '55mm', zIndex: 1 }}>
          {tagline}
        </p>
      )}
    </article>
  );
}

export function CardDiagonalPrint({ design, side }: { design: BrandDesignHydrated; side: 'front' | 'back' }) {
  const colors = resolveColors(design);
  const accent = colors.accent ?? colors.primary;
  const bs = design.config.back_style ?? 'solid-accent';
  const bg = side === 'front' ? colors.secondary : bs === 'logo-centered' ? colors.primary : accent;
  return (
    <PrintBleed bgColor={bg}>
      <CardDiagonal design={design} side={side} />
    </PrintBleed>
  );
}
