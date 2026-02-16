import { Mail, Phone, Globe, MapPin } from 'lucide-react';
import type { BioCardLayout, BioThemeConfig } from '@/types/bio';

/** Map AR string to CSS aspect-ratio value */
const COVER_AR_CSS: Record<string, string> = {
  '3:1': '3/1',
  '16:9': '16/9',
  '2:1': '2/1',
  '4:3': '4/3',
};

interface BioContactCardProps {
  title: string;
  bio: string | null;
  subtitle: string | null;
  company: string | null;
  jobTitle: string | null;
  location: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactWebsite: string | null;
  cardLayout: BioCardLayout;
  avatarUrl: string | null;
  coverUrl: string | null;
  coverAspectRatio: string | null;
  coverPositionY: number | null;
  themeConfig: BioThemeConfig;
}

// ─── Shared Helpers ──────────────────────────────────────────────────

function AvatarImage({
  avatarUrl,
  title,
  size,
  themeConfig,
}: {
  avatarUrl: string | null;
  title: string;
  size: string;
  themeConfig: BioThemeConfig;
}) {
  const { colors, fonts, animations } = themeConfig;
  const initial = title.charAt(0).toUpperCase();

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={title}
        className={`${size} rounded-full object-cover ${animations.avatarEnter}`}
        style={{ border: `3px solid ${colors.avatarRing}` }}
      />
    );
  }

  return (
    <div
      className={`${size} rounded-full flex items-center justify-center font-bold ${animations.avatarEnter}`}
      style={{
        backgroundColor: colors.accent,
        color: colors.bg,
        border: `3px solid ${colors.avatarRing}`,
        fontFamily: `'${fonts.title.family}', sans-serif`,
        fontSize: '1.5rem',
      }}
    >
      {initial}
    </div>
  );
}

function InfoLine({
  jobTitle,
  company,
  themeConfig,
  centered,
}: {
  jobTitle: string | null;
  company: string | null;
  themeConfig: BioThemeConfig;
  centered: boolean;
}) {
  const job = jobTitle?.trim() || null;
  const comp = company?.trim() || null;

  if (!job && !comp) return null;

  let text: string;
  if (job && comp) {
    text = `${job} at ${comp}`;
  } else {
    text = (job || comp)!;
  }

  return (
    <p
      className={`text-xs ${centered ? 'text-center' : 'text-left'}`}
      style={{
        color: themeConfig.colors.textSecondary,
        fontFamily: `'${themeConfig.fonts.body.family}', sans-serif`,
      }}
    >
      {text}
    </p>
  );
}

function ContactActions({
  contactEmail,
  contactPhone,
  contactWebsite,
  themeConfig,
  centered,
}: {
  contactEmail: string | null;
  contactPhone: string | null;
  contactWebsite: string | null;
  themeConfig: BioThemeConfig;
  centered: boolean;
}) {
  const email = contactEmail?.trim() || null;
  const phone = contactPhone?.trim() || null;
  const website = contactWebsite?.trim() || null;

  if (!email && !phone && !website) return null;

  const { colors } = themeConfig;
  const btnBg = colors.accent + '20';
  const iconColor = colors.accent;

  return (
    <div
      className={`flex gap-2 ${centered ? 'justify-center' : 'justify-start'}`}
    >
      {email && (
        <a
          href={`mailto:${email}`}
          aria-label="Send email"
          className="h-9 w-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
          style={{ backgroundColor: btnBg }}
        >
          <Mail className="h-4 w-4" style={{ color: iconColor }} />
        </a>
      )}
      {phone && (
        <a
          href={`tel:${phone}`}
          aria-label="Call phone"
          className="h-9 w-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
          style={{ backgroundColor: btnBg }}
        >
          <Phone className="h-4 w-4" style={{ color: iconColor }} />
        </a>
      )}
      {website && (
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Visit website"
          className="h-9 w-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
          style={{ backgroundColor: btnBg }}
        >
          <Globe className="h-4 w-4" style={{ color: iconColor }} />
        </a>
      )}
    </div>
  );
}

// ─── Layout: Centered ────────────────────────────────────────────────

