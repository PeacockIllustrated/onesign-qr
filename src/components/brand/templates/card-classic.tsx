import type { BrandDesignHydrated } from '@/types/brand';
import { resolveColors } from '@/lib/brand/hydrate';
import { CARD_DIMENSIONS } from '@/lib/brand/templates';

interface CardClassicProps {
  design: BrandDesignHydrated;
  /** When true, render at print scale with bleed + crop marks. Off by default for in-app preview. */
  print?: boolean;
}

/**
 * Classic centered business card.
 * - Front: logo + name + role + brand colour band.
 * - Back: contact details + optional QR.
 *
 * Designed in millimetres so the same JSX renders identically in the
 * Puppeteer print pipeline. Outer `<article>` is fixed to the trimmed
 * card size; when `print` is true a bleed wrapper extends past the trim
 * and crop marks are drawn at the corners.
 */
export function CardClassic({ design, print = false }: CardClassicProps) {
  const colors = resolveColors(design);
  const { profile, person, logo_url } = design;
  const tagline = design.config.tagline ?? profile.tagline;

  const cardStyle: React.CSSProperties = {
    width: `${CARD_DIMENSIONS.width_mm}mm`,
    height: `${CARD_DIMENSIONS.height_mm}mm`,
    backgroundColor: colors.secondary,
    color: colors.primary,
    fontFamily: `'${profile.font_body}', sans-serif`,
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6mm',
    boxSizing: 'border-box',
  };

  const card = (
    <article style={cardStyle}>
      {/* Accent bar */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '6mm',
          backgroundColor: colors.accent ?? colors.primary,
        }}
      />

      {/* Logo */}
      {logo_url && design.config.show_logo !== false && (
        <img
          src={logo_url}
          alt=""
          style={{
            maxWidth: '50%',
            maxHeight: '14mm',
            marginBottom: '3mm',
            objectFit: 'contain',
          }}
        />
      )}

      {/* Name */}
      <h1
        style={{
          margin: 0,
          fontFamily: `'${profile.font_heading}', sans-serif`,
          fontSize: '5mm',
          fontWeight: 700,
          letterSpacing: '0.02em',
          textAlign: 'center',
        }}
      >
        {person?.full_name ?? 'Your Name'}
      </h1>

      {/* Role */}
      {person?.role && (
        <p
          style={{
            margin: '1mm 0 0 0',
            fontSize: '2.8mm',
            opacity: 0.7,
            textAlign: 'center',
          }}
        >
          {person.role}
        </p>
      )}

      {/* Tagline */}
      {tagline && (
        <p
          style={{
            margin: '3mm 0 0 0',
            fontSize: '2.4mm',
            fontStyle: 'italic',
            opacity: 0.55,
            textAlign: 'center',
            maxWidth: '70%',
          }}
        >
          {tagline}
        </p>
      )}

      {/* Contact strip */}
      <div
        style={{
          position: 'absolute',
          left: '6mm',
          right: '6mm',
          bottom: '8mm',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.8mm',
          fontSize: '2.4mm',
          textAlign: 'center',
        }}
      >
        {person?.email && <span>{person.email}</span>}
        {(person?.phone || person?.mobile) && (
          <span>{[person.phone, person.mobile].filter(Boolean).join(' · ')}</span>
        )}
        {profile.website && <span>{profile.website}</span>}
      </div>
    </article>
  );

  if (!print) return card;

  // Print mode: wrap with bleed area + crop marks
  return (
    <div
      style={{
        width: `${CARD_DIMENSIONS.bleed_width_mm}mm`,
        height: `${CARD_DIMENSIONS.bleed_height_mm}mm`,
        position: 'relative',
        backgroundColor: colors.secondary,
        boxSizing: 'border-box',
        padding: `${CARD_DIMENSIONS.bleed_mm}mm`,
      }}
    >
      {card}
      <CropMarks bleedMm={CARD_DIMENSIONS.bleed_mm} />
    </div>
  );
}

function CropMarks({ bleedMm }: { bleedMm: number }) {
  const len = 3; // mm
  const offset = bleedMm; // crop marks start at the trim edge
  const lineStyle: React.CSSProperties = {
    position: 'absolute',
    backgroundColor: '#000',
  };
  return (
    <>
      {/* TL corner */}
      <div style={{ ...lineStyle, top: `${offset}mm`, left: 0, height: '0.15mm', width: `${len}mm` }} />
      <div style={{ ...lineStyle, top: 0, left: `${offset}mm`, width: '0.15mm', height: `${len}mm` }} />
      {/* TR */}
      <div style={{ ...lineStyle, top: `${offset}mm`, right: 0, height: '0.15mm', width: `${len}mm` }} />
      <div style={{ ...lineStyle, top: 0, right: `${offset}mm`, width: '0.15mm', height: `${len}mm` }} />
      {/* BL */}
      <div style={{ ...lineStyle, bottom: `${offset}mm`, left: 0, height: '0.15mm', width: `${len}mm` }} />
      <div style={{ ...lineStyle, bottom: 0, left: `${offset}mm`, width: '0.15mm', height: `${len}mm` }} />
      {/* BR */}
      <div style={{ ...lineStyle, bottom: `${offset}mm`, right: 0, height: '0.15mm', width: `${len}mm` }} />
      <div style={{ ...lineStyle, bottom: 0, right: `${offset}mm`, width: '0.15mm', height: `${len}mm` }} />
    </>
  );
}
