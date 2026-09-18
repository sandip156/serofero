// // frontend/src/app/components/Destinations.tsx
// 'use client';

// import React, { useEffect, useMemo, useState } from 'react';
// import Link from 'next/link';
// import { useRouter } from 'next/navigation';
// import { Clock, Bookmark, BookOpen, Star } from 'lucide-react';
// import { motion } from 'framer-motion';
// import { useSaved } from '@/app/hooks/useSaved';
// import {
//   API_BASE,
//   getTreks,
//   getTrekBySlug,
//   slugify,
//   toAbsImage,
//   type Trek as ApiTrek,
// } from '@/data/treks';

// type Trek = ApiTrek & {
//   priceNpr?: number;
//   price?: number;
//   cost?: number;
// };

// type RatingSummary = Record<string, { avgRating: number; reviewCount: number }>;

// function parseDays(duration: string) {
//   const m = String(duration).match(/(\d+)/);
//   return m ? Number(m[1]) : 1;
// }

// function getPriceNpr(trek: Trek) {
//   const direct =
//     (typeof trek.priceNPR === 'number' && trek.priceNPR) ||
//     (typeof (trek as any).priceNpr === 'number' && (trek as any).priceNpr) ||
//     (typeof (trek as any).price === 'number' && (trek as any).price) ||
//     (typeof (trek as any).cost === 'number' && (trek as any).cost) ||
//     null;

//   if (direct) return direct;

//   const days = parseDays(trek.duration);
//   const dist = Number(trek.distanceKm || 0);
//   const diff =
//     trek.difficulty === 'Easy' ? 1 : trek.difficulty === 'Moderate' ? 1.25 : 1.55;

//   return Math.round(((6500 + days * 2500 + dist * 25) * diff) / 100) * 100;
// }

// function formatNpr(n: number) {
//   return `NPR ${n.toLocaleString('en-US')}`;
// }

// function authHeader(token: string) {
//   const t = token.trim();
//   if (!t) return '';
//   return t.startsWith('Bearer ') ? t : `Bearer ${t}`;
// }

// function trekSlugOf(t: Trek) {
//   return (t.slug || slugify(t.name)).toLowerCase();
// }

// /* ---------- Rating pill (same as destination/page.tsx) ---------- */
// function RatingPill({ avg, count }: { avg: number; count: number }) {
//   if (!count) {
//     return (
//       <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-[11px] text-slate-700">
//         <Star className="w-3.5 h-3.5 text-slate-400" />
//         New
//       </span>
//     );
//   }

//   const shown = Math.round(avg * 10) / 10;

//   return (
//     <span className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2 py-0.5 text-[11px] text-slate-800">
//       <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
//       {shown.toFixed(1)}
//       <span className="text-slate-500">({count})</span>
//     </span>
//   );
// }

// function TrekCard({
//   trek,
//   isSaved,
//   onToggleSave,
//   ratingAvg,
//   ratingCount,
// }: {
//   trek: Trek;
//   isSaved: boolean;
//   onToggleSave: (id: number) => void;
//   ratingAvg: number;
//   ratingCount: number;
// }) {
//   const router = useRouter();
//   const trekSlug = trek.slug || slugify(trek.name);
//   const bookHref = `/book/${trekSlug}`;
//   const price = getPriceNpr(trek);

//   const canSave = typeof trek.id === 'number';

//   return (
//     <motion.article
//       initial={{ opacity: 0, y: 12 }}
//       whileInView={{ opacity: 1, y: 0 }}
//       viewport={{ once: true }}
//       transition={{ duration: 0.35 }}
//       className="snap-start flex-none w-64 rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition"
//     >
//       <div className="relative">
//         {/* eslint-disable-next-line @next/next/no-img-element */}
//         <img
//           src={toAbsImage(trek.image) || '/image/placeholder.jpg'}
//           alt={trek.name}
//           className="w-full h-40 object-cover"
//           onError={(e) => {
//             (e.currentTarget as HTMLImageElement).src = '/image/placeholder.jpg';
//           }}
//         />

//         <button
//           aria-label={isSaved ? 'Remove from saved' : 'Save'}
//           onClick={(e) => {
//             e.preventDefault();
//             e.stopPropagation();
//             if (canSave) onToggleSave(trek.id);
//           }}
//           disabled={!canSave}
//           className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-2 rounded-full shadow hover:bg-white transition disabled:opacity-50"
//         >
//           <Bookmark
//             className={`w-5 h-5 ${
//               isSaved ? 'fill-emerald-600 text-emerald-600' : 'text-slate-700'
//             }`}
//           />
//         </button>

