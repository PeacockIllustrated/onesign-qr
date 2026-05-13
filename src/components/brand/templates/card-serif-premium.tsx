import type { BrandDesignHydrated, AvatarShape, CardBackStyle } from '@/types/brand';
import { resolveColors, pickLogo } from '@/lib/brand/hydrate';
import { CARD_DIMENSIONS } from '@/lib/brand/templates';
import { Avatar, getInitials, PrintBleed, isDarkColor } from './shared';

/**
 * Serif Premium — classical luxury treatment.
 *
 * Front layout:
 *   - Brand wordmark or logo top, framed by hairline rules in accent.
 *   - Name centred in heading serif (the body font is also used for caps).
 *   - Italic role line.
 *   - Contact set in small caps with wide tracking.
 *
 * Use case: law firms, wealth management, consultancies, hospitality.
 */
export function CardSerifPremium({ design, side }: { design: BrandDesignHydrated; side: 'front' | 'back' }) {
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
        fontFamily: `'${profile.font_body}', Georgia, serif`,
        position: 'relative',
        overflow: 'hidden',
        padding: '6mm',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      {/* Top: framed brand wordmark / logo */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5mm' }}>
        <div style={{ width: '24mm', height: '0.2mm', backgroundColor: accent }} />
        {logoUrl && design.config.show_logo !== false ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            style={{
              maxHeight: '7mm',
              maxWidth: '40mm',
              objectFit: 'contain',
              filter: needsInvert ? 'brightness(0) invert(1)' : undefined,
            }}
          />
        ) : (
          <span style={{ fontSize: '3.6mm', letterSpacing: '0.25em', textTransform: 'uppercase', fontFamily: `'${profile.font_heading}', Georgia, serif` }}>
            {profile.name}
          </span>
        )}
        <div style={{ width: '24mm', height: '0.2mm', backgroundColor: accent }} />
      </div>

      {/* Middle: name + role */}
      <div style={{ marginTop: 'auto', marginBottom: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5mm' }}>
        {showAvatar && (
          <div style={{ marginBottom: '2mm' }}>
            <Avatar
              src={person_photo_url}
              initials={getInitials(person?.full_name)}
              shape={avatarShape as 'circle' | 'square'}
              border={design.config.avatar_border ?? true}
              borderColor={design.config.avatar_border_color ?? accent}
              sizeMm={16}
              background={`${accent}15`}
            />
          </div>
        )}
        <h1
          style={{
            margin: 0,
            fontFamily: `'${profile.font_heading}', Georgia, serif`,
            fontSize: '6mm',
            fontWeight: 500,
            letterSpacing: '-0.005em',
            lineHeight: 1.05,
          }}
        >
          {person?.full_name ?? 'Your Name'}
        </h1>
        {person?.role && (
          <p style={{ margin: 0, fontSize: '2.6mm', fontStyle: 'italic', opacity: 0.75 }}>
            {person.role}
          </p>
        )}
      </div>

      {/* Bottom: contact in small caps */}
      <div
        style={{
          fontSize: '2mm',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          opacity: 0.8,
          lineHeight: 1.6,
        }}
      >
        {person?.email && <div>{person.email}</div>}
        {person?.phone && <div>{person.phone}</div>}
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
  const backStyle: CardBackStyle = design.config.back_style ?? 'monogram';
  const { url: logoUrl, needsInvert } = pickLogo(design, 'dark');

  if (backStyle === 'monogram') {
    return (
      <article
        style={{
          width: `${CARD_DIMENSIONS.width_mm}mm`,
          height: `${CARD_DIMENSIONS.height_mm}mm`,
          backgroundColor: colors.primary,
          color: colors.secondary,
          fontFamily: `'${profile.font_heading}', Georgia, serif`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <span style={{ fontSize: '24mm', fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1, fontStyle: 'italic' }}>
          {profile.name.charAt(0).toUpperCase()}
        </span>
        <div style={{ position: 'absolute', bottom: '5mm', left: '6mm', right: '6mm', textAlign: 'center', fontSize: '1.8mm', letterSpacing: '0.3em', textTransform: 'uppercase', opacity: 0.6 }}>
          {profile.name}
        </div>
      </article>
    );
  }

  const bg = backStyle === 'solid-accent' ? accent : colors.primary;
  return (
    <article
      style={{
        width: `${CARD_DIMENSIONS.width_mm}mm`,
        height: `${CARD_DIMENSIONS.height_mm}mm`,
        backgroundColor: bg,
        color: colors.secondary,
        fontFamily: `'${profile.font_heading}', Georgia, serif`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6mm',
        gap: '3mm',
      }}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          style={{
            maxHeight: '12mm',
            maxWidth: '50mm',
            objectFit: 'contain',
            filter: needsInvert ? 'brightness(0) invert(1)' : undefined,
          }}
        />
      ) : (
        <span style={{ fontSize: '6mm', fontWeight: 400, fontStyle: 'italic' }}>{profile.name}</span>
      )}
      {tagline && (
        <p style={{ fontSize: '2.4mm', fontStyle: 'italic', opacity: 0.8, margin: 0, textAlign: 'center', maxWidth: '55mm' }}>
          {tagline}
        </p>
      )}
    </article>
  );
}

export function CardSerifPremiumPrint({ design, side }: { design: BrandDesignHydrated; side: 'front' | 'back' }) {
  const colors = resolveColors(design);
  const accent = colors.accent ?? colors.primary;
  const bs = design.config.back_style ?? 'monogram';
  const bg = side === 'front' ? colors.secondary : bs === 'solid-accent' ? accent : colors.primary;
  return (
    <PrintBleed bgColor={bg}>
      <CardSerifPremium design={design} side={side} />
    </PrintBleed>
  );
}
