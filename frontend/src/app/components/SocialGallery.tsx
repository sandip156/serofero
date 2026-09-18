'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Instagram, Facebook, Youtube, Linkedin, Twitter } from 'lucide-react';

type Post = {
  src: string;      // /public path, e.g. /social/1.jpg
  user: string;     // @handle
  href?: string;    // link out to the post
};

const POSTS: Post[] = [
  { src: '/social/1.jpg', user: '@sandip' },
  { src: '/social/2.jpg', user: '@pranjal' },
  { src: '/social/3.jpg', user: '@ocean' },
  { src: '/social/4.jpg', user: '@sajan' },
  // add more if you want…
];

export default function SocialGallery() {
  const scroller = useRef<HTMLDivElement>(null);

  const scrollByCards = (dir: 'left' | 'right') => {
    if (!scroller.current) return;
    const card = scroller.current.querySelector('[data-card]') as HTMLElement | null;
    const cardWidth = card ? card.clientWidth + 16 : 320; // include gap
    scroller.current.scrollBy({ left: (dir === 'right' ? 1 : -1) * cardWidth * 2, behavior: 'smooth' });
  };

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-12">
      <div className="flex flex-wrap items-start gap-4 sm:gap-6 mb-6">
        <div className="flex-1 min-w-[16rem]">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
            Share your next adventure
          </h2>
          <p className="mt-2 text-slate-600">
            Show us how you <span className="font-semibold">#GetOutThere</span> by tagging us <span className="font-semibold">@SeroTrek</span> for a chance to be featured!
          </p>
        </div>

        {/* Social icons */}
        <div className="ml-auto flex items-center gap-3 text-slate-600">
          <Link href="#" aria-label="Instagram" className="p-2 rounded-full hover:bg-slate-100"><Instagram className="w-5 h-5" /></Link>
          <Link href="#" aria-label="TikTok (X)" className="p-2 rounded-full hover:bg-slate-100"><Twitter className="w-5 h-5" /></Link>
          <Link href="#" aria-label="YouTube" className="p-2 rounded-full hover:bg-slate-100"><Youtube className="w-5 h-5" /></Link>
          <Link href="#" aria-label="Facebook" className="p-2 rounded-full hover:bg-slate-100"><Facebook className="w-5 h-5" /></Link>
          <Link href="#" aria-label="LinkedIn" className="p-2 rounded-full hover:bg-slate-100"><Linkedin className="w-5 h-5" /></Link>
        </div>
      </div>

      <div className="relative">
        {/* Left arrow */}
        <button
          onClick={() => scrollByCards('left')}
          className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-white shadow ring-1 ring-slate-200 hover:bg-slate-50"
          aria-label="Scroll left"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Right arrow */}
        <button
          onClick={() => scrollByCards('right')}
          className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-white shadow ring-1 ring-slate-200 hover:bg-slate-50"
          aria-label="Scroll right"
        >
          <ArrowRight className="w-5 h-5" />
        </button>

        {/* Cards scroller */}
        <div
          ref={scroller}
          className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory"
        >
          {POSTS.map((p, i) => (
            <article
              key={i}
              data-card
              className="snap-start shrink-0 w-[240px] sm:w-[260px] md:w-[300px] rounded-2xl overflow-hidden bg-slate-100 relative"
            >
              {/* Image */}
              <div className="relative aspect-square">
                <Image
                  src={p.src}
                  alt={p.user}
                  fill
                  sizes="(max-width: 768px) 260px, 300px"
                  className="object-cover"
                  priority={i < 2}
                />
                {/* vignette and username */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
                <div className="absolute left-3 bottom-3 text-white text-sm font-semibold drop-shadow">
                  {p.user}
                </div>
              </div>
              {/* Optional link overlay */}
              {p.href && <Link href={p.href} className="absolute inset-0" aria-label={`Open ${p.user}'s post`} />}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