//         <div className="absolute bottom-3 left-3 rounded-full bg-white/90 backdrop-blur px-3 py-1 text-xs font-semibold text-slate-900 shadow">
//           {formatNpr(price)}
//         </div>

//         {/* ✅ same rating pill placement as destination/page.tsx */}
//         <div className="absolute bottom-3 right-3">
//           <RatingPill avg={ratingAvg} count={ratingCount} />
//         </div>
//       </div>

//       <div className="p-3">
//         <h3 className="text-[15px] font-semibold text-slate-900 line-clamp-2">
//           {trek.name}
//         </h3>
//         <p className="text-[12px] text-slate-600 mt-0.5">{trek.location}</p>

//         <div className="mt-2 text-[12px] text-slate-700 flex flex-wrap items-center gap-3">
//           <span className="inline-flex items-center gap-1">
//             <Clock className="w-4 h-4" /> {trek.duration}
//           </span>
//           <span className="text-[12px] text-slate-600">{trek.distanceKm} km</span>
//         </div>

//         <div className="mt-2 flex items-center justify-between">
//           <span
//             className={`text-[11px] px-2 py-0.5 rounded-full ${
//               trek.difficulty === 'Easy'
//                 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
//                 : trek.difficulty === 'Moderate'
//                 ? 'bg-amber-50 text-amber-700 border border-amber-200'
//                 : 'bg-rose-50 text-rose-700 border border-rose-200'
//             }`}
//           >
//             {trek.difficulty}
//           </span>

//           <motion.button
//             type="button"
//             aria-label="Book this trek"
//             title="Book this trek"
//             whileHover={{ scale: 1.12, rotate: -8 }}
//             whileTap={{ scale: 0.92 }}
//             onClick={(e) => {
//               e.preventDefault();
//               e.stopPropagation();
//               router.push(bookHref);
//             }}
//             className="group inline-flex items-center justify-center h-7 w-7 rounded-full bg-white border border-slate-200 shadow-sm hover:bg-emerald-50 hover:border-emerald-200 hover:shadow focus:outline-none focus:ring-2 focus:ring-emerald-500"
//           >
//             <BookOpen className="w-4 h-4 text-slate-700 group-hover:text-emerald-700" />
//           </motion.button>
//         </div>
//       </div>
//     </motion.article>
//   );
// }

// function Row<T>({
//   title,
//   items,
//   renderItem,
// }: {
//   title: React.ReactNode;
//   items: T[];
//   renderItem: (item: T) => React.ReactNode;
// }) {
//   return (
//     <section className="w-full">
//       <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 mb-4">
//         <h2 className="text-2xl md:text-3xl font-bold text-slate-900">{title}</h2>
//       </div>
//       <div className="relative">
//         <div className="mx-auto max-w-7xl flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory no-scrollbar px-4 sm:px-6 lg:px-10">
//           {items.map((it, i) => (
//             <div key={i}>{renderItem(it)}</div>
//           ))}
//         </div>
//       </div>
//     </section>
//   );
// }

// export default function Destinations() {
//   const { toggleTrek, isSaved } = useSaved();
//   const limit = 12;

//   const [top, setTop] = useState<Trek[]>([]);
//   const [items, setItems] = useState<Trek[]>([]);
//   const [title, setTitle] = useState<string>('Top recommendations in Nepal');
//   const [loading, setLoading] = useState<boolean>(true);

//   // ✅ rating summary (same idea as destination/page.tsx)
//   const [ratings, setRatings] = useState<RatingSummary>({});

//   // ✅ load TOP list from backend
//   useEffect(() => {
//     let cancelled = false;

//     (async () => {
//       try {
//         setLoading(true);
//         const list = (await getTreks({ category: 'top', limit })) as Trek[];
//         if (cancelled) return;

//         setTop(list);
//         setItems(list);
//         setTitle('Top recommendations in Nepal');
//       } catch {
//         if (!cancelled) {
//           setTop([]);
//           setItems([]);
//           setTitle('Top recommendations in Nepal');
//         }
//       } finally {
//         if (!cancelled) setLoading(false);
//       }
//     })();

