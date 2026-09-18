// frontend/src/app/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import SearchBar from './components/SearchBar';
import Destinations from './components/Destinations';
import NextImage from 'next/image';
import Directory from './components/Directory';
import Footer from './components/Footer';
import WhyTravelWithUs from './components/WhyTravelWithUs';

// import SocialGallery from './components/SocialGallery';

const MAX_HERO = 20;

function preload(src: string) {
  return new Promise<string>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(src);
    img.onerror = reject;
    img.src = src;
  });
}

const HomePage: React.FC = () => {
  const [images, setImages] = useState<string[]>([]);
  const [current, setCurrent] = useState(0);
  const [userName, setUserName] = useState<string | null>(null);

  // preload hero images
  useEffect(() => {
    const candidates = Array.from({ length: MAX_HERO }, (_, i) => `/image/hero-${i + 1}.jpg`);
    Promise.allSettled(candidates.map(preload)).then((results) => {
      const ok = results
        .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
        .map((r) => r.value);
      setImages(ok.length ? ok : ['/image/hero-1.jpg']);
    });
  }, []);

  // rotate slideshow
  useEffect(() => {
    if (images.length === 0) return;
    const id = setInterval(() => setCurrent((p) => (p + 1) % images.length), 5000);
    return () => clearInterval(id);
  }, [images]);

  // Load name from localStorage (set by login page)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setUserName(localStorage.getItem('user_name'));
  }, []);

  const dayGreeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  return (
    // no top padding — NavBar is fixed and overlays hero
    <main className="min-h-screen font-sans text-green-900 bg-emerald-50">
      {/* HERO */}
      <section className="relative h-[56vh] min-h-[420px] md:h-[50vh] lg:h-[44vh]">
        {images.length > 0 &&
          images.map((img, i) => (
            <div
              key={img}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                i === current ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <NextImage
                src={img}
                alt=""
                priority={i === 0}
                fill
                sizes="100vw"
                className="object-cover"
                style={{ objectPosition: 'center 28%' }}
              />
              <div className="absolute inset-0 bg-black/30" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          ))}

        {/* Greeting text */}
        <div className="relative z-10 h-full mx-auto max-w-7xl px-6 md:px-10 flex items-center justify-center text-center text-white pt-24 md:pt-28">
          <h1 className="font-[var(--font-merienda)] text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
            {dayGreeting}
            {userName ? `, ${userName}` : ''}
          </h1>
        </div>

        {/* Search bar overlapping the bottom edge */}
        <div className="absolute z-20 left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2 w-full max-w-3xl px-4 sm:px-6">
          <SearchBar />
        </div>
      </section>

      {/* MAIN CONTENT */}
      <section className="mt-16">
        
        <Destinations />
         {/* ✅ WHY TRAVEL WITH US section goes between Explore Nepal and Footer */}
      <WhyTravelWithUs className="mt-10 md:mt-14" />
        <Directory compactTop className="mt-4 md:mt-6" />
      </section>

     

      {/* <section>
        <SocialGallery />
      </section> */}

      <section>
        <Footer />
      </section>
    </main>
  );
};

export default HomePage;