function CenteredLayout({
  title,
  bio,
  subtitle,
  company,
  jobTitle,
  location,
  contactEmail,
  contactPhone,
  contactWebsite,
  avatarUrl,
  themeConfig,
}: Omit<BioContactCardProps, 'cardLayout' | 'coverUrl' | 'coverAspectRatio' | 'coverPositionY'>) {
  const { colors, fonts } = themeConfig;
  const trimmedBio = bio?.trim() || null;
  const trimmedSubtitle = subtitle?.trim() || null;
  const trimmedLocation = location?.trim() || null;

  return (
    <div className="flex flex-col items-center gap-3">
      <AvatarImage
        avatarUrl={avatarUrl}
        title={title}
        size="w-20 h-20 sm:w-24 sm:h-24"
        themeConfig={themeConfig}
      />

      <div className="flex flex-col items-center gap-1">
        <h1
          className="text-xl font-bold text-center"
          style={{
            color: colors.text,
            fontFamily: `'${fonts.title.family}', sans-serif`,
            fontWeight: fonts.title.weight,
          }}
        >
          {title}
        </h1>

        {trimmedSubtitle && (
          <p
            className="text-sm text-center"
            style={{
              color: colors.textSecondary,
              fontFamily: `'${fonts.body.family}', sans-serif`,
            }}
          >
            {trimmedSubtitle}
          </p>
        )}

        <InfoLine
          jobTitle={jobTitle}
          company={company}
          themeConfig={themeConfig}
          centered
        />

        {trimmedLocation && (
          <p
            className="text-xs text-center flex items-center gap-1"
            style={{
              color: colors.textSecondary,
              fontFamily: `'${fonts.body.family}', sans-serif`,
            }}
          >
            <MapPin className="h-3 w-3" style={{ color: colors.textSecondary }} />
            {trimmedLocation}
          </p>
        )}
      </div>

      {trimmedBio && (
        <p
          className="text-sm leading-relaxed max-w-xs text-center"
          style={{
            color: colors.textSecondary,
            fontFamily: `'${fonts.body.family}', sans-serif`,
          }}
        >
          {trimmedBio}
        </p>
      )}

      <ContactActions
        contactEmail={contactEmail}
        contactPhone={contactPhone}
        contactWebsite={contactWebsite}
        themeConfig={themeConfig}
        centered
      />
    </div>
  );
}

// ─── Layout: Left-Aligned ────────────────────────────────────────────

function LeftAlignedLayout({
  title,
  bio,
  subtitle,
  company,
  jobTitle,
  location,
  contactEmail,
  contactPhone,
  contactWebsite,
  avatarUrl,
  themeConfig,
}: Omit<BioContactCardProps, 'cardLayout' | 'coverUrl' | 'coverAspectRatio' | 'coverPositionY'>) {
  const { colors, fonts } = themeConfig;
  const trimmedBio = bio?.trim() || null;
  const trimmedSubtitle = subtitle?.trim() || null;
  const trimmedLocation = location?.trim() || null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <AvatarImage
          avatarUrl={avatarUrl}
          title={title}
          size="w-20 h-20"
          themeConfig={themeConfig}
        />

        <div className="flex flex-col gap-1">
          <h1
            className="text-lg font-bold text-left"
            style={{
              color: colors.text,
              fontFamily: `'${fonts.title.family}', sans-serif`,
              fontWeight: fonts.title.weight,
            }}
          >
            {title}
          </h1>

          {trimmedSubtitle && (
            <p
              className="text-sm text-left"
              style={{
                color: colors.textSecondary,
                fontFamily: `'${fonts.body.family}', sans-serif`,
              }}
            >
              {trimmedSubtitle}
            </p>
          )}

          <InfoLine
            jobTitle={jobTitle}
            company={company}
            themeConfig={themeConfig}
            centered={false}
          />

          {trimmedLocation && (
            <p
              className="text-xs text-left flex items-center gap-1"
              style={{
                color: colors.textSecondary,
                fontFamily: `'${fonts.body.family}', sans-serif`,
              }}
            >
              <MapPin className="h-3 w-3" style={{ color: colors.textSecondary }} />
              {trimmedLocation}
            </p>
          )}
        </div>
      </div>

      {trimmedBio && (
        <p
          className="text-sm leading-relaxed text-left"
          style={{
            color: colors.textSecondary,
            fontFamily: `'${fonts.body.family}', sans-serif`,
          }}
        >
          {trimmedBio}
        </p>
      )}

      <ContactActions
        contactEmail={contactEmail}
        contactPhone={contactPhone}
        contactWebsite={contactWebsite}
        themeConfig={themeConfig}
        centered={false}
      />
    </div>
  );
}

// ─── Layout: Split ───────────────────────────────────────────────────