//     return () => {
//       cancelled = true;
//     };
//   }, [limit]);

//   // ✅ collaborative filtering recs (if logged in)
//   useEffect(() => {
//     let cancelled = false;

//     async function loadRecs() {
//       if (typeof window === 'undefined') return;

//       const token = localStorage.getItem('auth_token') || '';
//       if (!token) {
//         if (!cancelled) {
//           setItems(top);
//           setTitle('Top recommendations in Nepal');
//         }
//         return;
//       }

//       try {
//         const res = await fetch(`${API_BASE}/recommendations?limit=${limit}`, {
//           headers: { authorization: authHeader(token) },
//           cache: 'no-store',
//         });
//         const data = await res.json();

//         if (!data?.success || !Array.isArray(data?.slugs)) {
//           if (!cancelled) {
//             setItems(top);
//             setTitle('Top recommendations in Nepal');
//           }
//           return;
//         }

//         const slugs = (data.slugs as string[])
//           .map((s) => String(s || '').toLowerCase().trim())
//           .filter(Boolean);

//         const recs = await Promise.all(slugs.map((s) => getTrekBySlug(s)));
//         const recTreks = recs.filter(Boolean) as Trek[];

//         if (!cancelled) {
//           if (recTreks.length > 0) {
//             setItems(recTreks.slice(0, limit));
//             setTitle('Recommended for you');
//           } else {
//             setItems(top);
//             setTitle('Top recommendations in Nepal');
//           }
//         }
//       } catch {
//         if (!cancelled) {
//           setItems(top);
//           setTitle('Top recommendations in Nepal');
//         }
//       }
//     }

//     loadRecs();
//     return () => {
//       cancelled = true;
//     };
//   }, [top, limit]);

//   const viewItems = useMemo(() => items.slice(0, limit), [items, limit]);

//   // ✅ fetch rating summary for visible cards (one request)
//   useEffect(() => {
//     let alive = true;

//     (async () => {
//       try {
//         if (!viewItems.length) {
//           if (alive) setRatings({});
//           return;
//         }

//         const slugs = Array.from(new Set(viewItems.map(trekSlugOf))).filter(Boolean);
//         if (!slugs.length) return;

//         const url = `${API_BASE}/reviews/summary?slugs=${encodeURIComponent(slugs.join(','))}`;
//         const res = await fetch(url, { cache: 'no-store' });
//         const data = await res.json();

//         if (!alive) return;
//         if (data?.success && data.summary) setRatings(data.summary as RatingSummary);
//         else setRatings({});
//       } catch {
//         // ignore rating failure
//       }
//     })();

//     return () => {
//       alive = false;
//     };
//   }, [viewItems]);

//   return (
//     <Row<Trek>
//       title={
//         <span className="inline-flex items-center gap-2">
//           {title}
//           {loading && <span className="text-sm font-medium text-slate-500">Loading…</span>}
//         </span>
//       }
//       items={viewItems}
//       renderItem={(trek) => {
//         const s = trekSlugOf(trek);
//         const meta = ratings[s] || { avgRating: 0, reviewCount: 0 };

//         return (
//           <Link
//             key={trek._id || String(trek.id)}
//             href={`/trails/${trek.slug || slugify(trek.name)}`}
//             className="block focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-2xl"
//           >
//             <TrekCard
//               trek={trek}
//               isSaved={isSaved(trek.id)}
//               onToggleSave={toggleTrek}
//               ratingAvg={meta.avgRating}
//               ratingCount={meta.reviewCount}
//             />
//           </Link>
//         );
//       }}
//     />
//   );
// }

// frontend/src/app/components/Destinations.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, Bookmark, BookOpen, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSaved } from '@/app/hooks/useSaved';
import {
  API_BASE,
  getTrekBySlug,
  slugify,
  toAbsImage,
  type Trek as ApiTrek,
} from '@/data/treks';

type Trek = ApiTrek & {
  priceNpr?: number;
  price?: number;
  cost?: number;
};

type RatingSummary = Record<string, { avgRating: number; reviewCount: number }>;

function parseDays(duration: string) {
  const m = String(duration).match(/(\d+)/);
  return m ? Number(m[1]) : 1;
}

