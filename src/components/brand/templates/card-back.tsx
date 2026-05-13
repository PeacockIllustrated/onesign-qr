import type { BrandDesignHydrated, CardBackStyle } from '@/types/brand';
import { resolveColors, pickLogo } from '@/lib/brand/hydrate';
import { CARD_DIMENSIONS } from '@/lib/brand/templates';
import { isDarkColor } from './shared';

interface CardBackProps {
  design: BrandDesignHydrated;
  /**
   * Default back style if config.back_style isn't set on the design.
   * Defaults to 'logo-centered'.
   */
  defaultStyle?: CardBackStyle;
  /**
   * Subtle stylistic hint — affects accent rule weight, font choice fallback.
   * 'classical' adds italic flourishes (for Serif Premium).
   * 'dynamic' echoes the diagonal accent (for Diagonal card).
   */
  flavour?: 'standard' | 'classical' | 'dynamic';
}

/**
 * Shared back-of-card renderer. All double-sided card templates funnel
 * through here so back styles only need to be implemented once. New back
 * styles get added to the switch below and immediately become available
 * to every card template.
 *
 * Back styles:
 *   - logo-centered  (default) — brand logo + tagline on the primary colour
 *   - solid-accent             — full-bleed accent with logo + tagline
 *   - contact                  — full contact stack, larger type, on primary
 *   - tagline-hero             — big tagline as the hero on accent, brand small
 *   - socials                  — list of social handles on primary
 *   - monogram (deprecated)    — falls through to logo-centered
 */
export function CardBack({ design, defaultStyle = 'logo-centered', flavour = 'standard' }: CardBackProps) {
  const raw = design.config.back_style ?? defaultStyle;
  // Map deprecated monogram → logo-centered.
  const style: CardBackStyle = raw === 'monogram' ? 'logo-centered' : raw;

  switch (style) {
    case 'contact':
      return <ContactBack design={design} flavour={flavour} />;
    case 'tagline-hero':
      return <TaglineHeroBack design={design} flavour={flavour} />;
    case 'socials':
      return <SocialsBack design={design} flavour={flavour} />;
    case 'solid-accent':
      return <SolidAccentBack design={design} flavour={flavour} />;
    case 'logo-centered':
    default:
      return <LogoCenteredBack design={design} flavour={flavour} />;
  }
}

// ─── Style implementations ────────────────────────────────────────────

function backFrame(bg: string): React.CSSProperties {
  return {
    width: `${CARD_DIMENSIONS.width_mm}mm`,
    height: `${CARD_DIMENSIONS.height_mm}mm`,
    backgroundColor: bg,
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'border-box',
  };
}

/** Compute the resolved background colour the parent PrintBleed should match. */
export function backBgColor(design: BrandDesignHydrated, defaultStyle: CardBackStyle = 'logo-centered'): string {
  const colors = resolveColors(design);
  const accent = colors.accent ?? colors.primary;
  const raw = design.config.back_style ?? defaultStyle;
  const style = raw === 'monogram' ? 'logo-centered' : raw;
  switch (style) {
    case 'solid-accent':
    case 'tagline-hero':
      return accent;
    case 'contact':
    case 'socials':
    case 'logo-centered':
    default:
      return colors.primary;
  }
}

function LogoCenteredBack({ design, flavour }: { design: BrandDesignHydrated; flavour: 'standard' | 'classical' | 'dynamic' }) {
  const colors = resolveColors(design);
  const { profile } = design;
  const accent = colors.accent ?? colors.primary;
  const tagline = design.config.tagline ?? profile.tagline;
  const { url: logoUrl, needsInvert } = pickLogo(design, 'dark');

  return (
    <article
      style={{
        ...backFrame(colors.primary),
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
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          style={{
            maxHeight: '14mm',
            maxWidth: '52mm',
            objectFit: 'contain',
            filter: needsInvert ? 'brightness(0) invert(1)' : undefined,
          }}
        />
      ) : (
        <span style={{ fontSize: '6mm', fontWeight: 600, fontFamily: `'${profile.font_heading}', Arial, sans-serif` }}>
          {profile.name}
        </span>
      )}
      {tagline && (
        <>
          <div style={{ width: '8mm', height: '0.3mm', backgroundColor: accent, opacity: 0.6 }} />
          <p
            style={{
              fontSize: '2.6mm',
              fontStyle: flavour === 'classical' ? 'italic' : 'normal',
              opacity: 0.75,
              margin: 0,
              maxWidth: '55mm',
              textAlign: 'center',
              lineHeight: 1.4,
              letterSpacing: flavour === 'classical' ? '0.02em' : 0,
            }}
          >
            {tagline}
          </p>
        </>
      )}
    </article>
  );
}

