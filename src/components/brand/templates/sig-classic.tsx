import type { BrandDesignHydrated } from '@/types/brand';
import { resolveColors } from '@/lib/brand/hydrate';
import { SigAvatar, resolveAvatarSettings, sigInitials } from './sig-shared';

interface SigClassicProps {
  design: BrandDesignHydrated;
}

/**
 * Classic email signature: logo on the left, contact details on the right.
 *
 * If an avatar shape is configured AND the person has a photo, the avatar
 * replaces the logo as the leading visual. Otherwise the logo shows.
 *
 * Rendered using HTML tables and inline styles because Outlook (Windows) ignores
 * external CSS, modern flexbox, and most non-trivial selectors. Width pinned to
 * 600px which is the desktop-client convention.
 */
export function SigClassic({ design }: SigClassicProps) {
  const colors = resolveColors(design);
  const { profile, person, logo_url, person_photo_url } = design;
  const tagline = design.config.tagline ?? profile.tagline;
  const accent = colors.accent ?? colors.primary;
  const socials = profile.socials ?? {};
  const avatar = resolveAvatarSettings(design, 'none');
  const showAvatar = avatar.showImage && person_photo_url !== null;
  const showLeft = showAvatar || (logo_url && design.config.show_logo !== false);

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
        lineHeight: 1.45,
        width: '600px',
      }}
    >
      <tbody>
        <tr>
          {showLeft && (
            <td
              valign="top"
              style={{
                paddingRight: '20px',
                borderRight: `3px solid ${accent}`,
                width: showAvatar ? '100px' : '120px',
                verticalAlign: 'top',
              }}
            >
              {showAvatar ? (
                <SigAvatar
                  photoUrl={person_photo_url}
                  initials={sigInitials(person?.full_name)}
                  shape={avatar.shape === 'square' ? 'square' : 'circle'}
                  border={avatar.border}
                  borderColor={avatar.borderColor}
                  sizePx={80}
                  fallbackBg={`${accent}20`}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logo_url!}
                  alt={profile.name}
                  width={100}
                  style={{ display: 'block', maxWidth: '100px', height: 'auto' }}
                />
              )}
            </td>
          )}

          <td
            valign="top"
            style={{
              paddingLeft: showLeft ? '20px' : 0,
              verticalAlign: 'top',
            }}
          >
            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: colors.primary,
                fontFamily: `'${profile.font_heading}', Arial, sans-serif`,
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
              <div style={{ color: '#555', marginTop: '2px' }}>
                {person.role}
                {profile.name && <span style={{ color: '#888' }}> · {profile.name}</span>}
              </div>
            )}

            {tagline && (
              <div style={{ fontSize: '12px', color: '#888', fontStyle: 'italic', marginTop: '4px' }}>
                {tagline}
              </div>
            )}

            <div style={{ marginTop: '10px', fontSize: '12px' }}>
              {person?.email && (
                <a href={`mailto:${person.email}`} style={{ color: colors.primary, textDecoration: 'none' }}>
                  {person.email}
                </a>
              )}
              {person?.email && (person?.phone || person?.mobile) && (
                <span style={{ color: '#bbb' }}> · </span>
              )}
              {person?.phone && (
                <a href={`tel:${person.phone}`} style={{ color: '#444', textDecoration: 'none' }}>
                  {person.phone}
                </a>
              )}
              {person?.mobile && (
                <>
                  {person?.phone && <span style={{ color: '#bbb' }}> · </span>}
                  <a href={`tel:${person.mobile}`} style={{ color: '#444', textDecoration: 'none' }}>
                    {person.mobile}
                  </a>
                </>
              )}
            </div>

            {profile.website && (
              <div style={{ marginTop: '4px', fontSize: '12px' }}>
                <a
                  href={profile.website}
                  style={{ color: colors.primary, textDecoration: 'none', fontWeight: 600 }}
                >
                  {profile.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}

            {(socials.linkedin || socials.twitter || socials.instagram) && (
              <div style={{ marginTop: '8px', fontSize: '12px' }}>
                {socials.linkedin && (
                  <a href={socials.linkedin} style={{ color: '#0a66c2', textDecoration: 'none', marginRight: 8 }}>
                    LinkedIn
                  </a>
                )}
                {socials.twitter && (
                  <a href={socials.twitter} style={{ color: '#1da1f2', textDecoration: 'none', marginRight: 8 }}>
                    Twitter
                  </a>
                )}
                {socials.instagram && (
                  <a href={socials.instagram} style={{ color: '#e1306c', textDecoration: 'none', marginRight: 8 }}>
                    Instagram
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
