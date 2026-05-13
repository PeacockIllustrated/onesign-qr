import type { BrandDesignHydrated } from '@/types/brand';
import { resolveColors } from '@/lib/brand/hydrate';
import { SigAvatar, SecondaryLogo, resolveAvatarSettings, sigInitials } from './sig-shared';

interface SigCompactProps {
  design: BrandDesignHydrated;
}

/**
 * Compact email signature — small avatar (optional) and one or two tight
 * lines of contact info. Designed for people who want a minimal footprint.
 *
 * Layout (avatar + brand logo can coexist — logo appears as a tiny
 * wordmark inline with the company line):
 *   [avatar?]  Name · Role · Company [logo?]
 *              email · phone · website
 */
export function SigCompact({ design }: SigCompactProps) {
  const colors = resolveColors(design);
  const { profile, person, person_photo_url, logo_url } = design;
  const accent = colors.accent ?? colors.primary;
  const avatar = resolveAvatarSettings(design, 'none');
  const hasPhoto = avatar.showImage && person_photo_url !== null;
  const wantLogo = !!logo_url && design.config.show_logo !== false;
  // Tiny wordmark inline with the company name when both avatar and logo
  // are configured.
  const showInlineLogo = hasPhoto && wantLogo;

  const headlineParts: string[] = [];
  if (person?.full_name) headlineParts.push(person.full_name);
  if (person?.role) headlineParts.push(person.role);
  if (profile.name) headlineParts.push(profile.name);

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
            <td valign="middle" style={{ paddingRight: '12px', verticalAlign: 'middle' }}>
              <SigAvatar
                photoUrl={person_photo_url}
                initials={sigInitials(person?.full_name)}
                shape={avatar.shape === 'square' ? 'square' : 'circle'}
                border={avatar.border}
                borderColor={avatar.borderColor}
                sizePx={44}
                fallbackBg={`${accent}20`}
              />
            </td>
          )}

          <td valign="middle" style={{ verticalAlign: 'middle' }}>
            <div style={{ fontSize: '13.5px' }}>
              {person?.full_name && (
                <strong style={{ color: colors.primary, fontFamily: `'${profile.font_heading}', Arial, sans-serif` }}>
                  {person.full_name}
                </strong>
              )}
              {person?.role && (
                <span style={{ color: '#666' }}>
                  {person?.full_name && <span style={{ color: '#bbb' }}>  ·  </span>}
                  {person.role}
                </span>
              )}
              {profile.name && (
                <span style={{ color: '#888' }}>
                  <span style={{ color: '#bbb' }}>  ·  </span>
                  {profile.name}
                </span>
              )}
              {showInlineLogo && (
                <span style={{ marginLeft: 8, verticalAlign: 'middle' }}>
                  <SecondaryLogo url={logo_url} alt={profile.name} maxHeightPx={14} />
                </span>
              )}
            </div>

            <div style={{ marginTop: '2px', fontSize: '12.5px', color: '#555' }}>
              {person?.email && (
                <a href={`mailto:${person.email}`} style={{ color: colors.primary, textDecoration: 'none' }}>
                  {person.email}
                </a>
              )}
              {person?.email && (person?.phone || person?.mobile) && <span style={{ color: '#bbb' }}>  ·  </span>}
              {person?.phone && (
                <a href={`tel:${person.phone}`} style={{ color: '#555', textDecoration: 'none' }}>
                  {person.phone}
                </a>
              )}
              {(person?.email || person?.phone) && profile.website && <span style={{ color: '#bbb' }}>  ·  </span>}
              {profile.website && (
                <a href={profile.website} style={{ color: accent, textDecoration: 'none' }}>
                  {profile.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
