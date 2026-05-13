import type { BrandDesignHydrated, AvatarShape, CardBackStyle } from '@/types/brand';
import { resolveColors } from '@/lib/brand/hydrate';
import { CARD_DIMENSIONS } from '@/lib/brand/templates';
import { Avatar, getInitials, PrintBleed } from './shared';

/**
 * Mono business card — bold name treatment, monospaced contact stack,
 * accent colour as a structural hero element.
 *
 * Front layout:
 *   - Wide accent bar on the left edge (full height, ~6mm).
 *   - Name set in heading font, large.
 *   - Role under name in mono caps.
 *   - Contact details: tight monospaced stack with column-leading labels.
 *   - Optional avatar in top-right.
 *
 * Back layout: full-bleed accent with white logo OR monogram.
 */
export function CardMono({ design, side }: { design: BrandDesignHydrated; side: 'front' | 'back' }) {
  return side === 'front'
    ? <CardMonoFront design={design} />
    : <CardMonoBack design={design} />;
}

function CardMonoFront({ design }: { design: BrandDesignHydrated }) {
  const colors = resolveColors(design);
  const { profile, person, logo_url, person_photo_url } = design;
  const accent = colors.accent ?? colors.primary;
  const avatarShape: AvatarShape = design.config.avatar_shape ?? 'none';
  const avatarBorder = design.config.avatar_border ?? false;
  const avatarBorderColor = design.config.avatar_border_color ?? accent;
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
        boxSizing: 'border-box',
        display: 'flex',
      }}
    >
      {/* Left accent bar */}
      <div style={{ width: '6mm', height: '100%', backgroundColor: accent, flexShrink: 0 }} />

      {/* Main content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '5mm 5mm 5mm 5mm',
          position: 'relative',
        }}
      >
        {/* Header: logo + optional avatar */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '3mm' }}>
          {logo_url && design.config.show_logo !== false ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo_url}
              alt=""
              style={{ maxHeight: '6mm', maxWidth: '24mm', objectFit: 'contain', objectPosition: 'left center' }}
            />
          ) : (
            <span
              style={{
                fontSize: '2.2mm',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                fontWeight: 600,
                color: accent,
              }}
            >
              {profile.name}
            </span>
          )}
          {showAvatar && (
            <Avatar
              src={person_photo_url}
              initials={getInitials(person?.full_name)}
              shape={avatarShape as 'circle' | 'square'}
              border={avatarBorder}
              borderColor={avatarBorderColor}
              sizeMm={14}
              background={accent + '20'}
            />
          )}
        </div>

        {/* Name block — bold and large */}
        <div style={{ marginTop: 'auto', marginBottom: 'auto', paddingTop: '4mm' }}>
          <h1
            style={{
              margin: 0,
              fontFamily: `'${profile.font_heading}', Arial, sans-serif`,
              fontSize: '7mm',
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: '-0.025em',
              color: colors.primary,
            }}
          >
            {person?.full_name ?? 'Your Name'}
          </h1>
          {person?.role && (
            <p
              style={{
                margin: '1.5mm 0 0 0',
                fontSize: '2.2mm',
                fontFamily: '"JetBrains Mono", "SF Mono", monospace',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: accent,
                fontWeight: 500,
              }}
            >
              {person.role}
            </p>
          )}
        </div>

        {/* Mono contact stack */}
        <div
          style={{
            fontFamily: '"JetBrains Mono", "SF Mono", monospace',
            fontSize: '2.2mm',
            lineHeight: 1.5,
            color: colors.primary,
            opacity: 0.85,
          }}
        >
          {person?.email && (
            <ContactRow label="E" value={person.email} accent={accent} />
          )}
          {(person?.phone || person?.mobile) && (
            <ContactRow label="P" value={[person?.phone, person?.mobile].filter(Boolean).join(' / ')} accent={accent} />
          )}
          {profile.website && (
            <ContactRow label="W" value={profile.website.replace(/^https?:\/\//, '')} accent={accent} />
          )}
        </div>
      </div>
    </article>
  );
}

