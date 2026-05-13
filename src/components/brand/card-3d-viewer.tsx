'use client';

import { useRef, useState, useEffect, type ReactNode } from 'react';
import { RotateCw } from 'lucide-react';

interface Card3dViewerProps {
  front: ReactNode;
  back: ReactNode;
  /** Visual width of the card on screen in pixels. Default 460. */
  width?: number;
}

// Card natural width is 85mm ≈ 321.26px at 96dpi. Templates set explicit mm
// dimensions on the article, so we use this fixed value to compute the
// fit-to-viewer scale instead of measuring at runtime.
const CARD_NATURAL_WIDTH_PX = 85 * (96 / 25.4);

/**
 * Interactive 3D card viewer.
 *
 * - Idle: card tilts toward the cursor (~±12° parallax).
 * - Click or "Flip" button: rotates 180° with a spring-y ease.
 *
 * Tilt is driven directly via refs + requestAnimationFrame instead of React
 * state — re-rendering on every mousemove was making the card feel laggy
 * and was likely why "doesn't follow the cursor" was the user-visible bug.
 * The flip state stays in React because it's a meaningful UI mode change.
 */
export function Card3dViewer({ front, back, width = 460 }: Card3dViewerProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const rafRef = useRef<number | null>(null);
  const [flipped, setFlipped] = useState(false);

  // Aspect ratio of a UK business card; height derived from width.
  const heightPx = Math.round((width * 55) / 85);
  const scale = width / CARD_NATURAL_WIDTH_PX;

  // rAF loop: smooth tilt toward the target, write directly to the DOM.
  useEffect(() => {
    function tick() {
      const t = tiltRef.current;
      // Easing toward target — exponential, frame-rate-aware enough at 60fps.
      t.x += (t.targetX - t.x) * 0.18;
      t.y += (t.targetY - t.y) * 0.18;

      const el = innerRef.current;
      if (el) {
        const flipDeg = flipped ? 180 : 0;
        // When flipped, invert Y tilt so it still feels like it follows the
        // cursor from the viewer's perspective.
        const yTilt = flipped ? -t.y : t.y;
        el.style.transform = `rotateY(${flipDeg}deg) rotateX(${t.x.toFixed(2)}deg) rotateY(${yTilt.toFixed(2)}deg)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [flipped]);

  function setTargetFromPoint(clientX: number, clientY: number) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (clientX - rect.left) / rect.width;   // 0..1
    const py = (clientY - rect.top) / rect.height;
    const maxDeg = 12;
    tiltRef.current.targetX = (0.5 - py) * 2 * maxDeg;
    tiltRef.current.targetY = (px - 0.5) * 2 * maxDeg;
  }

  function handleLeave() {
    tiltRef.current.targetX = 0;
    tiltRef.current.targetY = 0;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={containerRef}
        className="relative cursor-pointer select-none"
        style={{
          width: `${width}px`,
          height: `${heightPx}px`,
          perspective: '1600px',
        }}
        onMouseMove={(e) => setTargetFromPoint(e.clientX, e.clientY)}
        onMouseLeave={handleLeave}
        onTouchMove={(e) => {
          const touch = e.touches[0];
          if (touch) setTargetFromPoint(touch.clientX, touch.clientY);
        }}
        onTouchEnd={handleLeave}
        onClick={() => setFlipped((v) => !v)}
        role="button"
        aria-label={`Business card — currently showing ${flipped ? 'back' : 'front'}. Click to flip.`}
      >
        <div
          ref={innerRef}
          className="absolute inset-0"
          style={{
            transformStyle: 'preserve-3d',
            transition: 'transform 0.7s cubic-bezier(0.2, 0.85, 0.3, 1)',
            willChange: 'transform',
            borderRadius: '6px',
            boxShadow:
              '0 30px 60px -22px rgba(0,0,0,0.55), 0 18px 36px -18px rgba(0,0,0,0.4)',
          }}
        >
          <CardFace>
            <ScaledCard scale={scale}>{front}</ScaledCard>
          </CardFace>
          <CardFace flipped>
            <ScaledCard scale={scale}>{back}</ScaledCard>
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
        borderRadius: '6px',
        backgroundColor: '#fff',
      }}
    >
      {children}
    </div>
  );
}

/**
 * Wraps a card template (whose natural width is CARD_NATURAL_WIDTH_PX) and
 * applies a fixed transform: scale so it fills the viewer.
 */
function ScaledCard({ children, scale }: { children: ReactNode; scale: number }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
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
