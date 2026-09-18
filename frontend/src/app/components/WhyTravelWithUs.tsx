// frontend/src/app/components/WhyTravelWithUs.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Landmark,
  BadgePercent,
  Route,
  ShieldCheck,
  BadgeCheck,
  Sparkles,
} from 'lucide-react';

type Props = {
  className?: string;
};

const items = [
  {
    title: 'Local base operator',
    icon: Landmark,
    desc:
      'Local experts who know the Himalaya inside-out — better routes, smoother logistics, real cultural insight.',
  },
  {
    title: 'Best price guarantee',
    icon: BadgePercent,
    desc:
      'Transparent pricing with maximum value. We optimize your plan so your money goes into the experience.',
  },
  {
    title: 'Customized itineraries',
    icon: Route,
    desc:
      'Your time, your pace, your style. We tailor routes, stays, and add-ons to match your adventure level.',
  },
];

export default function WhyTravelWithUs({ className = '' }: Props) {
  return (
    <section
      className={[
        // ✅ matches your site background (bg-emerald-50) and keeps a nice separation
        'relative overflow-hidden bg-emerald-50 border-y border-emerald-100',
        className,
      ].join(' ')}
    >
      {/* soft background accents (emerald theme) */}
      <div className="pointer-events-none absolute -top-28 -left-28 h-80 w-80 rounded-full bg-emerald-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-28 h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl" />
      <div className="pointer-events-none absolute top-10 right-10 h-44 w-44 rounded-full bg-white/60 blur-2xl" />

      <div className="mx-auto max-w-7xl px-6 md:px-10 py-12 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-white border border-emerald-100 px-4 py-2 text-xs font-semibold text-emerald-800 shadow-sm">
            <Sparkles className="w-4 h-4 text-emerald-700" />
            WHY TRAVEL WITH US
          </div>

          <h2 className="mt-4 text-2xl md:text-4xl font-extrabold tracking-tight text-slate-900">
            Feel confident. Travel deeper.{' '}
            <span className="text-emerald-700">Enjoy every step.</span>
          </h2>

          <p className="mt-3 text-sm md:text-base text-slate-600 max-w-2xl mx-auto">
            Built for trekkers who want a smooth trip, a fair price, and a plan that actually fits their time and energy.
          </p>
        </motion.div>

        {/* 3 columns */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-10">
          {items.map((it, idx) => {
            const Icon = it.icon;
            return (
              <motion.div
                key={it.title}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: idx * 0.06 }}
                className="rounded-2xl bg-transparent text-center"
              >
                <div className="mx-auto h-28 w-28 rounded-full bg-white shadow-[0_18px_40px_rgba(2,6,23,0.10)] ring-1 ring-emerald-100 flex items-center justify-center">
                  <Icon className="w-11 h-11 text-emerald-800" />
                </div>

                <h3 className="mt-5 text-[13px] font-extrabold tracking-[0.12em] text-slate-800 uppercase">
                  {it.title}
                </h3>

                <p className="mt-4 text-sm text-slate-600 leading-relaxed max-w-xs mx-auto">
                  {it.desc}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Trust row */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-white border border-emerald-100 p-6 shadow-sm">
            <div className="text-lg font-semibold text-slate-900">Associated & Certified</div>
            <div className="mt-2 h-[3px] w-28 bg-emerald-700 rounded-full" />

            <div className="mt-4 flex flex-wrap gap-2">
              {['Licensed Guides', 'Local Partners', 'Safety First', 'Sustainable Travel'].map((x) => (
                <span
                  key={x}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-sm text-slate-700"
                >
                  <BadgeCheck className="w-4 h-4 text-emerald-700" />
                  {x}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-emerald-100 p-6 shadow-sm">
            <div className="text-lg font-semibold text-slate-900">Recommended & Verified</div>
            <div className="mt-2 h-[3px] w-28 bg-slate-900 rounded-full" />

            <div className="mt-4 flex flex-wrap gap-2">
              {['Verified Reviews', 'Real Photos', 'Transparent Pricing', 'Fast Support'].map((x) => (
                <span
                  key={x}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-sm text-slate-700"
                >
                  <ShieldCheck className="w-4 h-4 text-slate-900" />
                  {x}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* CTA (only Explore treks) */}
        <div className="mt-12 flex items-center justify-center">
          <Link
            href="/destination"
            className="h-11 px-7 rounded-full bg-emerald-700 text-white font-semibold inline-flex items-center justify-center hover:bg-emerald-800 shadow-sm hover:shadow-md transition"
          >
            Explore treks
          </Link>
        </div>
      </div>
    </section>
  );
}