function ContactRow({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ display: 'flex', gap: '3mm', alignItems: 'baseline' }}>
      <span style={{ color: accent, fontWeight: 600, width: '2.5mm', flexShrink: 0 }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function CardMonoBack({ design }: { design: BrandDesignHydrated }) {
  const colors = resolveColors(design);
  const { profile, logo_url } = design;
  const accent = colors.accent ?? colors.primary;
  const backStyle: CardBackStyle = design.config.back_style ?? 'solid-accent';
  const tagline = design.config.tagline ?? profile.tagline;

  if (backStyle === 'monogram') {
    return (
      <article
        style={{
          width: `${CARD_DIMENSIONS.width_mm}mm`,
          height: `${CARD_DIMENSIONS.height_mm}mm`,
          backgroundColor: accent,
          color: colors.secondary,
          fontFamily: `'${profile.font_heading}', Arial, sans-serif`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <span style={{ fontSize: '26mm', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 }}>
          {profile.name.charAt(0).toUpperCase()}
        </span>
      </article>
    );
  }

  if (backStyle === 'logo-centered') {
    return (
      <article
        style={{
          width: `${CARD_DIMENSIONS.width_mm}mm`,
          height: `${CARD_DIMENSIONS.height_mm}mm`,
          backgroundColor: colors.primary,
          color: colors.secondary,
          fontFamily: `'${profile.font_body}', Arial, sans-serif`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3mm',
          padding: '6mm',
        }}
      >
        {logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo_url}
            alt=""
            style={{ maxHeight: '12mm', maxWidth: '50mm', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
          />
        ) : (
          <span style={{ fontSize: '6mm', fontWeight: 600 }}>{profile.name}</span>
        )}
        {tagline && (
          <p
            style={{
              fontFamily: '"JetBrains Mono", "SF Mono", monospace',
              fontSize: '2.2mm',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              textAlign: 'center',
              margin: 0,
              opacity: 0.7,
            }}
          >
            {tagline}
          </p>
        )}
      </article>
    );
  }

  // solid-accent (default for mono)
  return (
    <article
      style={{
        width: `${CARD_DIMENSIONS.width_mm}mm`,
        height: `${CARD_DIMENSIONS.height_mm}mm`,
        backgroundColor: accent,
        color: colors.secondary,
        fontFamily: `'${profile.font_heading}', Arial, sans-serif`,
        position: 'relative',
        overflow: 'hidden',
        padding: '6mm',
        boxSizing: 'border-box',
      }}
    >
      {/* Top: small wordmark */}
      <div
        style={{
          fontSize: '2.2mm',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          fontWeight: 600,
          opacity: 0.85,
        }}
      >
        {profile.name}
      </div>

      {/* Centered tagline */}
      {tagline && (
        <p
          style={{
            position: 'absolute',
            top: '50%',
            left: '6mm',
            right: '6mm',
            transform: 'translateY(-50%)',
            fontSize: '5mm',
            fontWeight: 600,
            letterSpacing: '-0.015em',
            lineHeight: 1.15,
            margin: 0,
          }}
        >
          {tagline}
        </p>
      )}

      {/* Bottom-right logo */}
      {logo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo_url}
          alt=""
          style={{
            position: 'absolute',
            right: '6mm',
            bottom: '6mm',
            maxHeight: '7mm',
            maxWidth: '20mm',
            objectFit: 'contain',
            filter: 'brightness(0) invert(1)',
            opacity: 0.95,
          }}
        />
      )}
    </article>
  );
}

export function CardMonoPrint({ design, side }: { design: BrandDesignHydrated; side: 'front' | 'back' }) {
  const colors = resolveColors(design);
  const accent = colors.accent ?? colors.primary;
  const backStyle = design.config.back_style ?? 'solid-accent';
  const bg =
    side === 'front'
      ? colors.secondary
      : backStyle === 'logo-centered'
      ? colors.primary
      : accent;
  return (
    <PrintBleed bgColor={bg}>
      <CardMono design={design} side={side} />
    </PrintBleed>
  );
}
