import type { BrandDesignHydrated } from '@/types/brand';
import { CARD_DIMENSIONS } from '@/lib/brand/templates';

/** Avatar block — circle/square, optional border, sized in mm. */
export function Avatar({
  src,
  initials,
  shape,
  border,
  borderColor,
  sizeMm,
  background,
}: {
  src: string | null;
  initials: string;
  shape: 'circle' | 'square';
  border: boolean;
  borderColor: string;
  sizeMm: number;
  background: string;
}) {
  const radius = shape === 'circle' ? '50%' : '1.5mm';
  return (
    <div
      style={{
        width: `${sizeMm}mm`,
        height: `${sizeMm}mm`,
        borderRadius: radius,
        overflow: 'hidden',
        backgroundColor: background,
        border: border ? `0.4mm solid ${borderColor}` : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span style={{ fontSize: `${sizeMm * 0.32}mm`, color: borderColor, fontWeight: 600 }}>
          {initials}
        </span>
      )}
    </div>
  );
}

export function getInitials(name: string | undefined): string {
  if (!name) return '·';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/** Print-mode bleed wrapper with crop marks at corners. */
export function PrintBleed({
  children,
  bgColor,
}: {
  children: React.ReactNode;
  bgColor: string;
}) {
  return (
    <div
      style={{
        width: `${CARD_DIMENSIONS.bleed_width_mm}mm`,
        height: `${CARD_DIMENSIONS.bleed_height_mm}mm`,
        position: 'relative',
        backgroundColor: bgColor,
        boxSizing: 'border-box',
        padding: `${CARD_DIMENSIONS.bleed_mm}mm`,
      }}
    >
      {children}
      <CropMarks bleedMm={CARD_DIMENSIONS.bleed_mm} />
    </div>
  );
}

function CropMarks({ bleedMm }: { bleedMm: number }) {
  const len = 3;
  const offset = bleedMm;
  const lineStyle: React.CSSProperties = {
    position: 'absolute',
    backgroundColor: '#000',
  };
  return (
    <>
      <div style={{ ...lineStyle, top: `${offset}mm`, left: 0, height: '0.15mm', width: `${len}mm` }} />
      <div style={{ ...lineStyle, top: 0, left: `${offset}mm`, width: '0.15mm', height: `${len}mm` }} />
      <div style={{ ...lineStyle, top: `${offset}mm`, right: 0, height: '0.15mm', width: `${len}mm` }} />
      <div style={{ ...lineStyle, top: 0, right: `${offset}mm`, width: '0.15mm', height: `${len}mm` }} />
      <div style={{ ...lineStyle, bottom: `${offset}mm`, left: 0, height: '0.15mm', width: `${len}mm` }} />
      <div style={{ ...lineStyle, bottom: 0, left: `${offset}mm`, width: '0.15mm', height: `${len}mm` }} />
      <div style={{ ...lineStyle, bottom: `${offset}mm`, right: 0, height: '0.15mm', width: `${len}mm` }} />
      <div style={{ ...lineStyle, bottom: 0, right: `${offset}mm`, width: '0.15mm', height: `${len}mm` }} />
    </>
  );
}

export interface SideProps {
  design: BrandDesignHydrated;
  print?: boolean;
}
