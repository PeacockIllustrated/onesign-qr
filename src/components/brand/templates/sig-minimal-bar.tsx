import type { BrandDesignHydrated } from '@/types/brand';
import { resolveColors } from '@/lib/brand/hydrate';
import { SigAvatar, SecondaryLogo, resolveAvatarSettings, sigInitials } from './sig-shared';

interface SigMinimalBarProps {
  design: BrandDesignHydrated;
}

/**
 * Minimal Bar — single vertical accent rule on the left, all type stacked
 * to its right. The quietest signature in the set.
 *
 * Use case: people who want to communicate "professional but not noisy".
 * Pairs especially well with serif heading fonts.
 */
export function SigMinimalBar({ design }: SigMinimalBarProps) {
  const colors = resolveColors(design);
  const { profile, person, person_photo_url, logo_url } = design;
  const accent = colors.accent ?? colors.primary;
  const socials = profile.socials ?? {};
  const tagline = design.config.tagline ?? profile.tagline;
  const avatar = resolveAvatarSettings(design, 'none');
  const hasPhoto = avatar.showImage && person_photo_url !== null;
  const showSocials = design.config.show_socials !== false;
  const wantLogo = !!logo_url && design.config.show_logo !== false;
  // Small wordmark sits at the top of the type column when both visuals
  // are configured. If only the logo is present, it stands in for the
  // (absent) avatar to the left of the bar.
  const showSecondaryLogo = hasPhoto && wantLogo;
  const showLogoInAvatarSlot = !hasPhoto && wantLogo;

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
      }}
    >
      <tbody>
        <tr>
          {hasPhoto && (
            <td valign="top" style={{ paddingRight: '14px', verticalAlign: 'top' }}>
              <SigAvatar
                photoUrl={person_photo_url}
                initials={sigInitials(person?.full_name)}
                shape={avatar.shape === 'square' ? 'square' : 'circle'}
                border={avatar.border}
                borderColor={avatar.borderColor}
                sizePx={52}
                fallbackBg={`${accent}20`}
              />
            </td>
          )}
          {showLogoInAvatarSlot && (
            <td valign="top" style={{ paddingRight: '14px', verticalAlign: 'top' }}>
              <SecondaryLogo url={logo_url} alt={profile.name} maxHeightPx={36} />
            </td>
          )}
          <td valign="top" style={{ borderLeft: `2px solid ${accent}`, paddingLeft: '14px', verticalAlign: 'top' }}>
            {showSecondaryLogo && (
              <div style={{ marginBottom: '6px' }}>
                <SecondaryLogo url={logo_url} alt={profile.name} maxHeightPx={18} />
              </div>
            )}
            <div
              style={{
                fontFamily: `'${profile.font_heading}', Georgia, serif`,
                fontSize: '15px',
                fontWeight: 600,
                color: colors.primary,
                letterSpacing: '-0.005em',
                lineHeight: 1.25,
              }}
            >
              {person?.full_name ?? 'Your Name'}
            </div>
            {person?.role && (
              <div style={{ color: '#555', fontSize: '12.5px', marginTop: '1px' }}>
                {person.role}
                {profile.name && <span style={{ color: '#999' }}> · {profile.name}</span>}
              </div>
            )}
            {tagline && (
              <div style={{ fontSize: '11.5px', color: '#999', fontStyle: 'italic', marginTop: '2px' }}>
                {tagline}
              </div>
            )}
            <div style={{ marginTop: '6px', fontSize: '12px' }}>
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

            {showSocials && (socials.linkedin || socials.twitter || socials.github) && (
              <div style={{ marginTop: '6px', fontSize: '11.5px' }}>
                {socials.linkedin && <a href={socials.linkedin} style={{ color: '#0a66c2', textDecoration: 'none', marginRight: 10 }}>LinkedIn</a>}
                {socials.twitter && <a href={socials.twitter} style={{ color: '#1da1f2', textDecoration: 'none', marginRight: 10 }}>Twitter</a>}
                {socials.github && <a href={socials.github} style={{ color: '#24292f', textDecoration: 'none', marginRight: 10 }}>GitHub</a>}
              </div>
            )}

            {design.config.footer_text && (
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#aaa' }}>
                {design.config.footer_text}
              </div>
            )}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
