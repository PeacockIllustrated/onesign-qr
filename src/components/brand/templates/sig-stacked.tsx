import type { BrandDesignHydrated } from '@/types/brand';
import { resolveColors } from '@/lib/brand/hydrate';
import { SigAvatar, resolveAvatarSettings, sigInitials } from './sig-shared';

interface SigStackedProps {
  design: BrandDesignHydrated;
}

/**
 * Stacked — everything vertical, narrow width. Renders consistently on
 * mobile email clients where columned layouts collapse awkwardly.
 *
 * Use case: people who read email predominantly on mobile; product
 * managers, designers, devs whose recipients are mostly other tech folk.
 */
export function SigStacked({ design }: SigStackedProps) {
  const colors = resolveColors(design);
  const { profile, person, person_photo_url, logo_url } = design;
  const accent = colors.accent ?? colors.primary;
  const socials = profile.socials ?? {};
  const tagline = design.config.tagline ?? profile.tagline;
  const avatar = resolveAvatarSettings(design, 'circle');
  const hasPhoto = avatar.showImage && person_photo_url !== null;
  const showSocials = design.config.show_socials !== false;
  const showCalendarCta = design.config.show_calendar_cta !== false;

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
        width: '360px',
      }}
    >
      <tbody>
        {(hasPhoto || (logo_url && design.config.show_logo !== false)) && (
          <tr>
            <td style={{ paddingBottom: '10px' }}>
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
                <img src={logo_url!} alt={profile.name} width={90} style={{ display: 'block', maxWidth: '90px', height: 'auto' }} />
              )}
            </td>
          </tr>
        )}
        <tr>
          <td>
            <div
              style={{
                fontFamily: `'${profile.font_heading}', Arial, sans-serif`,
                fontSize: '17px',
                fontWeight: 700,
                color: colors.primary,
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
              <div style={{ color: accent, marginTop: '3px', fontSize: '13px', fontWeight: 500 }}>
                {person.role}
              </div>
            )}
            {profile.name && (
              <div style={{ color: '#666', marginTop: '1px', fontSize: '12.5px' }}>
                {profile.name}
              </div>
            )}
            {tagline && (
              <div style={{ fontSize: '12px', color: '#999', fontStyle: 'italic', marginTop: '6px', lineHeight: 1.4 }}>
                {tagline}
              </div>
            )}
          </td>
        </tr>
        <tr>
          <td style={{ paddingTop: '12px' }}>
            <table cellPadding={0} cellSpacing={0} border={0} style={{ fontSize: '12.5px' }}>
              <tbody>
                {person?.email && (
                  <tr>
                    <td style={{ color: accent, paddingRight: 8, fontWeight: 600 }}>E</td>
                    <td>
                      <a href={`mailto:${person.email}`} style={{ color: '#222', textDecoration: 'none' }}>
                        {person.email}
                      </a>
                    </td>
                  </tr>
                )}
                {person?.phone && (
                  <tr>
                    <td style={{ color: accent, paddingRight: 8, fontWeight: 600 }}>P</td>
                    <td>
                      <a href={`tel:${person.phone}`} style={{ color: '#222', textDecoration: 'none' }}>
                        {person.phone}
                      </a>
                    </td>
                  </tr>
                )}
                {design.config.show_mobile !== false && person?.mobile && (
                  <tr>
                    <td style={{ color: accent, paddingRight: 8, fontWeight: 600 }}>M</td>
                    <td>
                      <a href={`tel:${person.mobile}`} style={{ color: '#222', textDecoration: 'none' }}>
                        {person.mobile}
                      </a>
                    </td>
                  </tr>
                )}
                {profile.website && (
                  <tr>
                    <td style={{ color: accent, paddingRight: 8, fontWeight: 600 }}>W</td>
                    <td>
                      <a href={profile.website} style={{ color: '#222', textDecoration: 'none' }}>
                        {profile.website.replace(/^https?:\/\//, '')}
                      </a>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </td>
        </tr>

        {showCalendarCta && socials.calendar && (
          <tr>
            <td style={{ paddingTop: '10px' }}>
              <a
                href={socials.calendar}
                style={{
                  display: 'inline-block',
                  padding: '6px 14px',
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
            </td>
          </tr>
        )}

        {showSocials && (socials.linkedin || socials.twitter || socials.instagram || socials.github) && (
          <tr>
            <td style={{ paddingTop: '10px', fontSize: '12px' }}>
              {socials.linkedin && <a href={socials.linkedin} style={{ color: '#0a66c2', textDecoration: 'none', marginRight: 12 }}>LinkedIn</a>}
              {socials.twitter && <a href={socials.twitter} style={{ color: '#1da1f2', textDecoration: 'none', marginRight: 12 }}>Twitter</a>}
              {socials.instagram && <a href={socials.instagram} style={{ color: '#e1306c', textDecoration: 'none', marginRight: 12 }}>Instagram</a>}
              {socials.github && <a href={socials.github} style={{ color: '#24292f', textDecoration: 'none', marginRight: 12 }}>GitHub</a>}
            </td>
          </tr>
        )}

        {design.config.footer_text && (
          <tr>
            <td style={{ paddingTop: '10px', fontSize: '11px', color: '#999', borderTop: '1px solid #eee', marginTop: '6px' }}>
              {design.config.footer_text}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