function SplitLayout({
  title,
  bio,
  subtitle,
  company,
  jobTitle,
  location,
  contactEmail,
  contactPhone,
  contactWebsite,
  avatarUrl,
  coverUrl,
  coverAspectRatio,
  coverPositionY,
  themeConfig,
}: Omit<BioContactCardProps, 'cardLayout'>) {
  const { colors, fonts } = themeConfig;
  const trimmedBio = bio?.trim() || null;
  const trimmedSubtitle = subtitle?.trim() || null;
  const trimmedLocation = location?.trim() || null;
  const arCSS = COVER_AR_CSS[coverAspectRatio ?? '3:1'] ?? '3/1';
  const posY = coverPositionY ?? 50;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Cover banner */}
      {coverUrl ? (
        <img
          src={coverUrl}
          alt=""
          className="w-full object-cover"
          style={{
            aspectRatio: arCSS,
            objectPosition: `center ${posY}%`,
            borderRadius: themeConfig.borderRadius,
          }}
        />
      ) : (
        <div
          className="w-full"
          style={{
            aspectRatio: arCSS,
            backgroundColor: colors.accent,
            borderRadius: themeConfig.borderRadius,
          }}
        />
      )}

      {/* Overlapping avatar */}
      <div className="-mt-10">
        <AvatarImage
          avatarUrl={avatarUrl}
          title={title}
          size="w-20 h-20"
          themeConfig={themeConfig}
        />
      </div>

      <div className="flex flex-col items-center gap-1">
        <h1
          className="text-xl font-bold text-center"
          style={{
            color: colors.text,
            fontFamily: `'${fonts.title.family}', sans-serif`,
            fontWeight: fonts.title.weight,
          }}
        >
          {title}
        </h1>

        {trimmedSubtitle && (
          <p
            className="text-sm text-center"
            style={{
              color: colors.textSecondary,
              fontFamily: `'${fonts.body.family}', sans-serif`,
            }}
          >
            {trimmedSubtitle}
          </p>
        )}

        <InfoLine
          jobTitle={jobTitle}
          company={company}
          themeConfig={themeConfig}
          centered
        />

        {trimmedLocation && (
          <p
            className="text-xs text-center flex items-center justify-center gap-1"
            style={{
              color: colors.textSecondary,
              fontFamily: `'${fonts.body.family}', sans-serif`,
            }}
          >
            <MapPin className="h-3 w-3" style={{ color: colors.textSecondary }} />
            {trimmedLocation}
          </p>
        )}
      </div>

      {trimmedBio && (
        <p
          className="text-sm leading-relaxed max-w-xs text-center"
          style={{
            color: colors.textSecondary,
            fontFamily: `'${fonts.body.family}', sans-serif`,
          }}
        >
          {trimmedBio}
        </p>
      )}

      <ContactActions
        contactEmail={contactEmail}
        contactPhone={contactPhone}
        contactWebsite={contactWebsite}
        themeConfig={themeConfig}
        centered
      />
    </div>
  );
}

// ─── Layout: Minimal ─────────────────────────────────────────────────

function MinimalLayout({
  title,
  bio,
  subtitle,
  company,
  jobTitle,
  location,
  contactEmail,
  contactPhone,
  contactWebsite,
  themeConfig,
}: Omit<BioContactCardProps, 'cardLayout' | 'coverUrl' | 'coverAspectRatio' | 'coverPositionY' | 'avatarUrl'>) {
  const { colors, fonts } = themeConfig;
  const trimmedBio = bio?.trim() || null;
  const trimmedSubtitle = subtitle?.trim() || null;
  const trimmedLocation = location?.trim() || null;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-col items-center gap-1">
        <h1
          className="text-2xl font-bold text-center"
          style={{
            color: colors.text,
            fontFamily: `'${fonts.title.family}', sans-serif`,
            fontWeight: fonts.title.weight,
          }}
        >
          {title}
        </h1>

        {trimmedSubtitle && (
          <p
            className="text-base text-center"
            style={{
              color: colors.textSecondary,
              fontFamily: `'${fonts.body.family}', sans-serif`,
            }}
          >
            {trimmedSubtitle}
          </p>
        )}

        <InfoLine
          jobTitle={jobTitle}
          company={company}
          themeConfig={themeConfig}
          centered
        />

        {trimmedLocation && (
          <p
            className="text-xs text-center flex items-center justify-center gap-1"
            style={{
              color: colors.textSecondary,
              fontFamily: `'${fonts.body.family}', sans-serif`,
            }}
          >
            <MapPin className="h-3 w-3" style={{ color: colors.textSecondary }} />
            {trimmedLocation}
          </p>
        )}
      </div>

      {trimmedBio && (
        <p
          className="text-sm leading-relaxed max-w-xs text-center"
          style={{
            color: colors.textSecondary,
            fontFamily: `'${fonts.body.family}', sans-serif`,
          }}
        >
          {trimmedBio}
        </p>
      )}

      <ContactActions
        contactEmail={contactEmail}
        contactPhone={contactPhone}
        contactWebsite={contactWebsite}
        themeConfig={themeConfig}
        centered
      />
    </div>
  );
}

