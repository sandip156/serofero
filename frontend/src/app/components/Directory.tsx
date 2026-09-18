// sero/src/app/components/Directory.tsx
'use client';

import Link from 'next/link';

const toQ = (s: string) => `/destination?q=${encodeURIComponent(s)}`;

// Provinces / Regions
const TOP_REGIONS = [
  'Koshi Province','Madhesh Province','Bagmati Province','Gandaki Province',
  'Lumbini Province','Karnali Province','Sudurpashchim Province',
];

// Cities
const TOP_CITIES = [
  'Kathmandu','Pokhara','Lalitpur','Bhaktapur','Chitwan',
  'Biratnagar','Hetauda','Dharan','Ilam','Bandipur',
  'Jomsom','Namche Bazaar','Lukla','Ghandruk','Lumbini'
];

// National Parks
const TOP_PARKS = [
  'Sagarmatha National Park','Annapurna Conservation Area','Langtang National Park',
  'Shivapuri Nagarjun National Park','Chitwan National Park','Bardiya National Park',
  'Rara National Park','Shey Phoksundo National Park','Makalu Barun National Park',
  'Khaptad National Park','Parsa National Park','Banke National Park',
  'Api Nampa Conservation Area','Koshi Tappu Wildlife Reserve','Dhorpatan Hunting Reserve'
];

type Props = {
  /** When true, removes the large top spacing so it can sit flush after the previous section. */
  compactTop?: boolean;
  className?: string;
};

export default function Directory({ compactTop = false, className = '' }: Props) {
  return (
    <section
      className={[
        'mx-auto max-w-7xl px-4 sm:px-6 lg:px-10',
        compactTop ? 'pt-0 pb-10' : 'py-12',
        className,
      ].join(' ')}
    >
      <div className="rounded-3xl border border-emerald-200/70 bg-emerald-50/60 backdrop-blur-sm shadow-sm">
        {/* Title */}
        <div className={['px-6 sm:px-8', compactTop ? 'pt-3' : 'pt-8'].join(' ')}>
          <h2 className="text-3xl font-extrabold tracking-tight text-emerald-900">
            Explore Nepal
          </h2>
        </div>

        {/* Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 px-6 sm:px-8 pb-10 pt-6 text-emerald-900">
          {/* Regions / Provinces */}
          <div className="md:border-r md:border-emerald-200/60 md:pr-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-700/80 mb-3">
              Top regions (provinces)
            </h3>
            <ul className="space-y-2 text-[15px] leading-6">
              {TOP_REGIONS.map((r) => (
                <li key={r}>
                  <Link href={toQ(r)} className="text-emerald-900 hover:text-emerald-700 hover:underline underline-offset-4">
                    {r}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* National Parks */}
          <div className="md:border-r md:border-emerald-200/60 md:px-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-700/80 mb-3">
              Top national parks
            </h3>
            <ul className="space-y-2 text-[15px] leading-6">
              {TOP_PARKS.map((p) => (
                <li key={p}>
                  <Link href={toQ(p)} className="text-emerald-900 hover:text-emerald-700 hover:underline underline-offset-4">
                    {p}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Cities */}
          <div className="md:pl-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-700/80 mb-3">
              Top cities
            </h3>
            <ul className="space-y-2 text-[15px] leading-6">
              {TOP_CITIES.map((c) => (
                <li key={c}>
                  <Link href={toQ(c)} className="text-emerald-900 hover:text-emerald-700 hover:underline underline-offset-4">
                    {c}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </section>
  );
}