function SolidAccentBack({ design, flavour }: { design: BrandDesignHydrated; flavour: 'standard' | 'classical' | 'dynamic' }) {
  const colors = resolveColors(design);
  const { profile } = design;
  const accent = colors.accent ?? colors.primary;
  const onAccent = isDarkColor(accent) ? '#ffffff' : '#111111';
  const tagline = design.config.tagline ?? profile.tagline;
  const { url: logoUrl, needsInvert } = pickLogo(design, isDarkColor(accent) ? 'dark' : 'light');

  return (
    <article
      style={{
        ...backFrame(accent),
        color: onAccent,
        fontFamily: `'${profile.font_heading}', Arial, sans-serif`,
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

      {/* Centred tagline */}
      {tagline && (
        <p
          style={{
            position: 'absolute',
            top: '50%',
            left: '6mm',
            right: '6mm',
            transform: 'translateY(-50%)',
            fontSize: '4.4mm',
            fontWeight: 600,
            letterSpacing: '-0.015em',
            lineHeight: 1.18,
            margin: 0,
            fontStyle: flavour === 'classical' ? 'italic' : 'normal',
            textAlign: flavour === 'classical' ? 'center' : 'left',
          }}
        >
          {tagline}
        </p>
      )}

      {/* Bottom-right logo */}
      {logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          style={{
            position: 'absolute',
            right: '6mm',
            bottom: '6mm',
            maxHeight: '7mm',
            maxWidth: '22mm',
            objectFit: 'contain',
            filter: needsInvert ? 'brightness(0) invert(1)' : undefined,
            opacity: 0.95,
          }}
        />
      )}
    </article>
  );
}

function ContactBack({ design, flavour }: { design: BrandDesignHydrated; flavour: 'standard' | 'classical' | 'dynamic' }) {
  const colors = resolveColors(design);
  const { profile, person } = design;
  const accent = colors.accent ?? colors.primary;
  const { url: logoUrl, needsInvert } = pickLogo(design, 'dark');

  return (
    <article
      style={{
        ...backFrame(colors.primary),
        color: colors.secondary,
        fontFamily: `'${profile.font_body}', Arial, sans-serif`,
        padding: '6mm',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* Header: brand + accent rule */}
      <div>
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            style={{
              maxHeight: '6mm',
              maxWidth: '28mm',
              objectFit: 'contain',
              filter: needsInvert ? 'brightness(0) invert(1)' : undefined,
              display: 'block',
              marginBottom: '2.5mm',
            }}
          />
        )}
        <div style={{ width: '8mm', height: '0.4mm', backgroundColor: accent }} />
      </div>

      {/* Middle: contact stack, larger than the front */}
      <div style={{ fontSize: '2.6mm', lineHeight: 1.55 }}>
        {person?.full_name && (
          <div
            style={{
              fontFamily: `'${profile.font_heading}', Arial, sans-serif`,
              fontSize: '3.6mm',
              fontWeight: 600,
              marginBottom: '1.5mm',
              fontStyle: flavour === 'classical' ? 'italic' : 'normal',
            }}
          >
            {person.full_name}
            {person.role && <span style={{ fontWeight: 400, opacity: 0.7 }}>  ·  {person.role}</span>}
          </div>
        )}
        {person?.email && <div>{person.email}</div>}
        {person?.phone && <div>{person.phone}</div>}
        {design.config.show_mobile !== false && person?.mobile && <div>{person.mobile}</div>}
        {profile.website && <div>{profile.website.replace(/^https?:\/\//, '')}</div>}
        {person?.address && (
          <div style={{ opacity: 0.7, marginTop: '1.5mm', fontSize: '2.3mm' }}>{person.address}</div>
        )}
      </div>

      {/* Footer: profile name as a label */}
      <div
        style={{
          fontSize: '2mm',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          opacity: 0.55,
        }}
      >
        {profile.name}
      </div>
    </article>
  );
}

function TaglineHeroBack({ design, flavour }: { design: BrandDesignHydrated; flavour: 'standard' | 'classical' | 'dynamic' }) {
  const colors = resolveColors(design);
  const { profile } = design;
  const accent = colors.accent ?? colors.primary;
  const onAccent = isDarkColor(accent) ? '#ffffff' : '#111111';
  const tagline = design.config.tagline ?? profile.tagline ?? `${profile.name}.`;
  // Length-aware sizing so long taglines stay readable.
  const fs = tagline.length < 30 ? '7mm' : tagline.length < 60 ? '5.5mm' : '4.4mm';

  return (
    <article
      style={{
        ...backFrame(accent),
        color: onAccent,
        fontFamily: `'${profile.font_heading}', Arial, sans-serif`,
        padding: '7mm',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}
    >
      {/* Big tagline as the hero — no logo to compete. */}
      <p
        style={{
          fontSize: fs,
          fontWeight: flavour === 'classical' ? 500 : 700,
          letterSpacing: '-0.025em',
          lineHeight: 1.05,
          margin: 0,
          fontStyle: flavour === 'classical' ? 'italic' : 'normal',
          maxWidth: '75mm',
        }}
      >
        {tagline}
      </p>

      {/* Small brand name bottom-left as the attribution */}
      <div
        style={{
          position: 'absolute',
          left: '7mm',
          bottom: '5mm',
          fontSize: '2mm',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          fontWeight: 600,
          opacity: 0.7,
        }}
      >
        — {profile.name}
      </div>
    </article>
  );
}

function SocialsBack({ design, flavour: _flavour }: { design: BrandDesignHydrated; flavour: 'standard' | 'classical' | 'dynamic' }) {
  const colors = resolveColors(design);
  const { profile } = design;
  const accent = colors.accent ?? colors.primary;
  const { url: logoUrl, needsInvert } = pickLogo(design, 'dark');

  const socials = profile.socials ?? {};
  const entries: Array<{ label: string; handle: string }> = [];
  if (socials.website || profile.website) {
    entries.push({ label: 'web', handle: (socials.website ?? profile.website ?? '').replace(/^https?:\/\//, '') });
  }
  if (socials.linkedin) entries.push({ label: 'in', handle: socials.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/(in\/|company\/)?/i, '@') });
  if (socials.instagram) entries.push({ label: 'ig', handle: socials.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '@') });
  if (socials.twitter) entries.push({ label: 'x', handle: socials.twitter.replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//i, '@') });
  if (socials.threads) entries.push({ label: 'th', handle: socials.threads.replace(/^https?:\/\/(www\.)?threads\.net\//i, '@') });
  if (socials.tiktok) entries.push({ label: 'tt', handle: socials.tiktok.replace(/^https?:\/\/(www\.)?tiktok\.com\//i, '@') });
  if (socials.github) entries.push({ label: 'gh', handle: socials.github.replace(/^https?:\/\/(www\.)?github\.com\//i, '@') });
  if (socials.behance) entries.push({ label: 'be', handle: socials.behance.replace(/^https?:\/\/(www\.)?behance\.net\//i, '@') });
  if (socials.dribbble) entries.push({ label: 'dr', handle: socials.dribbble.replace(/^https?:\/\/(www\.)?dribbble\.com\//i, '@') });

  // Limit to 6 lines so it stays tidy on the card.
  const visible = entries.slice(0, 6);

  return (
    <article
      style={{
        ...backFrame(colors.primary),
        color: colors.secondary,
        fontFamily: `'${profile.font_body}', Arial, sans-serif`,
        padding: '6mm',
        display: 'flex',
        flexDirection: 'column',
        gap: '3mm',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: '2.2mm',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            fontWeight: 600,
            opacity: 0.75,
          }}
        >
          Find us
        </span>
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            style={{
              maxHeight: '5mm',
              maxWidth: '22mm',
              objectFit: 'contain',
              filter: needsInvert ? 'brightness(0) invert(1)' : undefined,
            }}
          />
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5mm', fontSize: '2.6mm', lineHeight: 1.3 }}>
        {visible.length > 0 ? (
          visible.map((e) => (
            <div key={e.label} style={{ display: 'flex', alignItems: 'baseline', gap: '3mm' }}>
              <span
                style={{
                  fontSize: '2mm',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: accent,
                  fontWeight: 600,
                  width: '6mm',
                  flexShrink: 0,
                }}
              >
                {e.label}
              </span>
              <span style={{ opacity: 0.95 }}>{e.handle}</span>
            </div>
          ))
        ) : (
          <span style={{ opacity: 0.6, fontStyle: 'italic', fontSize: '2.2mm' }}>
            Add socials to your brand profile to populate this back.
          </span>
        )}
      </div>
    </article>
  );
}
