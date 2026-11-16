'use client';

/**
 * Botanical — a bespoke, high-end "wow factor" bio-page style for beauty /
 * aesthetics clients. Opt-in per page via `background_variant = 'botanical'`.
 *
 * This is a full-page takeover: when active, the public route renders THIS
 * instead of the standard contact-card + link-button layout, so the default
 * rendering path (and every other page) is completely untouched.
 *
 * Self-contained: brings its own blush palette, Google Fonts and hand-drawn
 * botanical SVGs. Reusable for future aesthetics clients.
 */

interface BotanicalLink {
  id: string;
  title: string;
  url: string;
}

interface BotanicalBioPageProps {
  title: string;
  subtitle: string | null;
  location: string | null;
  avatarUrl: string | null;
  links: BotanicalLink[];
  pageId: string;
}

/** Pick a tasteful line-icon based on the link's destination. */
function linkIcon(url: string): 'calendar' | 'globe' | 'instagram' | 'facebook' | 'mail' {
  const u = url.toLowerCase();
  if (u.includes('instagram')) return 'instagram';
  if (u.includes('facebook')) return 'facebook';
  if (u.includes('book') || u.includes('appointment') || u.includes('fresha') || u.includes('calendly')) return 'calendar';
  if (u.startsWith('mailto:') || u.includes('@')) return 'mail';
  return 'globe';
}