// ─── Layout: Cover ───────────────────────────────────────────────────

function CoverLayout({
  title,
  bio,
  subtitle,
  company,
  jobTitle,
  location,
  contactEmail,
  contactPhone,
  contactWebsite,
  avatarUrl,
  coverUrl,
  coverAspectRatio,
  coverPositionY,
  themeConfig,
}: Omit<BioContactCardProps, 'cardLayout'>) {
  const { colors, fonts } = themeConfig;
  const trimmedBio = bio?.trim() || null;
  const trimmedSubtitle = subtitle?.trim() || null;
  const trimmedLocation = location?.trim() || null;
  const arCSS = COVER_AR_CSS[coverAspectRatio ?? '16:9'] ?? '16/9';
  const posY = coverPositionY ?? 50;

  const gradientOverlay =
    'linear-gradient(to top, rgba(0,0,0,0.6), transparent)';

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Hero cover with gradient overlay */}
      <div
        className="relative w-full overflow-hidden"
        style={{ borderRadius: themeConfig.borderRadius }}
      >
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            className="w-full object-cover"
            style={{
              aspectRatio: arCSS,
              objectPosition: `center ${posY}%`,
            }}
          />
        ) : (
          <div
            className="w-full"
            style={{
              aspectRatio: arCSS,
              backgroundColor: colors.accent,
            }}
          />
        )}
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{ background: gradientOverlay }}
        />
      </div>

      {/* Overlapping avatar */}
      <div className="-mt-10">
        <AvatarImage
          avatarUrl={avatarUrl}
          title={title}
          size="w-20 h-20"
          themeConfig={themeConfig}
        />
      </div>

      <div className="flex flex-col items-center gap-1">
        <h1
          className="text-xl font-bold text-center"
          style={{
            color: colors.text,
            fontFamily: `'${fonts.title.family}', sans-serif`,
            fontWeight: fonts.title.weight,
          }}
        >
          {title}
        </h1>

        {trimmedSubtitle && (
          <p
            className="text-sm text-center"
            style={{
              color: colors.textSecondary,
              fontFamily: `'${fonts.body.family}', sans-serif`,
            }}
          >
            {trimmedSubtitle}
          </p>
        )}

        <InfoLine
          jobTitle={jobTitle}
          company={company}
          themeConfig={themeConfig}
          centered
        />

        {trimmedLocation && (
          <p
            className="text-xs text-center flex items-center justify-center gap-1"
            style={{
              color: colors.textSecondary,
              fontFamily: `'${fonts.body.family}', sans-serif`,
            }}
          >
            <MapPin className="h-3 w-3" style={{ color: colors.textSecondary }} />
            {trimmedLocation}
          </p>
        )}
      </div>

      {trimmedBio && (
        <p
          className="text-sm leading-relaxed max-w-xs text-center"
          style={{
            color: colors.textSecondary,
            fontFamily: `'${fonts.body.family}', sans-serif`,
          }}
        >
          {trimmedBio}
        </p>
      )}

      <ContactActions
        contactEmail={contactEmail}
        contactPhone={contactPhone}
        contactWebsite={contactWebsite}
        themeConfig={themeConfig}
        centered
      />
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

/**
 * Server component that renders the contact card header section of a bio page.
 * Supports 5 layout variants: centered, left-aligned, split, minimal, cover.
 */
export function BioContactCard(props: BioContactCardProps) {
  const { cardLayout, ...rest } = props;

  switch (cardLayout) {
    case 'left-aligned':
      return <LeftAlignedLayout {...rest} />;
    case 'split':
      return <SplitLayout {...rest} />;
    case 'minimal':
      return <MinimalLayout {...rest} />;
    case 'cover':
      return <CoverLayout {...rest} />;
    case 'centered':
    default:
      return <CenteredLayout {...rest} />;
  }
}
