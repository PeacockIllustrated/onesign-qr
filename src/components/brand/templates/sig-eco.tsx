import type { BrandDesignHydrated } from '@/types/brand';
import { resolveColors } from '@/lib/brand/hydrate';
import { SigAvatar, resolveAvatarSettings, sigInitials } from './sig-shared';

interface SigEcoProps {
  design: BrandDesignHydrated;
}

const DEFAULT_ECO_FOOTER =
  '🌱 Please consider the environment before printing this email.';

/**
 * Eco — clean signature with a prominent footer line for sustainability
 * messaging, manifesto excerpts, accessibility statements, or quotes.
 *
 * The footer text comes from design.config.footer_text and falls back to
 * a default eco statement if the user hasn't customised it.
 *
 * Use case: brands with environmental or social-impact positioning;
 * anyone who wants a signature with an extra "voice" line.
 */
export function SigEco({ design }: SigEcoProps) {
  const colors = resolveColors(design);
  const { profile, person, person_photo_url, logo_url } = design;
  const accent = colors.accent ?? colors.primary;
  const socials = profile.socials ?? {};
  const avatar = resolveAvatarSettings(design, 'circle');
  const hasPhoto = avatar.showImage && person_photo_url !== null;
  const showSocials = design.config.show_socials !== false;
  const showCalendarCta = design.config.show_calendar_cta !== false;
  const footerText = design.config.footer_text || DEFAULT_ECO_FOOTER;

  return (
    <table
      cellPadding={0}
      cellSpacing={0}
      border={0}
      style={{
        borderCollapse: 'collapse',
        fontFamily: `'${profile.font_body}', Arial, sans-serif`,
        fontSize: '13px',
        color: '#222',
        lineHeight: 1.5,
        width: '580px',
      }}
    >
      <tbody>
        <tr>
          {(hasPhoto || (logo_url && design.config.show_logo !== false)) && (
            <td valign="top" style={{ paddingRight: '18px', width: '92px', verticalAlign: 'top' }}>
              {hasPhoto ? (
                <SigAvatar
                  photoUrl={person_photo_url}
                  initials={sigInitials(person?.full_name)}
                  shape={avatar.shape === 'square' ? 'square' : 'circle'}
                  border={avatar.border}
                  borderColor={avatar.borderColor}
                  sizePx={72}
                  fallbackBg={`${accent}20`}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo_url!} alt={profile.name} width={80} style={{ display: 'block', maxWidth: '80px', height: 'auto' }} />
              )}
            </td>
          )}
          <td valign="top" style={{ verticalAlign: 'top' }}>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: colors.primary,
                fontFamily: `'${profile.font_heading}', Arial, sans-serif`,
                lineHeight: 1.2,
              }}
            >
              {person?.full_name ?? 'Your Name'}
              {design.config.show_pronouns !== false && person?.pronouns && (
                <span style={{ fontWeight: 400, fontSize: '12px', opacity: 0.6, marginLeft: 6 }}>
                  ({person.pronouns})
                </span>
              )}
            </div>
            {person?.role && (
              <div style={{ color: '#555', fontSize: '12.5px', marginTop: '2px' }}>
                {person.role}
                {profile.name && <span style={{ color: '#888' }}> · {profile.name}</span>}
              </div>
            )}
            <div style={{ marginTop: '8px', fontSize: '12.5px' }}>
              {person?.email && (
                <a href={`mailto:${person.email}`} style={{ color: colors.primary, textDecoration: 'none' }}>
                  {person.email}
                </a>
              )}
              {person?.phone && (
                <>
                  {person?.email && <span style={{ color: '#bbb' }}>  ·  </span>}
                  <a href={`tel:${person.phone}`} style={{ color: '#555', textDecoration: 'none' }}>
                    {person.phone}
                  </a>
                </>
              )}
              {profile.website && (
                <>
                  {(person?.email || person?.phone) && <span style={{ color: '#bbb' }}>  ·  </span>}
                  <a href={profile.website} style={{ color: accent, textDecoration: 'none' }}>
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                </>
              )}
            </div>

            {showCalendarCta && socials.calendar && (
              <div style={{ marginTop: '8px' }}>
                <a
                  href={socials.calendar}
                  style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    backgroundColor: accent,
                    color: '#fff',
                    textDecoration: 'none',
                    borderRadius: '4px',
                    fontWeight: 600,
                    fontSize: '12px',
                  }}
                >
                  Book a meeting
                </a>
              </div>
            )}

            {showSocials && (socials.linkedin || socials.twitter || socials.instagram || socials.github) && (
              <div style={{ marginTop: '6px', fontSize: '12px' }}>
                {socials.linkedin && <a href={socials.linkedin} style={{ color: '#0a66c2', textDecoration: 'none', marginRight: 10 }}>LinkedIn</a>}
                {socials.twitter && <a href={socials.twitter} style={{ color: '#1da1f2', textDecoration: 'none', marginRight: 10 }}>Twitter</a>}
                {socials.instagram && <a href={socials.instagram} style={{ color: '#e1306c', textDecoration: 'none', marginRight: 10 }}>Instagram</a>}
                {socials.github && <a href={socials.github} style={{ color: '#24292f', textDecoration: 'none', marginRight: 10 }}>GitHub</a>}
              </div>
            )}
          </td>
        </tr>
        <tr>
          <td colSpan={2} style={{ paddingTop: '12px' }}>
            <div
              style={{
                borderTop: `1px solid ${accent}30`,
                paddingTop: '8px',
                fontSize: '11.5px',
                color: '#666',
                fontStyle: 'italic',
                lineHeight: 1.5,
              }}
            >
              {footerText}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
