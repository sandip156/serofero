'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Instagram, Facebook, Twitter, Youtube, Linkedin, Map, Globe } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="relative mt-16 text-emerald-900">
      {/* Subtle page-wide wash to blend with bg-emerald-50 pages */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 via-emerald-50 to-emerald-100" />

      {/* Inner card with border + matching bg */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-10">
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/90 shadow-[0_1px_8px_rgba(16,185,129,0.06)]">
          {/* Brand header */}
          <div className="px-6 md:px-10 pt-8 pb-6 border-b border-emerald-200/70">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="SeroTrek logo"
                width={48}
                height={48}
                className="block"
              />
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-emerald-900">
                SeroTrek
              </h2>
            </Link>
            <p className="mt-2 text-sm text-emerald-900/70">
              Discover Nepal’s best trails, peaks, and hidden gems.
            </p>
          </div>

          {/* Link columns */}
          <div className="px-6 md:px-10 py-8 grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8">
            {/* Explore */}
            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-700">
                Explore
              </h4>
              <ul className="space-y-2 text-sm text-emerald-900/90">
                <li><Link href="/countries" className="hover:text-emerald-700">Countries</Link></li>
                <li><Link href="/regions" className="hover:text-emerald-700">Regions</Link></li>
                <li><Link href="/cities" className="hover:text-emerald-700">Cities</Link></li>
                <li><Link href="/parks" className="hover:text-emerald-700">Parks</Link></li>
                <li><Link href="/trails" className="hover:text-emerald-700">Trails</Link></li>
                <li><Link href="/poi" className="hover:text-emerald-700">Points of Interest</Link></li>
                <li><Link href="/features" className="hover:text-emerald-700">Trail Features</Link></li>
              </ul>
            </div>

            {/* Custom routes & maps */}
            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-700">
                Custom routes & maps
              </h4>
              <ul className="space-y-2 text-sm text-emerald-900/90">
                <li className="flex items-center gap-2">
                  <Map className="h-4 w-4 text-emerald-700" />
                  <Link href="/builder" className="hover:text-emerald-700">Build custom route</Link>
                  <span className="ml-2 rounded bg-emerald-200 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-emerald-900">Beta</span>
                </li>
                <li><Link href="/print-maps" className="hover:text-emerald-700">Print maps</Link></li>
                <li><Link href="/route-converter" className="hover:text-emerald-700">Route converter</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-700">
                Company
              </h4>
              <ul className="space-y-2 text-sm text-emerald-900/90">
                <li><Link href="/about" className="hover:text-emerald-700">About</Link></li>
                <li><Link href="/jobs" className="hover:text-emerald-700">Jobs</Link></li>
                <li><Link href="/press" className="hover:text-emerald-700">Press</Link></li>
                <li><Link href="/ambassadors" className="hover:text-emerald-700">Ambassadors</Link></li>
                <li><Link href="/affiliates" className="hover:text-emerald-700">Affiliates</Link></li>
                <li><Link href="/influencers" className="hover:text-emerald-700">Influencers</Link></li>
              </ul>
            </div>

            {/* Community + Social */}
            <div className="flex flex-col justify-between">
              <div>
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-700">
                  Community
                </h4>
                <ul className="space-y-2 text-sm text-emerald-900/90">
                  <li><Link href="/support" className="hover:text-emerald-700">Support</Link></li>
                  <li><Link href="/gift" className="hover:text-emerald-700">Gift membership</Link></li>
                  <li><Link href="/gear" className="hover:text-emerald-700">SeroTrek Gear</Link></li>
                </ul>
              </div>

              <div className="mt-6">
                <div className="flex items-center gap-2">
                  <a aria-label="Instagram" href="#" className="rounded-full p-2 hover:bg-white/70">
                    <Instagram className="h-5 w-5 text-emerald-800" />
                  </a>
                  <a aria-label="Facebook" href="#" className="rounded-full p-2 hover:bg-white/70">
                    <Facebook className="h-5 w-5 text-emerald-800" />
                  </a>
                  <a aria-label="X" href="#" className="rounded-full p-2 hover:bg-white/70">
                    <Twitter className="h-5 w-5 text-emerald-800" />
                  </a>
                  <a aria-label="YouTube" href="#" className="rounded-full p-2 hover:bg-white/70">
                    <Youtube className="h-5 w-5 text-emerald-800" />
                  </a>
                  <a aria-label="LinkedIn" href="#" className="rounded-full p-2 hover:bg-white/70">
                    <Linkedin className="h-5 w-5 text-emerald-800" />
                  </a>
                </div>

                <label className="mt-4 inline-flex items-center gap-2 text-xs text-emerald-900/80">
                  <Globe className="h-4 w-4 text-emerald-700" />
                  <select
                    className="rounded-md border border-emerald-300 bg-white/90 px-2 py-1 text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-300"
                    defaultValue="en-US"
                  >
                    <option value="en-US">English (US)</option>
                    <option value="en-GB">English (UK)</option>
                    <option value="ne-NP">नेपाली (NP)</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          {/* Legal row */}
          <div className="px-6 md:px-10 pb-8 border-t border-emerald-200/70">
            <div className="pt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between text-xs text-emerald-900/70">
              <p>© {new Date().getFullYear()} SeroTrek, LLC — All rights reserved.</p>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <Link href="/privacy" className="hover:text-emerald-700">Privacy Policy</Link>
                <Link href="/terms" className="hover:text-emerald-700">Terms</Link>
                <Link href="/cookies" className="hover:text-emerald-700">Cookie Policy</Link>
                <Link href="/manage-cookies" className="hover:text-emerald-700">Manage Cookies</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
