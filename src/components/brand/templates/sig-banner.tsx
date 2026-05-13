import type { BrandDesignHydrated } from '@/types/brand';
import { resolveColors } from '@/lib/brand/hydrate';
import { SigAvatar, resolveAvatarSettings, sigInitials } from './sig-shared';

interface SigBannerProps {
  design: BrandDesignHydrated;
}

/**
 * Banner — coloured band at the top of the signature with name + logo, the
 * contact stack flows below on a white background.
 *
 * Use case: corporate / enterprise / formal organisations. Reads as a
 * branded letterhead rather than a quiet signature.
 */
export function SigBanner({ design }: SigBannerProps) {
  const colors = resolveColors(design);
  const { profile, person, person_photo_url, logo_url } = design;
  const accent = colors.accent ?? colors.primary;
  const socials = profile.socials ?? {};
  const tagline = design.config.tagline ?? profile.tagline;
  const showSocials = design.config.show_socials !== false;
  const showCalendarCta = design.config.show_calendar_cta !== false;
  const avatar = resolveAvatarSettings(design, 'none');
  const showAvatar = avatar.showImage && person_photo_url !== null;

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
        width: '600px',
      }}
    >
      <tbody>
        {/* Top banner */}
        <tr>
          <td
            style={{
              backgroundColor: colors.primary,
              padding: '14px 20px',
            }}
          >
            {/*
              Band layout:
                [Avatar?] [Name + Role + Company]                  [Logo?]
              The avatar sits inline with the name as a tight identity lockup;
              the logo claims the band right as the brand mark. Both stay
              inside the band so they read as one grouped header rather than
              being separated across the band/body boundary.
            */}
            <table cellPadding={0} cellSpacing={0} border={0} style={{ width: '100%' }}>
              <tbody>
                <tr>
                  {showAvatar && (
                    <td valign="middle" style={{ paddingRight: '14px', width: '52px', verticalAlign: 'middle' }}>
                      <SigAvatar
                        photoUrl={person_photo_url}
                        initials={sigInitials(person?.full_name)}
                        shape={avatar.shape === 'square' ? 'square' : 'circle'}
                        border={avatar.border}
                        borderColor={avatar.borderColor}
                        sizePx={48}
                        fallbackBg={`${accent}50`}
                      />
                    </td>
                  )}
                  <td valign="middle" style={{ verticalAlign: 'middle' }}>
                    <div
                      style={{
                        color: colors.secondary,
                        fontFamily: `'${profile.font_heading}', Arial, sans-serif`,
                        fontSize: '18px',
                        fontWeight: 700,
                        letterSpacing: '-0.005em',
                        lineHeight: 1.2,
                      }}
                    >
                      {person?.full_name ?? 'Your Name'}
                      {design.config.show_pronouns !== false && person?.pronouns && (
                        <span style={{ fontWeight: 400, fontSize: '12px', opacity: 0.7, marginLeft: 8 }}>
                          ({person.pronouns})
                        </span>
                      )}
                    </div>
                    {person?.role && (
                      <div style={{ color: colors.secondary, opacity: 0.85, fontSize: '12.5px', marginTop: '2px' }}>
                        {person.role}
                        {profile.name && <span style={{ opacity: 0.7 }}> · {profile.name}</span>}
                      </div>
                    )}
                  </td>
                  {logo_url && design.config.show_logo !== false && (
                    <td valign="middle" align="right" style={{ verticalAlign: 'middle', textAlign: 'right', paddingLeft: '14px' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={logo_url}
                        alt={profile.name}
                        width={72}
                        style={{
                          display: 'block',
                          maxWidth: '72px',
                          height: 'auto',
                          filter: 'brightness(0) invert(1)',
                          opacity: 0.95,
                        }}
                      />
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </td>
        </tr>

        {/* Body */}
        <tr>
          <td style={{ padding: '14px 20px', backgroundColor: '#ffffff' }}>
            {tagline && (
              <div style={{ fontSize: '12px', color: '#888', fontStyle: 'italic', marginBottom: '8px' }}>
                {tagline}
              </div>
            )}
            <div style={{ fontSize: '12.5px' }}>
              {person?.email && (
                <a href={`mailto:${person.email}`} style={{ color: colors.primary, textDecoration: 'none', fontWeight: 500 }}>
                  {person.email}
                </a>
              )}
              {person?.email && (person?.phone || person?.mobile) && <span style={{ color: '#bbb' }}>  ·  </span>}
              {person?.phone && (
                <a href={`tel:${person.phone}`} style={{ color: '#444', textDecoration: 'none' }}>
                  {person.phone}
                </a>
              )}
              {design.config.show_mobile !== false && person?.mobile && (
                <>
                  {person?.phone && <span style={{ color: '#bbb' }}>  ·  </span>}
                  <a href={`tel:${person.mobile}`} style={{ color: '#444', textDecoration: 'none' }}>
                    {person.mobile}
                  </a>
                </>
              )}
              {profile.website && (
                <>
                  {(person?.email || person?.phone || person?.mobile) && <span style={{ color: '#bbb' }}>  ·  </span>}
                  <a href={profile.website} style={{ color: accent, textDecoration: 'none' }}>
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                </>
              )}
            </div>

            {showCalendarCta && (socials.calendar || socials.booking) && (
              <div style={{ marginTop: '10px' }}>
                {socials.calendar && (
                  <a
                    href={socials.calendar}
                    style={{
                      display: 'inline-block',
                      padding: '5px 12px',
                      backgroundColor: accent,
                      color: '#fff',
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

            {showSocials && (socials.linkedin || socials.twitter || socials.instagram || socials.threads || socials.github) && (
              <div style={{ marginTop: '8px', fontSize: '12px' }}>
                {socials.linkedin && <a href={socials.linkedin} style={{ color: '#0a66c2', textDecoration: 'none', marginRight: 10 }}>LinkedIn</a>}
                {socials.twitter && <a href={socials.twitter} style={{ color: '#1da1f2', textDecoration: 'none', marginRight: 10 }}>Twitter</a>}
                {socials.instagram && <a href={socials.instagram} style={{ color: '#e1306c', textDecoration: 'none', marginRight: 10 }}>Instagram</a>}
                {socials.threads && <a href={socials.threads} style={{ color: '#222', textDecoration: 'none', marginRight: 10 }}>Threads</a>}
                {socials.github && <a href={socials.github} style={{ color: '#24292f', textDecoration: 'none', marginRight: 10 }}>GitHub</a>}
              </div>
            )}

            {design.config.footer_text && (
              <div style={{ marginTop: '10px', fontSize: '11px', color: '#999', borderTop: '1px solid #eee', paddingTop: '6px' }}>
                {design.config.footer_text}
              </div>
            )}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