function getPriceNpr(trek: Trek) {
  const direct =
    (typeof (trek as any).priceNPR === 'number' && (trek as any).priceNPR) ||
    (typeof (trek as any).priceNpr === 'number' && (trek as any).priceNpr) ||
    (typeof (trek as any).price === 'number' && (trek as any).price) ||
    (typeof (trek as any).cost === 'number' && (trek as any).cost) ||
    null;

  if (direct) return direct;

  const days = parseDays(trek.duration);
  const dist = Number(trek.distanceKm || 0);
  const diff =
    trek.difficulty === 'Easy' ? 1 : trek.difficulty === 'Moderate' ? 1.25 : 1.55;

  return Math.round(((6500 + days * 2500 + dist * 25) * diff) / 100) * 100;
}

function formatNpr(n: number) {
  return `NPR ${n.toLocaleString('en-US')}`;
}

function authHeader(token: string) {
  const t = token.trim();
  if (!t) return '';
  return t.startsWith('Bearer ') ? t : `Bearer ${t}`;
}

function trekSlugOf(t: Trek) {
  return (t.slug || slugify(t.name)).toLowerCase();
}

/* ---------- Rating pill ---------- */
function RatingPill({ avg, count }: { avg: number; count: number }) {
  if (!count) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-[11px] text-slate-700">
        <Star className="w-3.5 h-3.5 text-slate-400" />
        New
      </span>
    );
  }

  const shown = Math.round(avg * 10) / 10;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2 py-0.5 text-[11px] text-slate-800">
      <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
      {shown.toFixed(1)}
      <span className="text-slate-500">({count})</span>
    </span>
  );
}

function TrekCard({
  trek,
  isSaved,
  onToggleSave,
  ratingAvg,
  ratingCount,
}: {
  trek: Trek;
  isSaved: boolean;
  onToggleSave: (id: number) => void;
  ratingAvg: number;
  ratingCount: number;
}) {
  const router = useRouter();
  const trekSlug = trek.slug || slugify(trek.name);
  const bookHref = `/book/${trekSlug}`;
  const price = getPriceNpr(trek);

  const canSave = typeof trek.id === 'number';

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35 }}
      className="snap-start flex-none w-64 rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition"
    >
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={toAbsImage(trek.image) || '/image/placeholder.jpg'}
          alt={trek.name}
          className="w-full h-40 object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/image/placeholder.jpg';
          }}
        />

        <button
          aria-label={isSaved ? 'Remove from saved' : 'Save'}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (canSave) onToggleSave(trek.id);
          }}
          disabled={!canSave}
          className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-2 rounded-full shadow hover:bg-white transition disabled:opacity-50"
        >
          <Bookmark
            className={`w-5 h-5 ${
              isSaved ? 'fill-emerald-600 text-emerald-600' : 'text-slate-700'
            }`}
          />
        </button>

        <div className="absolute bottom-3 left-3 rounded-full bg-white/90 backdrop-blur px-3 py-1 text-xs font-semibold text-slate-900 shadow">
          {formatNpr(price)}
        </div>

        <div className="absolute bottom-3 right-3">
          <RatingPill avg={ratingAvg} count={ratingCount} />
        </div>
      </div>

      <div className="p-3">
        <h3 className="text-[15px] font-semibold text-slate-900 line-clamp-2">
          {trek.name}
        </h3>
        <p className="text-[12px] text-slate-600 mt-0.5">{trek.location}</p>

        <div className="mt-2 text-[12px] text-slate-700 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-4 h-4" /> {trek.duration}
          </span>
          <span className="text-[12px] text-slate-600">{trek.distanceKm} km</span>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full ${
              trek.difficulty === 'Easy'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : trek.difficulty === 'Moderate'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {trek.difficulty}
          </span>

          <motion.button
            type="button"
            aria-label="Book this trek"
            title="Book this trek"
            whileHover={{ scale: 1.12, rotate: -8 }}
            whileTap={{ scale: 0.92 }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              router.push(bookHref);
            }}
            className="group inline-flex items-center justify-center h-7 w-7 rounded-full bg-white border border-slate-200 shadow-sm hover:bg-emerald-50 hover:border-emerald-200 hover:shadow focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <BookOpen className="w-4 h-4 text-slate-700 group-hover:text-emerald-700" />
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
}

