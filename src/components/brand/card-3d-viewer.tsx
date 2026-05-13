'use client';

import { useRef, useState, useEffect, type ReactNode } from 'react';
import { RotateCw } from 'lucide-react';

interface Card3dViewerProps {
  front: ReactNode;
  back: ReactNode;
  /** Card aspect ratio as a CSS aspect-ratio string, e.g. '85 / 55'. */
  aspect?: string;
  /** Visual width of the card on screen (CSS units). */
  width?: string;
}

/**
 * Interactive 3D card preview.
 *
 * - Idle: card tilts subtly toward the cursor (perspective parallax).
 * - Click anywhere on the card OR the Flip button: rotates 180° to the other side.
 * - Cursor parallax keeps working on whichever side is currently showing.
 *
 * The front and back React subtrees are rendered at their actual mm-based
 * dimensions and then scaled to fit the requested `width`. This means the
 * preview is pixel-faithful to the print output.
 */
export function Card3dViewer({
  front,
  back,
  aspect = '85 / 55',
  width = '420px',
}: Card3dViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;   // 0..1
    const py = (e.clientY - rect.top) / rect.height;   // 0..1
    // Map to ±maxDeg tilt. Inverted Y because positive rotateX tilts forward.
    const maxDeg = 9;
    setTilt({
      x: (0.5 - py) * 2 * maxDeg,
      y: (px - 0.5) * 2 * maxDeg,
    });
  }

  function handleMouseLeave() {
    setIsHovering(false);
    setTilt({ x: 0, y: 0 });
  }

  // Compose transform: base flip + cursor tilt
  // When flipped, the inner element is rotated 180°, so the cursor tilt's Y
  // direction needs to invert to feel correct from the viewer's perspective.
  const tiltX = tilt.x;
  const tiltY = flipped ? -tilt.y : tilt.y;
  const transform = `rotateY(${flipped ? 180 : 0}deg) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={containerRef}
        className="relative cursor-pointer select-none"
        style={{
          width,
          aspectRatio: aspect,
          perspective: '1400px',
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={handleMouseLeave}
        onClick={() => setFlipped((v) => !v)}
        role="button"
        aria-label={`Card front and back — currently showing ${flipped ? 'back' : 'front'}. Click to flip.`}
      >
        <div
          className="absolute inset-0"
          style={{
            transformStyle: 'preserve-3d',
            transform,
            transition: isHovering
              ? 'transform 0.12s ease-out'
              : 'transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)',
            willChange: 'transform',
            boxShadow: '0 30px 60px -20px rgba(0,0,0,0.5), 0 18px 36px -18px rgba(0,0,0,0.35)',
            borderRadius: '4px',
          }}
        >
          {/* Front face */}
          <CardFace>
            <FitToWidth>{front}</FitToWidth>
          </CardFace>

          {/* Back face — rotated 180° around Y, so its content shows mirrored
              when the parent rotates. */}
          <CardFace flipped>
            <FitToWidth>{back}</FitToWidth>
          </CardFace>
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setFlipped((v) => !v);
        }}
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
      >
        <RotateCw className="h-3.5 w-3.5" />
        Show {flipped ? 'front' : 'back'}
      </button>
    </div>
  );
}

function CardFace({ children, flipped }: { children: ReactNode; flipped?: boolean }) {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transform: flipped ? 'rotateY(180deg)' : undefined,
        borderRadius: '4px',
        backgroundColor: '#fff',
      }}
    >
      {children}
    </div>
  );
}

/**
 * Scales whatever's inside to fit the parent's width. The card templates are
 * authored at 85mm physical size (~321px at 96dpi), and we want them to fill
 * the configured viewer width — so we measure the child width on mount and
 * compute a transform scale.
 */
function FitToWidth({ children }: { children: ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function recompute() {
      const wrap = wrapperRef.current;
      const content = contentRef.current;
      if (!wrap || !content) return;
      const wrapWidth = wrap.clientWidth;
      // The card root sets explicit mm-based width — read it from its layout.
      const naturalWidth = content.firstElementChild
        ? (content.firstElementChild as HTMLElement).offsetWidth
        : content.offsetWidth;
      if (naturalWidth > 0) setScale(wrapWidth / naturalWidth);
    }
    recompute();
    const ro = new ResizeObserver(recompute);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, [children]);

  return (
    <div
      ref={wrapperRef}
      className="w-full h-full flex items-center justify-center"
      style={{ overflow: 'hidden' }}
    >
      <div
        ref={contentRef}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        {children}
      </div>
    </div>
  );
}
