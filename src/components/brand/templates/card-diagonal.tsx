import type { BrandDesignHydrated, AvatarShape, CardBackStyle } from '@/types/brand';
import { resolveColors, pickLogo } from '@/lib/brand/hydrate';
import { CARD_DIMENSIONS } from '@/lib/brand/templates';
import { Avatar, getInitials, PrintBleed, isDarkColor } from './shared';

/**
 * Diagonal — dynamic accent band slanted across the card.
 *
 * The band is rendered as an SVG parallelogram with explicit corner
 * coordinates (the previous CSS-rotation approach mis-positioned the rect
 * off the card and the name text vanished onto a white background).
 *
 * Front layout:
 *   - Diagonal band (accent colour) cuts across the middle of the card.
 *   - Logo sits top-right above the band.
 *   - Name and role sit ON the band in the secondary colour (high contrast).
 *   - Contact stack sits bottom-left below the band in the primary colour.
 *
 * Use case: tech startups, creative agencies, modern services.
 */
export function CardDiagonal({ design, side }: { design: BrandDesignHydrated; side: 'front' | 'back' }) {
  return side === 'front' ? <Front design={design} /> : <Back design={design} />;
}

// Band coordinates in mm, as a parallelogram. Tweaked so:
// - the band visibly crosses the card middle
// - there's clear space top-right for the logo
// - there's clear space bottom-left for contact details
const BAND_POLYGON = '0,18 85,8 85,30 0,40';
const BAND_CENTRE_Y_MM = 24; // for absolute-positioning text on the band

function Front({ design }: { design: BrandDesignHydrated }) {
  const colors = resolveColors(design);
  const { profile, person, person_photo_url } = design;
  const accent = colors.accent ?? colors.primary;
  const showAvatar = (design.config.avatar_shape ?? 'none') !== 'none';
  const avatarShape: AvatarShape = (design.config.avatar_shape as AvatarShape) ?? 'none';
  // Front is the secondary colour. Pick the logo variant for that surface.
  const frontSurface = isDarkColor(colors.secondary) ? 'dark' : 'light';
  const { url: logoUrl, needsInvert } = pickLogo(design, frontSurface);
  // Text ON the band uses the secondary colour for guaranteed contrast.
  const onBandColor = isDarkColor(accent) ? '#ffffff' : '#000000';

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
      {/* The diagonal band, drawn as an SVG that fills the card */}
      <svg
        viewBox={`0 0 ${CARD_DIMENSIONS.width_mm} ${CARD_DIMENSIONS.height_mm}`}
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <polygon points={BAND_POLYGON} fill={accent} />
      </svg>

      {/* Top-right: logo (above the band) */}
      {logoUrl && design.config.show_logo !== false && (
        <div style={{ position: 'absolute', top: '4mm', right: '5mm', zIndex: 2 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt=""
            style={{
              maxHeight: '5mm',
              maxWidth: '24mm',
              objectFit: 'contain',
              objectPosition: 'right center',
              filter: needsInvert ? 'brightness(0) invert(1)' : undefined,
              display: 'block',
            }}
          />
        </div>
      )}

      {/* Centre-left: name + role on the band */}
      <div
        style={{
          position: 'absolute',
          left: '6mm',
          right: '6mm',
          top: `${BAND_CENTRE_Y_MM - 6}mm`,
          height: '12mm',
          zIndex: 2,
          color: onBandColor,
          display: 'flex',
          alignItems: 'center',
          gap: '3mm',
        }}
      >
        {showAvatar && (
          <Avatar
            src={person_photo_url}
            initials={getInitials(person?.full_name)}
            shape={avatarShape as 'circle' | 'square'}
            border={design.config.avatar_border ?? true}
            borderColor={design.config.avatar_border_color ?? onBandColor}
            sizeMm={11}
            background={'rgba(255,255,255,0.18)'}
          />
        )}
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              margin: 0,
              fontFamily: `'${profile.font_heading}', Arial, sans-serif`,
              fontSize: '5.2mm',
              fontWeight: 700,
              letterSpacing: '-0.015em',
              lineHeight: 1.02,
            }}
          >
            {person?.full_name ?? 'Your Name'}
          </h1>
          {person?.role && (
            <p
              style={{
                margin: '0.6mm 0 0 0',
                fontSize: '2.2mm',
                letterSpacing: '0.12em',
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
          right: '6mm',
          bottom: '4mm',
          zIndex: 2,
          fontSize: '2.2mm',
          lineHeight: 1.5,
          color: colors.primary,
          opacity: 0.9,
        }}
      >
        {person?.email && <div>{person.email}</div>}
        {(person?.phone || (design.config.show_mobile !== false && person?.mobile)) && (
          <div>
            {[person?.phone, design.config.show_mobile !== false ? person?.mobile : null]
              .filter(Boolean)
              .join('   ·   ')}
          </div>
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
  const bgColor =
    backStyle === 'logo-centered' ? colors.primary :
    backStyle === 'monogram' ? accent :
    accent; // solid-accent
  const { url: logoUrl, needsInvert } = pickLogo(design, 'dark');

  return (
    <article
      style={{
        width: `${CARD_DIMENSIONS.width_mm}mm`,
        height: `${CARD_DIMENSIONS.height_mm}mm`,
        backgroundColor: bgColor,
        color: colors.secondary,
        fontFamily: `'${profile.font_heading}', Arial, sans-serif`,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        padding: '6mm',
        gap: '3mm',
      }}
    >
      {/* Subtle diagonal echo using the same SVG band, muted */}
      <svg
        viewBox={`0 0 ${CARD_DIMENSIONS.width_mm} ${CARD_DIMENSIONS.height_mm}`}
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <polygon points={BAND_POLYGON} fill="rgba(255,255,255,0.08)" />
      </svg>

      {backStyle === 'monogram' ? (
        <span style={{ fontSize: '26mm', fontWeight: 800, letterSpacing: '-0.04em', zIndex: 1 }}>
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
        <p style={{ fontSize: '2.4mm', fontStyle: 'italic', opacity: 0.85, margin: 0, textAlign: 'center', maxWidth: '55mm', zIndex: 1 }}>
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
  const bg =
    side === 'front'
      ? colors.secondary
      : bs === 'logo-centered'
      ? colors.primary
      : accent;
  return (
    <PrintBleed bgColor={bg}>
      <CardDiagonal design={design} side={side} />
    </PrintBleed>
  );
}