function Row<T>({
  title,
  items,
  renderItem,
}: {
  title: React.ReactNode;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}) {
  return (
    <section className="w-full">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 mb-4">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900">{title}</h2>
      </div>

      <div className="relative">
        <div className="mx-auto max-w-7xl flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory no-scrollbar px-4 sm:px-6 lg:px-10">
          {items.map((it, i) => (
            <div key={i}>{renderItem(it)}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Destinations() {
  const { toggleTrek, isSaved } = useSaved();
  const limit = 12;

  const [items, setItems] = useState<Trek[]>([]);
  const [title, setTitle] = useState<string>('Recommended for you');
  const [loading, setLoading] = useState<boolean>(true);
  const [note, setNote] = useState<string | null>(null);

  const [ratings, setRatings] = useState<RatingSummary>({});

  // ✅ only collaborative filtering
  useEffect(() => {
    let cancelled = false;

    async function loadCF() {
      try {
        setLoading(true);
        setNote(null);

        if (typeof window === 'undefined') return;

        const token = localStorage.getItem('auth_token') || '';
        if (!token) {
          if (!cancelled) {
            setItems([]);
            setTitle('Recommended for you');
            setNote('Login to see your personalized recommendations.');
          }
          return;
        }

        const res = await fetch(`${API_BASE}/recommendations?limit=${limit}`, {
          headers: { authorization: authHeader(token) },
          cache: 'no-store',
        });

        // if token invalid / expired
        if (res.status === 401) {
          if (!cancelled) {
            setItems([]);
            setTitle('Recommended for you');
            setNote('Please login again to see your recommendations.');
          }
          return;
        }

        const data = await res.json();
        if (!data?.success || !Array.isArray(data?.slugs)) {
          if (!cancelled) {
            setItems([]);
            setTitle('Recommended for you');
            setNote('No recommendations right now.');
          }
          return;
        }

        const slugs = (data.slugs as string[])
          .map((s) => String(s || '').toLowerCase().trim())
          .filter(Boolean);

        const recs = await Promise.all(slugs.map((s) => getTrekBySlug(s)));
        const recTreks = recs.filter(Boolean) as Trek[];

        if (!cancelled) {
          setItems(recTreks.slice(0, limit));
          setTitle('Recommended for you');
          if (recTreks.length === 0) setNote('No recommendations right now.');
        }
      } catch {
        if (!cancelled) {
          setItems([]);
          setTitle('Recommended for you');
          setNote('Failed to load recommendations.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCF();

    // update if user logs in/out in another tab
    const onStorage = () => loadCF();
    window.addEventListener('storage', onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener('storage', onStorage);
    };
  }, [limit]);

  const viewItems = useMemo(() => items.slice(0, limit), [items, limit]);

  // ✅ rating summary for visible cards
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        if (!viewItems.length) {
          if (alive) setRatings({});
          return;
        }

        const slugs = Array.from(new Set(viewItems.map(trekSlugOf))).filter(Boolean);
        if (!slugs.length) return;

        const url = `${API_BASE}/reviews/summary?slugs=${encodeURIComponent(slugs.join(','))}`;
        const res = await fetch(url, { cache: 'no-store' });
        const data = await res.json();

        if (!alive) return;
        if (data?.success && data.summary) setRatings(data.summary as RatingSummary);
        else setRatings({});
      } catch {
        // ignore rating failure
      }
    })();

    return () => {
      alive = false;
    };
  }, [viewItems]);

  // if you want to hide the entire section when logged out, keep it like this:
  if (!loading && viewItems.length === 0 && note) {
    return (
      <section className="w-full">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 mb-4">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">{title}</h2>
          <p className="mt-2 text-sm text-slate-600">{note}</p>
        </div>
      </section>
    );
  }

  return (
    <Row<Trek>
      title={
        <span className="inline-flex items-center gap-2">
          {title}
          {loading && <span className="text-sm font-medium text-slate-500">Loading…</span>}
        </span>
      }
      items={viewItems}
      renderItem={(trek) => {
        const s = trekSlugOf(trek);
        const meta = ratings[s] || { avgRating: 0, reviewCount: 0 };

        return (
          <Link
            key={trek._id || String(trek.id)}
            href={`/trails/${trek.slug || slugify(trek.name)}`}
            className="block focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-2xl"
          >
            <TrekCard
              trek={trek}
              isSaved={isSaved(trek.id)}
              onToggleSave={toggleTrek}
              ratingAvg={meta.avgRating}
              ratingCount={meta.reviewCount}
            />
          </Link>
        );
      }}
    />
  );
}
