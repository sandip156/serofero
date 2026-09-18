// frontend/src/app/destination/page.tsx
'use client';

import React, { useMemo, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Clock,
  Bookmark,
  ChevronDown,
  MapPinned,
  BookOpen,
  X,
  Star,
} from 'lucide-react';
import { motion } from 'framer-motion';
import NavBar from '../components/NavBar';
import { slugify, API_BASE, type Trek as ApiTrek } from '@/data/treks';
import { useSaved } from '@/app/hooks/useSaved';
import 'leaflet/dist/leaflet.css';
import L, { Map as LeafletMap, LayerGroup, CircleMarker } from 'leaflet';
// import Footer from '../components/Footer';

type Trek = ApiTrek & {
  priceNpr?: number;
  price?: number;
  cost?: number;
  latitude?: number | null;
  longitude?: number | null;
};

type RatingSummary = Record<string, { avgRating: number; reviewCount: number }>;
type Mode = 'recommended' | 'latest' | 'nearby';

function parseDays(duration: string) {
  const m = String(duration).match(/(\d+)/);
  return m ? Number(m[1]) : 1;
}

function resolveImg(src: string) {
  if (!src) return '';
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  if (src.startsWith('/uploads/')) return `${API_BASE}${src}`;
  return src;
}

function getPriceNpr(trek: Trek) {
  const direct =
    (typeof (trek as any).priceNPR === 'number' &&
      (trek as any).priceNPR > 0 &&
      (trek as any).priceNPR) ||
    (typeof trek.priceNpr === 'number' && trek.priceNpr > 0 && trek.priceNpr) ||
    (typeof trek.price === 'number' && trek.price > 0 && trek.price) ||
    (typeof trek.cost === 'number' && trek.cost > 0 && trek.cost) ||
    null;

  if (direct) return direct;

  const days = parseDays(trek.duration);
  const dist = Number((trek as any).distanceKm || 0);
  const diff =
    trek.difficulty === 'Easy'
      ? 1
      : trek.difficulty === 'Moderate'
      ? 1.25
      : 1.55;

  return Math.round(((6500 + days * 2500 + dist * 25) * diff) / 100) * 100;
}

function formatNpr(n: number) {
  return `NPR ${n.toLocaleString('en-US')}`;
}

function trekSlugOf(t: Trek) {
  return (t.slug || slugify(t.name)).toLowerCase();
}

/* ---------- Activities ---------- */
const ACTIVITIES: string[] = [
  'Hiking',
  'Rafting',
  'Canyoning',
  'Rock climbing',
  'Trekking',
  'Paragliding',
  'Panorama viewpoints',
  'Bird watching',
  'Wildlife safari',
  'Photography tour',
  'Camping',
  'Cultural tour',
  'Yoga retreat',
  'Off-road driving',
  'Bungee jumping',
  'Ziplining',
  'Horse riding',
  'Fishing',
  'Ski touring (seasonal)',
  'Helicopter tour',
  'Hot air balloon',
  'Cave exploration',
];

const ACTIVITY_IMAGE: Record<string, string> = {
  Hiking: '/image/hiking.jpeg',
  Rafting: '/image/rafting.jpeg',
  Canyoning: '/image/can.jpeg',
  'Rock climbing': '/image/rock.jpeg',
  Trekking: '/image/trekking.jpeg',
  Paragliding: '/image/paragliding.jpeg',
  'Panorama viewpoints': '/image/pano.jpeg',
  'Bird watching': '/image/bird.jpeg',
  'Wildlife safari': '/image/wild.jpeg',
  'Photography tour': '/image/photography.jpeg',
  Camping: '/image/camping.jpeg',
  'Cultural tour': '/image/culture.jpeg',
  'Yoga retreat': '/image/yoga.jpeg',
  'Off-road driving': '/image/bike.jpeg',
  'Bungee jumping': '/image/bungee.jpeg',
  Ziplining: '/image/zipline.jpeg',
  'Horse riding': '/image/horse.jpeg',
  Fishing: '/image/fishing.jpeg',
  'Ski touring (seasonal)': '/image/ski.jpeg',
  'Helicopter tour': '/image/helicopter.jpeg',
  'Hot air balloon': '/image/hotair.jpeg',
  'Cave exploration': '/image/cave.jpeg',
};

const deslug = (s: string) => {
  const words = s.replace(/-/g, ' ');
  const found = ACTIVITIES.find((a) => a.toLowerCase() === words.toLowerCase());
  return found ?? words.replace(/\b\w/g, (c) => c.toUpperCase());
};

function trekHasActivity(trek: Trek, activity: string) {
  const a = activity.toLowerCase();

  if (
    ['hiking', 'trekking', 'panorama viewpoints', 'photography tour', 'camping'].includes(
      a
    )
  ) {
    return true;
  }

  if (a === 'bird watching') {
    return (
      trek.location.toLowerCase().includes('chitwan') ||
      trek.name.toLowerCase().includes('langtang')
    );
  }

  if (a === 'cultural tour') {
    return /mustang|helambu|tamang|barpak|balthali|kathmandu|bhaktapur/i.test(
      trek.name + ' ' + trek.location
    );
  }

  return false;
}

/* ---------- SafeImage ---------- */
const FALLBACK_IMG = '/image/placeholder.jpg';

function SafeImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [err, setErr] = useState(false);
  const finalSrc = err ? FALLBACK_IMG : resolveImg(src);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={finalSrc}
      alt={alt}
      className={className ?? 'absolute inset-0 w-full h-full object-cover'}
      onError={() => setErr(true)}
    />
  );
}

/* ---------- Rating pill */
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

/*Card*/
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

  const href = `/trails/${trekSlug}`;
  const bookHref = `/book/${trekSlug}`;
  const price = getPriceNpr(trek);

  const canSave = typeof trek.id === 'number';

  return (
    <Link
      href={href}
      className="block group focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-2xl"
    >
      <motion.article
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35 }}
        className="snap-start flex-none w-64 rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm group-hover:shadow-lg group-hover:-translate-y-0.5 transition"
      >
        <div className="relative w-full h-40">
          <SafeImage src={trek.image} alt={trek.name} />

          <button
            aria-label={isSaved ? 'Remove from favourites' : 'Add to favourites'}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (canSave) onToggleSave(trek.id as number);
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
            <span className="text-[12px] text-slate-600">
              {(trek as any).distanceKm} km
            </span>
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
    </Link>
  );
}

/* Activity Circle */
function ActivityCircle({ label }: { label: string }) {
  const href = `/activities/${slugify(label)}`;
  const src = ACTIVITY_IMAGE[label];

  return (
    <Link
      href={href}
      className="w-20 sm:w-24 md:w-28 flex flex-col items-center group"
    >
      <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full overflow-hidden ring-1 ring-slate-200 shadow-sm bg-gradient-to-br from-slate-100 to-slate-200 transition group-hover:shadow-md">
        {src ? (
          
          <img src={src} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600 text-[11px] sm:text-xs p-2 text-center">
            {label}
          </div>
        )}
      </div>
      <div className="mt-1 text-[11px] sm:text-xs md:text-sm font-medium text-slate-800 text-center max-w-[7.5rem]">
        {label}
      </div>
    </Link>
  );
}

/*Row*/
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
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 mb-3">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
          {title}
        </h2>
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

/*Sticky Scroll Tabs*/
function ScrollTabs({
  mode,
  onPick,
}: {
  mode: Mode;
  onPick: (m: Mode) => void;
}) {
  const tabs: { key: Mode; label: string; icon: React.ReactNode }[] = [
    { key: 'recommended', label: 'Recommended', icon: <Star className="w-4 h-4" /> },
    { key: 'latest', label: 'Latest', icon: <Clock className="w-4 h-4" /> },
    { key: 'nearby', label: 'Nearby', icon: <MapPinned className="w-4 h-4" /> },
  ];

  return (
    <div className="sticky top-16 md:top-20 z-30 bg-emerald-50/80 backdrop-blur border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-3">
        <div className="relative flex gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory">
          {tabs.map((t) => {
            const active = mode === t.key;

            return (
              <button
                key={t.key}
                type="button"
                onClick={() => onPick(t.key)}
                className="snap-start relative shrink-0 rounded-full px-4 py-2 border text-sm font-semibold overflow-hidden"
              >
                {active && (
                  <motion.span
                    layoutId="activeTabPill"
                    className="absolute inset-0 bg-emerald-700"
                    transition={{ type: 'spring', stiffness: 420, damping: 35 }}
                  />
                )}

                <span
                  className={`relative inline-flex items-center gap-2 ${
                    active ? 'text-white' : 'text-slate-700'
                  }`}
                >
                  {t.icon}
                  {t.label}
                </span>

                <span
                  className={`absolute inset-0 rounded-full border ${
                    active ? 'border-emerald-700' : 'border-slate-200'
                  }`}
                />
              </button>
            );
          })}
        </div>

        <div className="mt-1 text-[11px] text-slate-500">
          Swipe the tabs, or scroll — active tab follows your position.
        </div>
      </div>
    </div>
  );
}

/* Explore Map*/
type Coords = { lat: number; lng: number };

const COORDS_BY_NAME: Record<string, Coords> = {
  everest: { lat: 27.991, lng: 86.925 },
  annapurna: { lat: 28.53, lng: 83.879 },
  'Gokyo Lakes & Gokyo Ri': { lat: 27.955, lng: 86.692 },
  'Manaslu Circuit': { lat: 28.43, lng: 84.826 },
  'Langtang Valley': { lat: 28.209, lng: 85.562 },
  'Mardi Himal Trek': { lat: 28.494, lng: 83.949 },
  'Upper Mustang (Lo Manthang)': { lat: 29.175, lng: 83.956 },
  'Ghorepani Poon Hill': { lat: 28.394, lng: 83.7 },
  'Helambu Trek': { lat: 27.842, lng: 85.516 },
  'Khopra Danda Ridge': { lat: 28.438, lng: 83.695 },
  'Annapurna Circuit (Short)': { lat: 28.65, lng: 84.02 },
  'Tamang Heritage & Langtang': { lat: 28.182, lng: 85.559 },
  'Shivapuri Peak Trail': { lat: 27.806, lng: 85.41 },
  'Phulchowki Hill Walk': { lat: 27.58, lng: 85.405 },
  'Champadevi–Hattiban Ridge': { lat: 27.64, lng: 85.282 },
  'Kakani Viewpoint Spur': { lat: 27.834, lng: 85.296 },
  'Begnas Lakeside Spur': { lat: 28.111, lng: 84.11 },
  'Phewa Lakeshore–World Peace Pagoda': { lat: 28.213, lng: 83.959 },
  'Nagarkot Sunrise Loop': { lat: 27.717, lng: 85.521 },
  'Godavari–Pulchowk Forest Path': { lat: 27.59, lng: 85.382 },
};

