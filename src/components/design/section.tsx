import { ReactNode } from 'react';

interface SectionProps {
  children: ReactNode;
  /**
   * Default: max-w-6xl mx-auto px-5 md:px-8. Pass `widthClass` to override
   * (e.g. "max-w-5xl" for narrower content).
   */
  widthClass?: string;
  /**
   * Default vertical padding. Override for hero ("py-20 md:py-28") or
   * compressed sections ("py-10").
   */
  paddingClass?: string;
  /** Add a thin border-top for visual rhythm between sections. */
  topRule?: boolean;
  className?: string;
}

export function Section({
  children,
  widthClass = 'max-w-6xl',
  paddingClass = 'py-16 md:py-20',
  topRule = false,
  className = '',
}: SectionProps) {
  return (
    <section
      className={`${topRule ? 'border-t border-zinc-800' : ''} ${paddingClass} ${className}`}
    >
      <div className={`${widthClass} mx-auto px-5 md:px-8`}>{children}</div>
    </section>
  );
}
