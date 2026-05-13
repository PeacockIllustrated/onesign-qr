import type { BrandDesignHydrated } from '@/types/brand';
import { resolveColors } from '@/lib/brand/hydrate';
import { SigAvatar, SecondaryLogo, resolveAvatarSettings, sigInitials } from './sig-shared';

interface SigCardProps {
  design: BrandDesignHydrated;
}

/**
 * Card — the signature is rendered as a mini-business-card box with a
 * subtle border, optional rounded corners and an accent rule.
 *
 * Use case: anyone who wants a contained, visually distinct signature
 * that reads like an at-a-glance contact card.
 */
export function SigCard({ design }: SigCardProps) {
  const colors = resolveColors(design);
  const { profile, person, person_photo_url, logo_url } = design;
  const accent = colors.accent ?? colors.primary;
  const socials = profile.socials ?? {};
  const tagline = design.config.tagline ?? profile.tagline;
  const radius = design.config.corner_style === 'sharp' ? '0' : '10px';
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
        width: '540px',
      }}
    >
      <tbody>
        <tr>
          <td
            style={{
              padding: '16px',
              border: `1px solid ${accent}25`,
              borderRadius: radius,
              backgroundColor: '#fafafa',
              borderLeft: `4px solid ${accent}`,
            }}
          >
            <table cellPadding={0} cellSpacing={0} border={0} style={{ width: '100%' }}>
              <tbody>
                <tr>
                  {(hasPhoto || (logo_url && design.config.show_logo !== false)) && (
                    <td valign="top" style={{ paddingRight: '16px', width: '76px', verticalAlign: 'top' }}>
                      {hasPhoto ? (
                        <SigAvatar
                          photoUrl={person_photo_url}
                          initials={sigInitials(person?.full_name)}
                          shape={avatar.shape === 'square' ? 'square' : 'circle'}
                          border={avatar.border}
                          borderColor={avatar.borderColor}
                          sizePx={60}
                          fallbackBg={`${accent}20`}
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logo_url!} alt={profile.name} width={60} style={{ display: 'block', maxWidth: '60px', height: 'auto' }} />
                      )}
                      {/* When both are present, render the logo as a small mark
                          underneath the avatar so both can be seen. */}
                      {hasPhoto && logo_url && design.config.show_logo !== false && (
                        <div style={{ marginTop: '8px' }}>
                          <SecondaryLogo url={logo_url} alt={profile.name} maxHeightPx={20} />
                        </div>
                      )}
                    </td>
                  )}
                  <td valign="top" style={{ verticalAlign: 'top' }}>
                    <div
                      style={{
                        fontSize: '15px',
                        fontWeight: 700,
                        color: colors.primary,
                        fontFamily: `'${profile.font_heading}', Arial, sans-serif`,
                        lineHeight: 1.2,
                      }}
                    >
                      {person?.full_name ?? 'Your Name'}
                      {design.config.show_pronouns !== false && person?.pronouns && (
                        <span style={{ fontWeight: 400, fontSize: '11.5px', opacity: 0.55, marginLeft: 6 }}>
                          ({person.pronouns})
                        </span>
                      )}
                    </div>
                    {person?.role && (
                      <div style={{ color: accent, marginTop: '2px', fontSize: '12.5px', fontWeight: 500 }}>
                        {person.role}
                        {profile.name && <span style={{ color: '#888', fontWeight: 400 }}> · {profile.name}</span>}
                      </div>
                    )}
                    {tagline && (
                      <div style={{ fontSize: '11.5px', color: '#888', fontStyle: 'italic', marginTop: '4px' }}>
                        {tagline}
                      </div>
                    )}
                    <div style={{ marginTop: '8px', fontSize: '12px' }}>
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
                      {design.config.show_mobile !== false && person?.mobile && (
                        <>
                          {(person?.email || person?.phone) && <span style={{ color: '#bbb' }}>  ·  </span>}
                          <a href={`tel:${person.mobile}`} style={{ color: '#555', textDecoration: 'none' }}>
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
                            borderRadius: radius === '0' ? '0' : '4px',
                            fontWeight: 600,
                            fontSize: '11.5px',
                          }}
                        >
                          Book a meeting →
                        </a>
                      </div>
                    )}

                    {showSocials && (socials.linkedin || socials.twitter || socials.instagram || socials.github) && (
                      <div style={{ marginTop: '6px', fontSize: '11.5px' }}>
                        {socials.linkedin && <a href={socials.linkedin} style={{ color: '#0a66c2', textDecoration: 'none', marginRight: 10 }}>LinkedIn</a>}
                        {socials.twitter && <a href={socials.twitter} style={{ color: '#1da1f2', textDecoration: 'none', marginRight: 10 }}>Twitter</a>}
                        {socials.instagram && <a href={socials.instagram} style={{ color: '#e1306c', textDecoration: 'none', marginRight: 10 }}>Instagram</a>}
                        {socials.github && <a href={socials.github} style={{ color: '#24292f', textDecoration: 'none', marginRight: 10 }}>GitHub</a>}
                      </div>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
        {design.config.footer_text && (
          <tr>
            <td style={{ padding: '6px 16px 0', fontSize: '10.5px', color: '#999' }}>
              {design.config.footer_text}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