/* ---------- Helpers: auth + distance ---------- */
function authHeader(token: string) {
  const t = String(token || '').trim();
  if (!t) return '';
  return t.startsWith('Bearer ') ? t : `Bearer ${t}`;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return R * c;
}

function ExploreMap({
  treks,
  toggleTrek,
  isSaved,
  ratings,
  userGeo,
}: {
  treks: Trek[];
  toggleTrek: (id: number) => void;
  isSaved: (id: number) => boolean;
  ratings: RatingSummary;
  userGeo?: { lat: number; lng: number } | null;
}) {
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);

  const [selected, setSelected] = useState<number | null>(null);
  const router = useRouter();

  // ----- filter state -----
  type LengthKey = 'any' | 'short' | 'medium' | 'long';
  type DiffKey = 'any' | 'Easy' | 'Moderate' | 'Hard';

  const [openMenu, setOpenMenu] = useState<
    null | 'distance' | 'activity' | 'difficulty' | 'length' | 'all'
  >(null);

  const [activity, setActivity] = useState<string>('any');
  const [difficulty, setDifficulty] = useState<DiffKey>('any');
  const [lengthKey, setLengthKey] = useState<LengthKey>('any');
  const [radiusKm, setRadiusKm] = useState<number | null>(null); // null = Any distance

  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(userGeo ?? null);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);

  // keep local geo synced with parent geo
  useEffect(() => {
    if (userGeo && (!geo || userGeo.lat !== geo.lat || userGeo.lng !== geo.lng)) {
      setGeo(userGeo);
      setGeoMsg(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userGeo?.lat, userGeo?.lng]);

  // close popovers on outside click + ESC
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-filter-wrap]')) return;
      setOpenMenu(null);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };

    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  async function ensureGeo() {
    if (geo) return geo;

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGeoMsg('Geolocation not supported on this device.');
      return null;
    }

    return await new Promise<{ lat: number; lng: number } | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const g = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setGeo(g);
          setGeoMsg(null);
          resolve(g);
        },
        () => {
          setGeoMsg('Location permission denied. Distance filter needs location.');
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }

  // ----- base items (only those with coords can appear on map) -----
  const baseItems = useMemo(() => {
    return treks
      .map((t) => {
        const lat = typeof t.latitude === 'number' ? t.latitude : undefined;
        const lng = typeof t.longitude === 'number' ? t.longitude : undefined;

        const fromDb =
          typeof lat === 'number' && typeof lng === 'number'
            ? ({ lat, lng } as Coords)
            : undefined;

        const fallback =
          COORDS_BY_NAME[t.name as keyof typeof COORDS_BY_NAME] as Coords | undefined;

        const c = fromDb || fallback;

        return c && typeof t.id === 'number' ? { t, c } : null;
      })
      .filter(Boolean) as { t: Trek; c: Coords }[];
  }, [treks]);

  // ----- enrich with distance (if we have geo) -----
  const enriched = useMemo(() => {
    return baseItems.map(({ t, c }) => ({
      t,
      c,
      distKm: geo ? haversineKm(geo, c) : null,
      days: parseDays(t.duration),
    }));
  }, [baseItems, geo]);

  // ----- apply filters -----
  const filtered = useMemo(() => {
    let list = [...enriched];

    // Activity
    if (activity !== 'any') {
      list = list.filter((x) => trekHasActivity(x.t, activity));
    }

    // Difficulty
    if (difficulty !== 'any') {
      list = list.filter((x) => x.t.difficulty === difficulty);
    }

    // Length (duration days)
    if (lengthKey !== 'any') {
      list = list.filter((x) => {
        const d = x.days;
        if (lengthKey === 'short') return d >= 1 && d <= 3;
        if (lengthKey === 'medium') return d >= 4 && d <= 7;
        return d >= 8; // long
      });
    }

    // Distance radius
    if (radiusKm != null) {
      list = list.filter((x) => x.distKm != null && x.distKm <= radiusKm);
    }

    // sort: if we know distance, nearest first; else keep stable-ish by name
    list.sort((a, b) => {
      if (a.distKm != null && b.distKm != null) return a.distKm - b.distKm;
      if (a.distKm != null) return -1;
      if (b.distKm != null) return 1;
      return (a.t.name || '').localeCompare(b.t.name || '');
    });

    return list;
  }, [enriched, activity, difficulty, lengthKey, radiusKm]);

  // if selected trek disappears due to filters, clear selection
  useEffect(() => {
    if (selected == null) return;
    const stillThere = filtered.some((x) => x.t.id === selected);
    if (!stillThere) setSelected(null);
  }, [filtered, selected]);

  // ----- Leaflet map init + markers -----
  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map('explore-map', { zoomControl: false, scrollWheelZoom: true }).setView(
        [27.7172, 85.324],
        7
      );
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
    }

    const layer = layerRef.current!;
    layer.clearLayers();

    filtered.forEach(({ t, c }) => {
      const id = t.id as number;

      const marker: CircleMarker = L.circleMarker([c.lat, c.lng], {
        radius: selected === id ? 9 : 6,
        color: selected === id ? '#059669' : '#1f2937',
        weight: 2,
        fillColor: selected === id ? '#10b981' : '#334155',
        fillOpacity: 0.9,
      })
        .addTo(layer)
        .on('click', () => {
          setSelected(id);
          mapRef.current?.panTo([c.lat, c.lng], { animate: true });
        });

      (marker as any).__trekId = id;
    });
  }, [filtered, selected]);

  useEffect(() => {
    return () => {
      try {
        layerRef.current?.clearLayers();
        mapRef.current?.remove();
      } catch {}
      layerRef.current = null;
      mapRef.current = null;
    };
  }, []);

  const flyTo = (id: number) => {
    const found = filtered.find((x) => x.t.id === id);
    if (!found) return;
    setSelected(id);
    mapRef.current?.panTo([found.c.lat, found.c.lng], { animate: true });
    mapRef.current?.setZoom(10);
  };

  // ----- UI helpers -----
  const distanceLabel = radiusKm == null ? 'Distance away' : `Within ${radiusKm} km`;
  const activityLabel = activity === 'any' ? 'Activity' : deslug(slugify(activity));
  const diffLabel = difficulty === 'any' ? 'Difficulty' : difficulty;
  const lenLabel =
    lengthKey === 'any'
      ? 'Length'
      : lengthKey === 'short'
      ? '1–3 days'
      : lengthKey === 'medium'
      ? '4–7 days'
      : '8+ days';

  const hasAnyFilter =
    activity !== 'any' || difficulty !== 'any' || lengthKey !== 'any' || radiusKm != null;

  const resetAll = () => {
    setActivity('any');
    setDifficulty('any');
    setLengthKey('any');
    setRadiusKm(null);
    setGeoMsg(null);
  };

  function FilterButton({
    label,
    active,
    onClick,
  }: {
    label: string;
    active?: boolean;
    onClick: () => void;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={[
          'inline-flex items-center gap-1.5 h-9 px-3 rounded-full border text-sm',
          active
            ? 'bg-emerald-700 text-white border-emerald-700'
            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
        ].join(' ')}
      >
        {label} <ChevronDown className="w-4 h-4" />
      </button>
    );
  }

  function Popover({ show, children }: { show: boolean; children: React.ReactNode }) {
    if (!show) return null;
    return (
      <div className="absolute left-0 mt-2 w-[18rem] max-w-[85vw] rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden z-40">
        {children}
      </div>
    );
  }

  function Chip({
    onClick,
    active,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={[
          'px-3 py-1.5 rounded-full text-sm border',
          active
            ? 'bg-emerald-700 text-white border-emerald-700'
            : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50',
        ].join(' ')}
      >
        {children}
      </button>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
      {/* FILTER BAR */}
      <div data-filter-wrap className="relative">
        <div className="flex flex-wrap items-center gap-2 pb-3">
          {/* Distance */}
          <div className="relative">
            <FilterButton
              label={distanceLabel}
              active={openMenu === 'distance' || radiusKm != null}
              onClick={() => setOpenMenu((p) => (p === 'distance' ? null : 'distance'))}
            />
            <Popover show={openMenu === 'distance'}>
              <div className="p-3 space-y-3">
                <div className="text-sm font-semibold text-slate-900">Distance away</div>
                <div className="flex flex-wrap gap-2">
                  <Chip
                    active={radiusKm == null}
                    onClick={() => {
                      setRadiusKm(null);
                      setOpenMenu(null);
                    }}
                  >
                    Any
                  </Chip>

                  {[25, 50, 100, 250].map((r) => (
                    <Chip
                      key={r}
                      active={radiusKm === r}
                      onClick={async () => {
                        const g = await ensureGeo();
                        if (!g) return;
                        setRadiusKm(r);
                        setOpenMenu(null);
                      }}
                    >
                      {r} km
                    </Chip>
                  ))}
                </div>

                <div className="text-xs text-slate-600">
                  {geo ? 'Using your current location.' : 'Choose a radius to request location permission.'}
                </div>

                {geoMsg && (
                  <div className="text-xs rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2">
                    {geoMsg}
                  </div>
                )}

                {hasAnyFilter && (
                  <button
                    type="button"
                    onClick={() => resetAll()}
                    className="w-full h-10 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-semibold"
                  >
                    Reset all filters
                  </button>
                )}
              </div>
            </Popover>
          </div>

          {/* Activity */}
          <div className="relative">
            <FilterButton
              label={activityLabel}
              active={openMenu === 'activity' || activity !== 'any'}
              onClick={() => setOpenMenu((p) => (p === 'activity' ? null : 'activity'))}
            />
            <Popover show={openMenu === 'activity'}>
              <div className="p-3">
                <div className="text-sm font-semibold text-slate-900 mb-2">Activity</div>
                <div className="flex flex-wrap gap-2 mb-2">
                  <Chip
                    active={activity === 'any'}
                    onClick={() => {
                      setActivity('any');
                      setOpenMenu(null);
                    }}
                  >
                    Any
                  </Chip>
                </div>

                <div className="max-h-56 overflow-y-auto pr-1">
                  <div className="flex flex-wrap gap-2">
                    {ACTIVITIES.map((a) => (
                      <Chip
                        key={a}
                        active={activity.toLowerCase() === a.toLowerCase()}
                        onClick={() => {
                          setActivity(a);
                          setOpenMenu(null);
                        }}
                      >
                        {a}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>
            </Popover>
          </div>

          {/* Difficulty */}
          <div className="relative">
            <FilterButton
              label={diffLabel}
              active={openMenu === 'difficulty' || difficulty !== 'any'}
              onClick={() => setOpenMenu((p) => (p === 'difficulty' ? null : 'difficulty'))}
            />
            <Popover show={openMenu === 'difficulty'}>
              <div className="p-3 space-y-2">
                <div className="text-sm font-semibold text-slate-900">Difficulty</div>
                <div className="flex flex-wrap gap-2">
                  {(['any', 'Easy', 'Moderate', 'Hard'] as DiffKey[]).map((d) => (
                    <Chip
                      key={d}
                      active={difficulty === d}
                      onClick={() => {
                        setDifficulty(d);
                        setOpenMenu(null);
                      }}
                    >
                      {d === 'any' ? 'Any' : d}
                    </Chip>
                  ))}
                </div>
              </div>
            </Popover>
          </div>

          {/* Length */}
          <div className="relative">
            <FilterButton
              label={lenLabel}
              active={openMenu === 'length' || lengthKey !== 'any'}
              onClick={() => setOpenMenu((p) => (p === 'length' ? null : 'length'))}
            />
            <Popover show={openMenu === 'length'}>
              <div className="p-3 space-y-2">
                <div className="text-sm font-semibold text-slate-900">Length (days)</div>
                <div className="flex flex-wrap gap-2">
                  {(['any', 'short', 'medium', 'long'] as LengthKey[]).map((k) => (
                    <Chip
                      key={k}
                      active={lengthKey === k}
                      onClick={() => {
                        setLengthKey(k);
                        setOpenMenu(null);
                      }}
                    >
                      {k === 'any'
                        ? 'Any'
                        : k === 'short'
                        ? '1–3'
                        : k === 'medium'
                        ? '4–7'
                        : '8+'}
                    </Chip>
                  ))}
                </div>
              </div>
            </Popover>
          </div>

          {/* All filters */}
          <div className="relative">
            <FilterButton
              label="All filters"
              active={openMenu === 'all'}
              onClick={() => setOpenMenu((p) => (p === 'all' ? null : 'all'))}
            />
          </div>

          {/* indicator */}
          <div className="ml-auto text-xs text-slate-600">
            Showing <b className="text-slate-900">{filtered.length}</b> trek
            {filtered.length === 1 ? '' : 's'} on the map
          </div>
        </div>

        {/* ALL FILTERS MODAL */}
        {openMenu === 'all' && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={() => setOpenMenu(null)} />
            <div className="absolute inset-x-0 top-20 mx-auto max-w-2xl px-4">
              <div className="rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <div className="font-semibold">All filters</div>
                  <button
                    onClick={() => setOpenMenu(null)}
                    className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-slate-100"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4 space-y-5">
                  <div>
                    <div className="text-sm font-semibold mb-2">Distance away</div>
                    <div className="flex flex-wrap gap-2">
                      <Chip active={radiusKm == null} onClick={() => setRadiusKm(null)}>
                        Any
                      </Chip>
                      {[25, 50, 100, 250].map((r) => (
                        <Chip
                          key={r}
                          active={radiusKm === r}
                          onClick={async () => {
                            const g = await ensureGeo();
                            if (!g) return;
                            setRadiusKm(r);
                          }}
                        >
                          {r} km
                        </Chip>
                      ))}
                    </div>
                    {geoMsg && (
                      <div className="mt-2 text-xs rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2">
                        {geoMsg}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-sm font-semibold mb-2">Activity</div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Chip active={activity === 'any'} onClick={() => setActivity('any')}>
                        Any
                      </Chip>
                    </div>
                    <div className="max-h-44 overflow-y-auto pr-1">
                      <div className="flex flex-wrap gap-2">
                        {ACTIVITIES.map((a) => (
                          <Chip
                            key={a}
                            active={activity.toLowerCase() === a.toLowerCase()}
                            onClick={() => setActivity(a)}
                          >
                            {a}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold mb-2">Difficulty</div>
                    <div className="flex flex-wrap gap-2">
                      {(['any', 'Easy', 'Moderate', 'Hard'] as DiffKey[]).map((d) => (
                        <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>
                          {d === 'any' ? 'Any' : d}
                        </Chip>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold mb-2">Length (days)</div>
                    <div className="flex flex-wrap gap-2">
                      {(['any', 'short', 'medium', 'long'] as LengthKey[]).map((k) => (
                        <Chip key={k} active={lengthKey === k} onClick={() => setLengthKey(k)}>
                          {k === 'any'
                            ? 'Any'
                            : k === 'short'
                            ? '1–3'
                            : k === 'medium'
                            ? '4–7'
                            : '8+'}
                        </Chip>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                    <button
                      onClick={resetAll}
                      className="h-11 px-4 rounded-full border border-slate-200 hover:bg-slate-50 font-semibold"
                    >
                      Reset all
                    </button>
                    <button
                      onClick={() => setOpenMenu(null)}
                      className="h-11 px-4 rounded-full bg-emerald-700 text-white hover:bg-emerald-800 font-semibold"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MAP + LIST */}
      <div className="grid grid-cols-1 md:grid-cols-[380px_minmax(0,1fr)] gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm h-[72vh] overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
            <div className="text-sm font-medium">Explore trails</div>

            {hasAnyFilter ? (
              <button
                onClick={resetAll}
                className="text-xs px-3 py-1 rounded-full border border-slate-200 hover:bg-slate-50"
              >
                Clear filters
              </button>
            ) : (
              <div className="text-xs text-slate-500">Click a marker</div>
            )}
          </div>

          <div className="h-[calc(72vh-40px)] overflow-y-auto p-2 space-y-3">
            {filtered.map(({ t, distKm }) => {
              const trekSlug = t.slug || slugify(t.name);
              const bookHref = `/book/${trekSlug}`;
              const price = getPriceNpr(t);

              const s = trekSlugOf(t);
              const meta = ratings[s] || { avgRating: 0, reviewCount: 0 };

              const id = t.id as number;

              return (
                <article
                  key={id}
                  className={`rounded-xl overflow-hidden border ${
                    selected === id
                      ? 'border-emerald-300 ring-1 ring-emerald-300'
                      : 'border-slate-200'
                  } bg-white shadow-sm`}
                >
                  <div className="relative h-36">
                    <SafeImage src={t.image} alt={t.name} />
                    <button
                      aria-label={isSaved(id) ? 'Remove from favourites' : 'Add to favourites'}
                      onClick={() => toggleTrek(id)}
                      className="absolute top-2 right-2 bg-white/90 px-2 py-2 rounded-full shadow"
                    >
                      <Bookmark
                        className={`w-5 h-5 ${
                          isSaved(id) ? 'fill-emerald-600 text-emerald-600' : 'text-slate-700'
                        }`}
                      />
                    </button>

                    <div className="absolute bottom-2 left-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold shadow">
                      {formatNpr(price)}
                    </div>

                    <div className="absolute bottom-2 right-2">
                      <RatingPill avg={meta.avgRating} count={meta.reviewCount} />
                    </div>
                  </div>

                  <div className="p-3">
                    <Link href={`/trails/${trekSlug}`} className="font-semibold hover:underline line-clamp-2">
                      {t.name}
                    </Link>
                    <p className="text-xs text-slate-600">
                      {t.location}
                      {distKm != null && (
                        <span className="text-slate-500"> · {Math.round(distKm)} km away</span>
                      )}
                    </p>

                    <div className="mt-1 text-xs text-slate-700 flex items-center gap-3">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-4 h-4" /> {t.duration}
                      </span>
                      <span className="text-slate-600">{(t as any).distanceKm} km</span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => flyTo(id)}
                        className="inline-flex items-center gap-1.5 text-sm px-3 h-9 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                      >
                        <MapPinned className="w-4 h-4" /> Show on map
                      </button>

                      <Link
                        href={`/trails/${trekSlug}`}
                        className="text-sm h-9 px-3 rounded-full bg-slate-900 text-white hover:bg-slate-800 inline-flex items-center"
                      >
                        Details
                      </Link>

                      <motion.button
                        type="button"
                        aria-label="Book this trek"
                        title="Book this trek"
                        whileHover={{ scale: 1.08, rotate: -6 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => router.push(bookHref)}
                        className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-white border border-slate-200 shadow-sm hover:bg-emerald-50 hover:border-emerald-200 hover:shadow focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <BookOpen className="w-4 h-4 text-slate-700" />
                      </motion.button>
                    </div>
                  </div>
                </article>
              );
            })}

            {filtered.length === 0 && (
              <div className="text-sm text-slate-600 p-4">
                No results match your filters (or no treks have coordinates).
              </div>
            )}
          </div>
        </div>

        <div
          id="explore-map"
          className="h-[72vh] rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
        />
      </div>
    </section>
  );
}

/* ---------- MAIN PAGE ---------- */
export default function DestinationsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeActivity = searchParams.get('activity');
  const searchTerm = (searchParams.get('search') || searchParams.get('q') || '').trim();

  const { toggleTrek, isSaved } = useSaved();
  const limit = 12;

  const [treks, setTreks] = useState<Trek[]>([]);
  const [loadingTreks, setLoadingTreks] = useState(false);
  const [trekError, setTrekError] = useState<string | null>(null);

  const [ratings, setRatings] = useState<RatingSummary>({});

  // tabs + scroll sections
  const [mode, setMode] = useState<Mode>('recommended');
  const recRef = useRef<HTMLDivElement | null>(null);
  const latestRef = useRef<HTMLDivElement | null>(null);
  const nearRef = useRef<HTMLDivElement | null>(null);

  // auth + CF
  const [token, setToken] = useState<string>('');
  const [cfTreks, setCfTreks] = useState<Trek[]>([]);
  const [cfLoading, setCfLoading] = useState(false);
  const [cfError, setCfError] = useState<string | null>(null);

  // geo + nearby
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  // token from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const read = () => setToken(localStorage.getItem('auth_token') || '');
    read();

    const onStorage = () => read();
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const scrollToSection = (m: Mode) => {
    const el = m === 'recommended' ? recRef.current : m === 'latest' ? latestRef.current : nearRef.current;
    if (!el) return;

    const offset = window.innerWidth < 768 ? 120 : 140; // navbar + sticky tabs
    const y = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: y, behavior: 'smooth' });
  };

  // scrollspy: active tab follows scroll (only when not searching/activity)
  useEffect(() => {
    if (searchTerm || activeActivity) return;

    const sections: { key: Mode; el: HTMLElement | null }[] = [
      { key: 'recommended', el: recRef.current },
      { key: 'latest', el: latestRef.current },
      { key: 'nearby', el: nearRef.current },
    ];

    const valid = sections.filter((s) => s.el) as { key: Mode; el: HTMLElement }[];
    if (!valid.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const best = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0))[0];

        if (!best) return;
        const key = (best.target as HTMLElement).dataset.mode as Mode | undefined;
        if (key) setMode(key);
      },
      {
        root: null,
        threshold: [0.2, 0.35, 0.5, 0.65],
        rootMargin: '-15% 0px -65% 0px',
      }
    );

    valid.forEach((s) => obs.observe(s.el));
    return () => obs.disconnect();
  }, [searchTerm, activeActivity]);

  // fetch treks
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoadingTreks(true);
        setTrekError(null);

        const url = new URL(`${API_BASE}/treks`);
        if (searchTerm) url.searchParams.set('search', searchTerm);
        url.searchParams.set('limit', '200');

        const res = await fetch(url.toString(), { cache: 'no-store' });
        const data = await res.json();

        if (!data?.success) throw new Error(data?.message || 'Failed to load treks');
        if (!alive) return;

        setTreks((data.treks || []) as Trek[]);
      } catch (e: any) {
        if (!alive) return;
        setTrekError(e?.message || 'Failed to load treks');
      } finally {
        if (alive) setLoadingTreks(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [searchTerm]);

  // fetch rating summary for loaded treks (one request)
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        if (!treks.length) {
          if (alive) setRatings({});
          return;
        }

        const slugs = Array.from(new Set(treks.map(trekSlugOf))).filter(Boolean);
        if (!slugs.length) return;

        const url = `${API_BASE}/reviews/summary?slugs=${encodeURIComponent(slugs.join(','))}`;
        const res = await fetch(url, { cache: 'no-store' });
        const data = await res.json();

        if (!alive) return;
        if (data?.success && data.summary) setRatings(data.summary as RatingSummary);
      } catch {
        // ignore rating failure
      }
    })();

    return () => {
      alive = false;
    };
  }, [treks]);

  // geolocation for Nearby (used by Nearby section + passed to ExploreMap to avoid double prompt)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (searchTerm || activeActivity) return;

    if (!navigator.geolocation) {
      setGeoError('Geolocation not supported on this device.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoError(null);
      },
      () => {
        setGeo(null);
        setGeoError('Location permission denied. Showing “Near” category instead.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [searchTerm, activeActivity]);

  // collaborative filtering (ratings-based) — uses slugs
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!token || !treks.length) {
        if (alive) {
          setCfTreks([]);
          setCfLoading(false);
          setCfError(null);
        }
        return;
      }

      try {
        setCfLoading(true);
        setCfError(null);

        const res = await fetch(`${API_BASE}/recommendations?limit=${limit}`, {
          headers: { authorization: authHeader(token) },
          cache: 'no-store',
        });

        const data = await res.json();
        if (!data?.success || !Array.isArray(data?.slugs)) {
          throw new Error(data?.message || 'Failed to load recommendations');
        }

        const slugs = (data.slugs as string[])
          .map((s) => String(s || '').toLowerCase().trim())
          .filter(Boolean);

        const bySlug = new Map<string, Trek>();
        treks.forEach((t) => bySlug.set(trekSlugOf(t), t));

        const picked: Trek[] = [];
        for (const s of slugs) {
          const hit = bySlug.get(s);
          if (hit) picked.push(hit);
        }

        if (!alive) return;
        setCfTreks(picked.slice(0, limit));
      } catch (e: any) {
        if (!alive) return;
        setCfError(e?.message || 'Failed to load recommendations');
        setCfTreks([]);
      } finally {
        if (alive) setCfLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token, treks, limit]);

  const filteredTreks = useMemo(() => {
    if (!activeActivity) return [];
    return treks.filter((t) => trekHasActivity(t, activeActivity)).slice(0, limit);
  }, [activeActivity, treks]);

  const topFallback = useMemo(() => {
    return treks.filter((t) => (t as any).category === 'top').slice(0, limit);
  }, [treks]);

  const latestTreks = useMemo(() => {
    const list = treks.filter((t) => (t as any).category === 'latest');
    return (list.length ? list : treks).slice(0, limit);
  }, [treks]);

  const nearbyTreks = useMemo(() => {
    if (geo) {
      const withCoords = treks
        .map((t) => {
          const lat = typeof t.latitude === 'number' ? t.latitude : null;
          const lng = typeof t.longitude === 'number' ? t.longitude : null;
          if (lat == null || lng == null) return null;
          return { t, d: haversineKm(geo, { lat, lng }) };
        })
        .filter(Boolean) as { t: Trek; d: number }[];

      withCoords.sort((a, b) => a.d - b.d);
      return withCoords.map((x) => x.t).slice(0, limit);
    }

    const list = treks.filter((t) => (t as any).category === 'near');
    return (list.length ? list : treks).slice(0, limit);
  }, [treks, geo, limit]);

  const searchResults = useMemo(() => {
    if (!searchTerm) return [];
    return treks.slice(0, 24);
  }, [searchTerm, treks]);

  const clearSearch = () => {
    router.push('/destination');
  };

  const renderCard = (trek: Trek) => {
    const s = trekSlugOf(trek);
    const meta = ratings[s] || { avgRating: 0, reviewCount: 0 };

    return (
      <TrekCard
        trek={trek}
        isSaved={typeof trek.id === 'number' ? isSaved(trek.id) : false}
        onToggleSave={toggleTrek}
        ratingAvg={meta.avgRating}
        ratingCount={meta.reviewCount}
      />
    );
  };

  return (
    <div className="min-h-screen bg-emerald-50 text-slate-900 pt-16 md:pt-20">
      <NavBar />

      <main className="w-full max-w-none pt-2 pb-8 space-y-6">
        {/* Activities row */}
        <section className="w-full">
          <div className="mx-auto max-w-7xl flex gap-4 sm:gap-6 overflow-x-auto scroll-smooth no-scrollbar px-4 sm:px-6 lg:px-10">
            {ACTIVITIES.map((label) => (
              <ActivityCircle key={label} label={label} />
            ))}
          </div>
        </section>

        {/* Search pill */}
        {searchTerm && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <div className="rounded-2xl border border-emerald-200 bg-white p-3 flex items-center justify-between gap-3">
              <div className="text-sm text-slate-700">
                Showing results for{' '}
                <span className="font-semibold text-slate-900">“{searchTerm}”</span>
              </div>
              <button
                onClick={clearSearch}
                className="h-9 px-3 rounded-full border border-slate-200 hover:bg-slate-50 inline-flex items-center gap-2 text-sm"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            </div>
          </section>
        )}

        {trekError && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
              {trekError}
            </div>
          </section>
        )}

        {loadingTreks && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-700">
              Loading treks…
            </div>
          </section>
        )}

        {/* CONTENT MODES */}
        {searchTerm ? (
          searchResults.length > 0 ? (
            <Row<Trek> title={`Search results in Nepal`} items={searchResults} renderItem={renderCard} />
          ) : (
            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                No results for “{searchTerm}”
              </h2>
              <p className="text-slate-700">Try another city, region, or trail name.</p>
            </section>
          )
        ) : activeActivity ? (
          filteredTreks.length > 0 ? (
            <Row<Trek>
              title={`Best ${deslug(activeActivity)} places in Nepal`}
              items={filteredTreks}
              renderItem={renderCard}
            />
          ) : (
            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                {`Best ${deslug(activeActivity)} places in Nepal`}
              </h2>
              <p className="text-slate-700">
                No treks match{' '}
                <span className="font-medium text-slate-900">{deslug(activeActivity)}</span> yet.
              </p>
            </section>
          )
        ) : (
          <>
            {/* sticky, scrollable tabs */}
            <ScrollTabs
              mode={mode}
              onPick={(m) => {
                setMode(m);
                scrollToSection(m);
              }}
            />

            {/* Recommended (CF) */}
            <div ref={recRef} data-mode="recommended" className="scroll-mt-32">
              <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 pt-2">
                {token ? (
                  <div className="text-xs text-slate-500">
                    Personalized recommendations based on ratings.
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">
                    Login to get Collaborative Filtering recommendations. Showing Top recommendations for now.
                  </div>
                )}
              </section>

              {token && cfLoading && (
                <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 pt-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                    Loading personalized recommendations…
                  </div>
                </section>
              )}

              {token && cfError && (
                <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 pt-4">
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    {cfError}
                  </div>
                </section>
              )}

              <Row<Trek>
                title={token ? 'Recommended for you' : 'Top recommendations in Nepal'}
                items={token && cfTreks.length ? cfTreks : topFallback}
                renderItem={renderCard}
              />
            </div>

            {/* Latest */}
            <div ref={latestRef} data-mode="latest" className="scroll-mt-32">
              <Row<Trek> title="Latest treks in Nepal" items={latestTreks} renderItem={renderCard} />
            </div>

            {/* Nearby */}
            <div ref={nearRef} data-mode="nearby" className="scroll-mt-32">
              {geoError && (
                <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 pt-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                    {geoError}
                  </div>
                </section>
              )}

              <Row<Trek> title="Nearby treks" items={nearbyTreks} renderItem={renderCard} />
            </div>

            {/* Explore map with interactive filters */}
            <ExploreMap
              treks={treks}
              toggleTrek={toggleTrek}
              isSaved={isSaved}
              ratings={ratings}
              userGeo={geo}
            />
          </>
        )}
      </main>

      {/* <Footer /> */}
    </div>
  );
}
