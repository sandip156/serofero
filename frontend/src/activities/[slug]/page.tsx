'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import NavBar from '@/app/components/NavBar';

import { TREKS, type Trek } from '@/data/treks';

import type { MapItem } from '@/app/components/ActivityMap';

import { Clock, Star, X } from 'lucide-react';
import clsx from 'clsx';
import { TREK_CENTERS, TREK_PATHS, EXTRA_SPOTS, type LatLng } from '@/data/geo';


const ActivityMap = dynamic(() => import('@/app/components/ActivityMap'), { ssr: false });

/* -------------------------- constants & helpers -------------------------- */

const ACTIVITIES = [
  'Hiking','Trekking','Panorama viewpoints','Camping',
  'Rafting','Paragliding','Canyoning','Rock climbing','Bird watching',
];

const deslug = (s: string) =>
  (s ?? '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

/** Simple URL state helpers */
function useUrlState<T extends string>(key: string, fallback: T) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const value = (sp.get(key) as T) ?? fallback;

  const setValue = (next: T | null) => {
    const params = new URLSearchParams(sp.toString());
    if (next === null) params.delete(key);
    else params.set(key, next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return [value, setValue] as const;
}

function useUrlNumber(key: string, fallback: number | null) {
  const [v, set] = useUrlState<string>(key, fallback === null ? '' : String(fallback));
  const num = v === '' ? null : Number(v);
  return [Number.isFinite(num) ? (num as number) : (fallback as number | null), (n: number | null) => set(n === null ? null : String(n))] as const;
}

/* ---------------------------- Main activity page ---------------------------- */

export default function ActivityPage({ params }: { params: { slug: string } }) {
  const activity = deslug(params.slug);

  /* URL-synced filters */
  const [q, setQ] = useUrlState<string>('q', '');
  const [minRating, setMinRating] = useUrlNumber('rating', 0);
  const [minKm, setMinKm] = useUrlNumber('minKm', null);
  const [maxKm, setMaxKm] = useUrlNumber('maxKm', null);
  const [difficulty, setDifficulty] = useUrlState<'all' | 'Easy' | 'Moderate' | 'Hard'>('diff', 'all');
  const [sortBy, setSortBy] = useUrlState<'best' | 'distance' | 'name'>('sort', 'best');

  /* augment treks with activities + optional centers for map markers */
  const trekPlaces = useMemo(() => {
    const commonActs = ['Hiking', 'Trekking', 'Panorama viewpoints', 'Camping'];
    return TREKS.map((t): Trek & { activities: string[]; center?: LatLng } => ({
      ...t,
      activities: commonActs,
      center: TREK_CENTERS[t.id],
    }));
  }, []);

  const extraPlaces = useMemo(() => EXTRA_SPOTS, []);

  // Merge & filter by chosen activity
  type AnyItem = (Trek & { activities?: string[]; center?: LatLng }) | (typeof EXTRA_SPOTS)[number];
  const all = useMemo<AnyItem[]>(() => [...trekPlaces, ...extraPlaces], [trekPlaces, extraPlaces]);

  const items = useMemo(() => {
    const a = activity.toLowerCase();
    const withinActivity = all.filter(p => {
      if ('activity' in p) return p.activity.toLowerCase() === a;
      return p.activities?.some(x => x.toLowerCase() === a);
    }) as Array<Trek & { center?: LatLng }>;

    // Apply filters
    let filtered = withinActivity.filter(i => {
      const passQ = q ? (i.name.toLowerCase().includes(q.toLowerCase()) || i.location.toLowerCase().includes(q.toLowerCase())) : true;
      const passRating = (i.rating ?? 0) >= (minRating ?? 0);
      const passDiff = difficulty === 'all' ? true : i.difficulty === difficulty;
      const passMinKm = minKm == null ? true : (i.distanceKm ?? 0) >= minKm;
      const passMaxKm = maxKm == null ? true : (i.distanceKm ?? 0) <= maxKm;
      return passQ && passRating && passDiff && passMinKm && passMaxKm;
    });

    // Sort
    filtered = filtered.sort((a, b) => {
      if (sortBy === 'best') return (b.rating ?? 0) - (a.rating ?? 0);
      if (sortBy === 'distance') return (a.distanceKm ?? 0) - (b.distanceKm ?? 0);
      return a.name.localeCompare(b.name);
    });

    return filtered;
  }, [all, activity, q, minRating, difficulty, minKm, maxKm, sortBy]);

  // selection → highlight on map and list
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined);
  useEffect(() => {
    setSelectedId(items[0]?.id); // reset selection when results change
  }, [items]);

  // Map items (only those with a center appear on the map)
  const mapItems: MapItem[] = useMemo(
    () =>
      items.filter(i => i.center).map(i => ({
        id: i.id,
        name: i.name,
        center: i.center,
      })),
    [items]
  );

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <NavBar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 pt-24 pb-16">
        <div className="flex items-baseline gap-3">
          <h1 className="text-3xl md:text-4xl font-bold">Best {activity} places in Nepal</h1>
          <Link href="/explore" className="text-emerald-700 underline text-sm md:text-base">← Back to Explore</Link>
        </div>

        {/* layout: sidebar + map */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5">
          {/* ------------------------- left sidebar ------------------------- */}
          <aside className="space-y-4 lg:sticky lg:top-24 self-start">
            {/* search + clear */}
            <div className="rounded-xl border border-slate-200 p-3 bg-white">
              <div className="flex gap-2">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by name or location"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {q && (
                  <button
                    aria-label="Clear"
                    className="rounded-lg border px-2"
                    onClick={() => setQ('')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* filters */}
            <div className="rounded-xl border border-slate-200 p-3 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm">Filters</div>
                <button
                  className="text-xs text-emerald-700 underline"
                  onClick={() => {
                    setQ('');
                    setMinRating(0);
                    setMinKm(null);
                    setMaxKm(null);
                    setDifficulty('all');
                    setSortBy('best');
                  }}
                >
                  Reset
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-600">Minimum rating</label>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.5}
                  value={minRating ?? 0}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-slate-700">≥ {(minRating ?? 0).toFixed(1)}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-600">Min km</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                    value={minKm ?? ''}
                    onChange={(e) => setMinKm(e.target.value ? Number(e.target.value) : null)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600">Max km</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                    value={maxKm ?? ''}
                    onChange={(e) => setMaxKm(e.target.value ? Number(e.target.value) : null)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-600">Difficulty</label>
                <div className="mt-1 grid grid-cols-4 gap-2">
                  {(['all','Easy','Moderate','Hard'] as const).map(opt => (
                    <button
                      key={opt}
                      onClick={() => setDifficulty(opt)}
                      className={clsx(
                        'rounded-full border px-2 py-1 text-xs',
                        difficulty === opt ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200'
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-600">Sort by</label>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                >
                  <option value="best">Best rated</option>
                  <option value="distance">Shortest distance</option>
                  <option value="name">Name (A–Z)</option>
                </select>
              </div>
            </div>

            {/* results list */}
            <div className="space-y-3">
              {items.length === 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
                  No places match your filters for <span className="font-medium">{activity}</span>.
                  Try broadening the filters or <Link href="/activities/hiking" className="underline">view Hiking</Link>.
                </div>
              )}

              {items.map((trek) => (
                <button
                  key={trek.id}
                  onClick={() => setSelectedId(trek.id)}
                  className={`w-full text-left rounded-xl border bg-white hover:shadow-md transition
                    ${selectedId === trek.id ? 'border-emerald-300 shadow-sm' : 'border-slate-200'}`}
                >
                  <div className="flex gap-3 p-3">
                    <img src={trek.image} alt={trek.name} className="w-20 h-20 object-cover rounded-lg" />
                    <div className="min-w-0">
                      <div className="font-semibold line-clamp-2">{trek.name}</div>
                      <div className="text-sm text-slate-600">{trek.location}</div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-700">
                        {'duration' in trek && trek.duration && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-4 h-4" /> {trek.duration}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          {(trek.rating ?? 0).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          {/* ---------------------------- right map ---------------------------- */}
          <section className="min-h-[50vh]">
            <ActivityMap
              items={mapItems}
              selectedId={selectedId}
              onSelect={(id) => setSelectedId(id)}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
