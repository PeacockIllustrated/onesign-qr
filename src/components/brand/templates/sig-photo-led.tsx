import type { BrandDesignHydrated } from '@/types/brand';
import { resolveColors } from '@/lib/brand/hydrate';
import { SigAvatar, resolveAvatarSettings, sigInitials } from './sig-shared';

interface SigPhotoLedProps {
  design: BrandDesignHydrated;
}

/**
 * Photo-led signature.
 *
 * Large headshot dominates the left side, contact details to the right.
 * Used by client-facing roles (sales, recruiters, consultants). Falls back
 * to logo if no person photo is set.
 */
export function SigPhotoLed({ design }: SigPhotoLedProps) {
  const colors = resolveColors(design);
  const { profile, person, person_photo_url, logo_url } = design;
  const accent = colors.accent ?? colors.primary;
  const tagline = design.config.tagline ?? profile.tagline;
  const socials = profile.socials ?? {};
  const avatar = resolveAvatarSettings(design, 'circle');
  const hasPhoto = avatar.showImage && person_photo_url !== null;

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
        width: '560px',
      }}
    >
      <tbody>
        <tr>
          {/* Left: photo or logo, larger */}
          <td
            valign="top"
            style={{
              paddingRight: '24px',
              width: '124px',
              verticalAlign: 'top',
            }}
          >
            {hasPhoto ? (
              <SigAvatar
                photoUrl={person_photo_url}
                initials={sigInitials(person?.full_name)}
                shape={avatar.shape === 'square' ? 'square' : 'circle'}
                border={avatar.border}
                borderColor={avatar.borderColor}
                sizePx={100}
                fallbackBg={`${accent}20`}
              />
            ) : logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo_url}
                alt={profile.name}
                width={100}
                style={{ display: 'block', maxWidth: '100px', height: 'auto' }}
              />
            ) : null}
          </td>

          {/* Right: typographic stack */}
          <td valign="top" style={{ verticalAlign: 'top', borderLeft: `3px solid ${accent}`, paddingLeft: '20px' }}>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: colors.primary,
                fontFamily: `'${profile.font_heading}', Arial, sans-serif`,
                lineHeight: 1.2,
              }}
            >
              {person?.full_name ?? 'Your Name'}
              {person?.pronouns && (
                <span style={{ fontWeight: 400, fontSize: '12px', opacity: 0.6, marginLeft: 6 }}>
                  ({person.pronouns})
                </span>
              )}
            </div>

            {person?.role && (
              <div style={{ color: accent, marginTop: '3px', fontSize: '13px', fontWeight: 500 }}>
                {person.role}
                {profile.name && <span style={{ color: '#888', fontWeight: 400 }}> · {profile.name}</span>}
              </div>
            )}

            {tagline && (
              <div style={{ fontSize: '12px', color: '#888', fontStyle: 'italic', marginTop: '6px', maxWidth: '380px' }}>
                {tagline}
              </div>
            )}

            <div style={{ marginTop: '12px', fontSize: '12.5px' }}>
              {person?.email && (
                <div>
                  <a href={`mailto:${person.email}`} style={{ color: colors.primary, textDecoration: 'none', fontWeight: 500 }}>
                    {person.email}
                  </a>
                </div>
              )}
              {(person?.phone || person?.mobile) && (
                <div style={{ color: '#444', marginTop: '2px' }}>
                  {person?.phone && (
                    <a href={`tel:${person.phone}`} style={{ color: '#444', textDecoration: 'none' }}>
                      {person.phone}
                    </a>
                  )}
                  {person?.phone && person?.mobile && <span style={{ color: '#bbb' }}> · </span>}
                  {person?.mobile && (
                    <a href={`tel:${person.mobile}`} style={{ color: '#444', textDecoration: 'none' }}>
                      {person.mobile}
                    </a>
                  )}
                </div>
              )}
              {profile.website && (
                <div style={{ marginTop: '2px' }}>
                  <a
                    href={profile.website}
                    style={{ color: colors.primary, textDecoration: 'none', fontWeight: 500 }}
                  >
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
            </div>

            {(socials.calendar || socials.booking) && (
              <div style={{ marginTop: '12px' }}>
                {socials.calendar && (
                  <a
                    href={socials.calendar}
                    style={{
                      display: 'inline-block',
                      padding: '5px 12px',
                      backgroundColor: accent,
                      color: '#ffffff',
                      textDecoration: 'none',
                      borderRadius: '4px',
                      fontWeight: 600,
                      fontSize: '12px',
                      marginRight: 6,
                    }}
                  >
                    Book a meeting
                  </a>
                )}
                {socials.booking && socials.booking !== socials.calendar && (
                  <a
                    href={socials.booking}
                    style={{
                      display: 'inline-block',
                      padding: '5px 12px',
                      border: `1px solid ${accent}`,
                      color: accent,
                      textDecoration: 'none',
                      borderRadius: '4px',
                      fontWeight: 600,
                      fontSize: '12px',
                    }}
                  >
                    Schedule
                  </a>
                )}
              </div>
            )}

            {(socials.linkedin || socials.twitter || socials.instagram || socials.threads || socials.github || socials.behance || socials.dribbble) && (
              <div style={{ marginTop: '10px', fontSize: '12px' }}>
                {socials.linkedin && (
                  <a href={socials.linkedin} style={{ color: '#0a66c2', textDecoration: 'none', marginRight: 10 }}>
                    LinkedIn
                  </a>
                )}
                {socials.twitter && (
                  <a href={socials.twitter} style={{ color: '#1da1f2', textDecoration: 'none', marginRight: 10 }}>
                    Twitter
                  </a>
                )}
                {socials.instagram && (
                  <a href={socials.instagram} style={{ color: '#e1306c', textDecoration: 'none', marginRight: 10 }}>
                    Instagram
                  </a>
                )}
                {socials.threads && (
                  <a href={socials.threads} style={{ color: '#222', textDecoration: 'none', marginRight: 10 }}>
                    Threads
                  </a>
                )}
                {socials.github && (
                  <a href={socials.github} style={{ color: '#24292f', textDecoration: 'none', marginRight: 10 }}>
                    GitHub
                  </a>
                )}
                {socials.behance && (
                  <a href={socials.behance} style={{ color: '#0057ff', textDecoration: 'none', marginRight: 10 }}>
                    Behance
                  </a>
                )}
                {socials.dribbble && (
                  <a href={socials.dribbble} style={{ color: '#ea4c89', textDecoration: 'none', marginRight: 10 }}>
                    Dribbble
                  </a>
                )}
              </div>
            )}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
