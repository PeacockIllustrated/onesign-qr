import { ReactNode } from 'react';

interface DarkShellProps {
  children: ReactNode;
  /**
   * Add a subtle lynx-tinted radial glow behind content. Use sparingly — on
   * hero sections, not body sections.
   */
  glow?: boolean;
  /**
   * Overlay a faint grid-line texture at ~4% opacity. Use on hero sections
   * where you want a "canvas" feel.
   */
  grid?: boolean;
  className?: string;
}

export function DarkShell({
  children,
  glow = false,
  grid = false,
  className = '',
}: DarkShellProps) {
  return (
    <div
      className={`relative bg-zinc-950 text-zinc-50 overflow-hidden ${className}`}
    >
      {grid && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      )}
      {glow && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 -left-32 w-[40rem] h-[40rem] rounded-full opacity-20 blur-3xl"
            style={{
              background:
                'radial-gradient(circle, rgba(88,163,134,0.45) 0%, transparent 60%)',
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 -right-32 w-[36rem] h-[36rem] rounded-full opacity-15 blur-3xl"
            style={{
              background:
                'radial-gradient(circle, rgba(88,163,134,0.35) 0%, transparent 60%)',
            }}
          />
        </>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
