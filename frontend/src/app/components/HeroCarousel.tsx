'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

type Slide = { src: string; alt?: string };

interface HeroCarouselProps {
  slides: Slide[];
  /** How long each image stays before switching (ms). Default: 3000 */
  intervalMs?: number;
  /** Cross-fade duration (ms). Default: 2000 */
  transitionMs?: number;
  /** If true, uses a compact height for embedding in split layouts (≈40% view height). */
  compact?: boolean;
  /** Show arrows on desktop */
  showArrows?: boolean;
  /** Show pagination dots */
  showDots?: boolean;
  /** Dark gradient overlay for text readability */
  gradient?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export default function HeroCarousel({
  slides,
  intervalMs = 3000,
  transitionMs = 2000,
  compact = true,           // <-- compact by default for 40% hero use
  showArrows = true,
  showDots = true,
  gradient = true,
  className = '',
  children,
}: HeroCarouselProps) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Respect OS reduced motion
  const reduced = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (reduced || paused || slides.length <= 1) return;
    const id = setInterval(() => setIdx(i => (i + 1) % slides.length), intervalMs);
    return () => clearInterval(id);
  }, [reduced, paused, slides.length, intervalMs]);

  const go = (d: number) => setIdx(i => (i + d + slides.length) % slides.length);

  return (
    <section
      className={[
        'relative w-full overflow-hidden rounded-2xl shadow-lg',
        compact ? 'h-[40vh] lg:h-[60vh]' : 'min-h-[70vh] md:min-h-[90vh]',
        className,
      ].join(' ')}
      ref={ref}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Hero carousel"
      aria-live="polite"
    >
      {/* Slides */}
      {slides.map((s, i) => (
        <motion.div
          key={s.src}
          initial={{ opacity: 0 }}
          animate={{ opacity: i === idx ? 1 : 0 }}
          transition={{ duration: transitionMs / 1000, ease: 'easeInOut' }}
          className="absolute inset-0"
          aria-hidden={i !== idx}
        >
          <Image
            src={s.src}
            alt={s.alt ?? `Slide ${i + 1}`}
            fill
            priority={i === 0}
            sizes="100vw"
            className="object-cover"
          />
          {gradient && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/25 to-transparent" />
          )}
        </motion.div>
      ))}

      {/* Overlay content (centered) */}
      {children && (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-center px-6 pointer-events-none">
          <div className="pointer-events-auto w-full">{children}</div>
        </div>
      )}

      {/* Arrows - desktop */}
      {showArrows && slides.length > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            aria-label="Previous slide"
            className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/80 backdrop-blur shadow hover:bg-white transition"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => go(1)}
            aria-label="Next slide"
            className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/80 backdrop-blur shadow hover:bg-white transition"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Dots */}
      {showDots && slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setIdx(i)}
              className={`h-2.5 w-2.5 rounded-full transition ${i === idx ? 'bg-white' : 'bg-white/50 hover:bg-white/80'}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