function Icon({ kind }: { kind: ReturnType<typeof linkIcon> }) {
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6 } as const;
  switch (kind) {
    case 'calendar':
      return (<svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4M9 14l2 2 4-4" /></svg>);
    case 'instagram':
      return (<svg {...common} strokeWidth={1.5}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" /></svg>);
    case 'facebook':
      return (<svg {...common} strokeWidth={1.5}><path d="M15 8h-2a2 2 0 0 0-2 2v10M8 13h6" /></svg>);
    case 'mail':
      return (<svg {...common} strokeWidth={1.5}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>);
    default:
      return (<svg {...common} strokeWidth={1.5}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" /></svg>);
  }
}

const Arrow = () => (
  <svg className="bb-arr" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

function initials(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

const CSS = `
.bb-root{position:relative;min-height:100vh;width:100%;display:flex;justify-content:center;overflow-x:hidden;
  font-family:'Montserrat',sans-serif;color:#2B2622;-webkit-font-smoothing:antialiased;
  background:radial-gradient(125% 70% at 50% -8%, #FBEEF0 0%, #F5E1E4 48%, #ECCAD1 100%);}
.bb-root *{box-sizing:border-box}
.bb-root::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;opacity:.5;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");}
.bb-wrap{position:relative;z-index:1;width:100%;max-width:468px;padding:26px 22px 56px;display:flex;flex-direction:column;align-items:center}
.bb-root svg{display:block}
.bb-ink{stroke:#B8868F;stroke-width:1.5;fill:none;stroke-linecap:round;vector-effect:non-scaling-stroke}
.bb-leaf{stroke:#9FB293;stroke-width:1.3;fill:rgba(159,178,147,.20);vector-effect:non-scaling-stroke}
.bb-petal{stroke:#C9818C;stroke-width:1.4;fill:rgba(201,129,140,.16);vector-effect:non-scaling-stroke}
.bb-dot{fill:#C6A04E}
.bb-header{position:relative;z-index:2;text-align:center;padding-top:8px;width:100%}
.bb-crest{position:relative;display:flex;flex-direction:column;align-items:center}
.bb-crown{width:312px;max-width:82%;margin-bottom:-90px;position:relative;z-index:1;transform-origin:50% 72%;animation:bb-sway 11s ease-in-out infinite alternate}
.bb-arch{position:absolute;top:46px;left:50%;transform:translateX(-50%);width:300px;z-index:0;opacity:.9}
.bb-spray-l{position:absolute;top:128px;left:-18px;width:128px;z-index:0;opacity:.95;animation:bb-floatY 8s ease-in-out infinite}
.bb-spray-r{position:absolute;top:128px;right:-22px;width:128px;z-index:0;opacity:.95;transform:scaleX(-1);animation:bb-floatYr 9s ease-in-out infinite}
.bb-avatar-frame{position:relative;width:146px;height:146px;z-index:3;animation:bb-rise .9s cubic-bezier(.2,.7,.2,1) both}
.bb-avatar-frame::before{content:"";position:absolute;inset:-24px;border-radius:50%;background:radial-gradient(closest-side, rgba(255,251,248,.92), rgba(255,251,248,0));z-index:-1}
.bb-avatar-frame::after{content:"";position:absolute;inset:-9px;border-radius:50%;border:1px solid rgba(184,134,143,.6);box-shadow:0 20px 44px -20px rgba(120,70,75,.5)}
.bb-avatar{width:146px;height:146px;border-radius:50%;object-fit:cover;background:#FFFBF8;padding:13px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.7)}
.bb-mono{width:146px;height:146px;border-radius:50%;background:#FFFBF8;box-shadow:inset 0 0 0 1px rgba(255,255,255,.7);display:flex;align-items:center;justify-content:center;
  font-family:'Cormorant Garamond',serif;font-weight:500;font-size:52px;letter-spacing:1px;color:#B8868F}
.bb-name{font-family:'Cormorant Garamond',serif;font-weight:500;font-size:43px;line-height:1.04;letter-spacing:.5px;color:#2B2622;margin-top:20px;margin-bottom:13px;position:relative;z-index:2;animation:bb-rise .9s .08s cubic-bezier(.2,.7,.2,1) both}
.bb-subtitle{font-size:10.5px;font-weight:500;letter-spacing:3.4px;text-transform:uppercase;color:#4A433E;position:relative;z-index:2;animation:bb-rise .9s .16s cubic-bezier(.2,.7,.2,1) both}
.bb-meta{display:inline-flex;align-items:center;gap:6px;margin-top:15px;font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:#8a7d75;position:relative;z-index:2;animation:bb-rise .9s .22s cubic-bezier(.2,.7,.2,1) both}
.bb-meta svg{width:12px;height:12px}
.bb-rule{display:flex;align-items:center;justify-content:center;gap:13px;margin:24px auto 26px;position:relative;z-index:2;animation:bb-rise .9s .28s cubic-bezier(.2,.7,.2,1) both}
.bb-rule .bb-line{height:1px;width:62px;background:linear-gradient(90deg,transparent,rgba(184,134,143,.85))}
.bb-rule .bb-line.r{background:linear-gradient(90deg,rgba(184,134,143,.85),transparent)}
.bb-links{position:relative;z-index:2;width:100%;display:flex;flex-direction:column;gap:15px}
.bb-btn{position:relative;display:flex;align-items:center;gap:14px;width:100%;padding:19px 22px;border-radius:16px;font-size:13px;font-weight:500;letter-spacing:1.3px;text-transform:uppercase;text-decoration:none;cursor:pointer;transition:transform .25s ease,box-shadow .25s ease;animation:bb-rise .9s cubic-bezier(.2,.7,.2,1) both}
.bb-btn .bb-ico{width:20px;height:20px;flex:none;display:flex;align-items:center;justify-content:center}
.bb-btn .bb-ico svg{width:20px;height:20px}
.bb-btn .bb-label{flex:1;text-align:center;transform:translateX(-10px)}
.bb-btn .bb-arr{width:16px;height:16px;flex:none;opacity:.5;transition:transform .25s ease}
.bb-btn:hover{transform:translateY(-3px)}
.bb-btn:hover .bb-arr{transform:translateX(4px)}
.bb-btn.primary{background:linear-gradient(180deg,#3a332e,#231e1a);color:#FFFBF8;box-shadow:0 18px 32px -14px rgba(43,38,34,.7)}
.bb-btn.ghost{background:rgba(255,251,248,.66);color:#2B2622;border:1px solid rgba(184,134,143,.55);backdrop-filter:blur(6px);box-shadow:0 12px 26px -18px rgba(120,70,75,.55)}
.bb-btn.ghost:hover{background:rgba(255,251,248,.9)}
.bb-footer{position:relative;z-index:2;margin-top:36px;text-align:center;animation:bb-rise .9s .58s cubic-bezier(.2,.7,.2,1) both}
.bb-foot-link{font-size:9.5px;letter-spacing:2.4px;text-transform:uppercase;color:#a3968e;text-decoration:none}
.bb-foot-link:hover{color:#8a7d75}
@keyframes bb-rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes bb-floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
@keyframes bb-floatYr{0%,100%{transform:scaleX(-1) translateY(0)}50%{transform:scaleX(-1) translateY(-9px)}}
@keyframes bb-sway{0%{transform:rotate(-1.4deg)}100%{transform:rotate(1.4deg)}}
@media (prefers-reduced-motion: reduce){.bb-root *{animation:none !important}}
`;

export function BotanicalBioPage({ title, subtitle, location, avatarUrl, links, pageId }: BotanicalBioPageProps) {
  const track = (itemId: string) => {
    try {
      navigator.sendBeacon('/api/bio/track', JSON.stringify({ item_id: itemId, page_id: pageId }));
    } catch { /* non-critical */ }
  };

  return (
    <div className="bb-root">
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Montserrat:wght@300;400;500;600&display=swap" precedence="default" />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* reusable botanical symbols */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true"><defs>
        <g id="bb-rose">
          <circle className="bb-petal" r="11" />
          <path className="bb-petal" d="M0 -6 C5 -6 6 0 2 3 C-1 5 -4 2 -3 -1" />
          <path className="bb-petal" d="M3 -9 C10 -8 11 1 5 5" />
          <path className="bb-petal" d="M6 4 C10 10 1 13 -4 8" />
          <path className="bb-petal" d="M-5 9 C-12 6 -10 -3 -4 -4" />
          <path className="bb-petal" d="M-7 -5 C-10 -12 1 -13 5 -7" />
        </g>
        <g id="bb-bud">
          <path className="bb-ink" d="M0 8 L0 -1" />
          <path className="bb-petal" d="M0 -1 C-5 -1 -5 -9 0 -11 C5 -9 5 -1 0 -1Z" />
          <path className="bb-leaf" d="M0 6 C-6 5 -6 0 0 0" /><path className="bb-leaf" d="M0 6 C6 5 6 0 0 0" />
        </g>
        <g id="bb-sprig">
          <path className="bb-ink" d="M0 0 C18 8 34 26 44 62" />
          <ellipse className="bb-leaf" cx="12" cy="14" rx="13" ry="5" transform="rotate(28 12 14)" />
          <ellipse className="bb-leaf" cx="22" cy="30" rx="14" ry="5.5" transform="rotate(34 22 30)" />
          <ellipse className="bb-leaf" cx="32" cy="48" rx="13" ry="5" transform="rotate(42 32 48)" />
          <ellipse className="bb-leaf" cx="8" cy="22" rx="11" ry="4.5" transform="rotate(-8 8 22)" />
          <ellipse className="bb-leaf" cx="16" cy="40" rx="12" ry="5" transform="rotate(2 16 40)" />
        </g>
      </defs></svg>

      <div className="bb-wrap">
        <header className="bb-header">
          <div className="bb-crest">
            {/* floral crown cresting the avatar */}
            <svg className="bb-crown" viewBox="0 0 300 150" fill="none" aria-hidden="true">
              <path className="bb-ink" d="M28 142 C56 44 244 44 272 142" />
              <path className="bb-ink" d="M46 144 C72 62 228 62 254 144" opacity=".6" />
              <g className="bb-leaf">
                <ellipse cx="40" cy="120" rx="10" ry="4" transform="rotate(-72 40 120)" />
                <ellipse cx="52" cy="102" rx="12" ry="4.6" transform="rotate(-62 52 102)" />
                <ellipse cx="70" cy="82" rx="13" ry="5" transform="rotate(-50 70 82)" />
                <ellipse cx="96" cy="65" rx="13" ry="5" transform="rotate(-34 96 65)" />
                <ellipse cx="123" cy="55" rx="12" ry="4.8" transform="rotate(-18 123 55)" />
              </g>
              <g className="bb-leaf">
                <ellipse cx="260" cy="120" rx="10" ry="4" transform="rotate(72 260 120)" />
                <ellipse cx="248" cy="102" rx="12" ry="4.6" transform="rotate(62 248 102)" />
                <ellipse cx="230" cy="82" rx="13" ry="5" transform="rotate(50 230 82)" />
                <ellipse cx="204" cy="65" rx="13" ry="5" transform="rotate(34 204 65)" />
                <ellipse cx="177" cy="55" rx="12" ry="4.8" transform="rotate(18 177 55)" />
              </g>
              <use href="#bb-rose" transform="translate(150 50) scale(1.35)" />
              <use href="#bb-rose" transform="translate(118 60) scale(.95)" />
              <use href="#bb-rose" transform="translate(182 60) scale(.95)" />
              <use href="#bb-bud" transform="translate(98 76) rotate(-32) scale(.9)" />
              <use href="#bb-bud" transform="translate(202 76) rotate(32) scale(.9)" />
              <circle className="bb-dot" cx="136" cy="42" r="2.4" />
              <circle className="bb-dot" cx="164" cy="42" r="2.4" />
            </svg>

            <svg className="bb-arch" viewBox="0 0 300 430" fill="none" aria-hidden="true">
              <path d="M30 430 L30 160 C30 92 90 40 150 40 C210 40 270 92 270 160 L270 430" stroke="#B8868F" strokeWidth="1.3" opacity=".5" />
              <path d="M43 430 L43 164 C43 104 96 56 150 56 C204 56 257 104 257 164 L257 430" stroke="#C6A04E" strokeWidth="1" opacity=".4" />
            </svg>

            <svg className="bb-spray-l" viewBox="0 0 130 230" fill="none" aria-hidden="true">
              <path className="bb-ink" d="M20 6 C40 74 42 150 30 224" />
              <use href="#bb-sprig" transform="translate(22 36) rotate(-8) scale(1.05)" />
              <use href="#bb-sprig" transform="translate(28 110) rotate(-2) scale(1.0)" />
              <use href="#bb-rose" transform="translate(58 52) scale(1.1)" />
              <use href="#bb-bud" transform="translate(30 168) rotate(-18) scale(.95)" />
              <circle className="bb-dot" cx="22" cy="132" r="2.6" />
            </svg>
            <svg className="bb-spray-r" viewBox="0 0 130 230" fill="none" aria-hidden="true">
              <path className="bb-ink" d="M20 6 C40 74 42 150 30 224" />
              <use href="#bb-sprig" transform="translate(22 36) rotate(-8) scale(1.05)" />
              <use href="#bb-sprig" transform="translate(28 110) rotate(-2) scale(1.0)" />
              <use href="#bb-rose" transform="translate(58 52) scale(1.1)" />
              <use href="#bb-bud" transform="translate(30 168) rotate(-18) scale(.95)" />
            </svg>

            <div className="bb-avatar-frame">
              {avatarUrl
                ? <img className="bb-avatar" src={avatarUrl} alt={title} />
                : <div className="bb-mono">{initials(title)}</div>}
            </div>
          </div>

          <h1 className="bb-name">{title}</h1>
          {subtitle && <div className="bb-subtitle">{subtitle}</div>}
          {location && (
            <div className="bb-meta">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M12 21s-7-5.2-7-11a7 7 0 0 1 14 0c0 5.8-7 11-7 11Z" /><circle cx="12" cy="10" r="2.4" /></svg>
              {location}
            </div>
          )}
          <div className="bb-rule"><span className="bb-line"></span>
            <svg width="22" height="22" viewBox="0 0 26 26"><use href="#bb-bud" transform="translate(13 14) scale(.8)" /></svg>
            <span className="bb-line r"></span>
          </div>
        </header>

        <nav className="bb-links">
          {links.map((link, i) => (
            <a
              key={link.id}
              className={`bb-btn ${i === 0 ? 'primary' : 'ghost'}`}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track(link.id)}
              style={{ animationDelay: `${0.34 + i * 0.08}s` }}
            >
              <span className="bb-ico"><Icon kind={linkIcon(link.url)} /></span>
              <span className="bb-label">{link.title}</span>
              <Arrow />
            </a>
          ))}
        </nav>

        <div className="bb-footer">
          <svg width="130" height="40" viewBox="0 0 130 40" fill="none" style={{ opacity: .8, margin: '0 auto 12px' }} aria-hidden="true">
            <path className="bb-ink" d="M12 20h34M84 20h34" strokeWidth="1.3" />
            <use href="#bb-sprig" transform="translate(46 8) rotate(40) scale(.55)" />
            <use href="#bb-sprig" transform="translate(84 8) rotate(-40) scale(-.55,.55)" />
            <use href="#bb-rose" transform="translate(65 20) scale(.62)" />
          </svg>
          <a className="bb-foot-link" href="/">Powered by OneSign</a>
        </div>
      </div>
    </div>
  );
}
