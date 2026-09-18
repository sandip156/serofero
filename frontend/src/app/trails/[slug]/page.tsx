// frontend/src/app/trails/[slug]/page.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import NavBar from '@/app/components/NavBar';
import { useSaved } from '@/app/hooks/useSaved';
import {
  API_BASE,
  galleryCandidates,
  slugify,
  getTrekBySlug,
  type Trek as ApiTrek,
} from '@/data/treks';
import {
  ArrowLeft,
  Star,
  Clock,
  Mountain,
  MapPin,
  Share2,
  Bookmark,
  Map,
  X,
  ChevronLeft,
  ChevronRight,
  Images,
  BadgeIndianRupee,
  Route,
  LocateFixed,
  ShieldCheck,
  Users,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

/* ---------- helpers ---------- */
const FALLBACK_IMG = '/image/placeholder.jpg';

function toAbs(url: string) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/')) return `${API_BASE}${url}`;
  return url;
}

function parseDays(duration: string) {
  const m = String(duration).match(/(\d+)/);
  return m ? Number(m[1]) : 1;
}

function getPriceNpr(trek: any) {
  const direct =
    (typeof trek.priceNPR === 'number' && trek.priceNPR > 0 && trek.priceNPR) ||
    (typeof trek.priceNpr === 'number' && trek.priceNpr > 0 && trek.priceNpr) ||
    (typeof trek.price === 'number' && trek.price > 0 && trek.price) ||
    (typeof trek.cost === 'number' && trek.cost > 0 && trek.cost) ||
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

function difficultyBadge(d: string) {
  if (d === 'Easy') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (d === 'Moderate') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-rose-50 text-rose-700 border-rose-200';
}

/* ---------- Safe image ---------- */
function SafeImg({
  src,
  alt,
  className,
  onClick,
}: {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}) {
  const [err, setErr] = React.useState(false);
  const finalSrc = err ? FALLBACK_IMG : toAbs(src);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={finalSrc}
      alt={alt}
      onError={() => setErr(true)}
      onClick={onClick}
      className={
        className ??
        'absolute inset-0 w-full h-full object-cover cursor-pointer select-none'
      }
    />
  );
}

/* ---------- Anchor section ---------- */
function Section({ id, children }: React.PropsWithChildren<{ id: string }>) {
  return (
    <section id={id} className="scroll-mt-28">
      {children}
    </section>
  );
}

/* ---------- Reviews (Backend) ---------- */
type ApiReview = {
  _id: string;
  authorName: string;
  rating: number;
  text: string;
  photos: string[];
  createdAt: string;
};

function useTrailReviewsApi(trekSlug: string) {
  const [items, setItems] = React.useState<ApiReview[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!trekSlug) return;
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_BASE}/reviews/${encodeURIComponent(trekSlug)}`, {
        cache: 'no-store',
      });
      const data = await res.json();

      if (!data?.success) {
        setError(data?.message || 'Failed to load reviews');
        return;
      }

      setItems(data.reviews || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [trekSlug]);

  React.useEffect(() => {
    load();
  }, [load]);

  const addToList = (r: ApiReview) => setItems((prev) => [r, ...prev]);

  return { items, loading, error, reload: load, addToList };
}

function ReviewsBlock({
  trekSlug,
  trekName,
  api,
}: {
  trekSlug: string;
  trekName: string;
  api: ReturnType<typeof useTrailReviewsApi>;
}) {
  const { items, loading, error, reload, addToList } = api;

  const [rating, setRating] = React.useState(0);
  const [text, setText] = React.useState('');
  const [files, setFiles] = React.useState<File[]>([]);
  const [previews, setPreviews] = React.useState<string[]>([]);
  const [posting, setPosting] = React.useState(false);
  const [postErr, setPostErr] = React.useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  React.useEffect(() => {
    return () => {
      previews.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [previews]);

  const onFiles = (fl: FileList | null) => {
    if (!fl) return;
    const arr = Array.from(fl).slice(0, 6);
    setFiles(arr);

    setPreviews((prev) => {
      prev.forEach((u) => URL.revokeObjectURL(u));
      return arr.map((f) => URL.createObjectURL(f));
    });
  };

  const avg =
    items.length > 0
      ? (items.reduce((sum, r) => sum + (r.rating || 0), 0) / items.length).toFixed(1)
      : '—';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostErr(null);

    if (!token) {
      setPostErr('Please login to post a review.');
      return;
    }
    if (!rating || !text.trim()) {
      setPostErr('Please add rating and comment.');
      return;
    }

    try {
      setPosting(true);

      const fd = new FormData();
      fd.append('rating', String(rating));
      fd.append('text', text.trim());
      fd.append('trekName', trekName);
      files.forEach((f) => fd.append('photos', f));

      const res = await fetch(`${API_BASE}/reviews/${encodeURIComponent(trekSlug)}`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        body: fd,
      });

      const data = await res.json();
      if (!data?.success) {
        setPostErr(data?.message || 'Failed to post review');
        return;
      }

      addToList(data.review);
      setRating(0);
      setText('');
      setFiles([]);
      setPreviews((prev) => {
        prev.forEach((u) => URL.revokeObjectURL(u));
        return [];
      });
    } catch (e: any) {
      setPostErr(e?.message || 'Failed to post review');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-5xl font-semibold leading-none">{avg}</div>
        <div className="text-sm text-slate-600 mt-1">{items.length} reviews</div>

        <div className="mt-4 space-y-1.5">
          {[5, 4, 3, 2, 1].map((n) => {
            const count = items.filter((r) => r.rating === n).length;
            const pct = items.length ? Math.round((count / items.length) * 100) : 0;
            return (
              <div key={n} className="flex items-center gap-2">
                <span className="w-4 text-sm tabular-nums">{n}</span>
                <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-slate-900" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={reload}
          className="mt-4 h-10 px-4 rounded-full bg-slate-900 text-white hover:bg-slate-800"
        >
          Refresh reviews
        </button>

        {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
        {loading && <p className="mt-2 text-xs text-slate-500">Loading…</p>}
      </div>

      {/* Form + feed */}
      <div className="lg:col-span-2 space-y-4">
        <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="font-medium mb-2">Add your review</div>

          {postErr && <p className="mb-2 text-sm text-rose-600">{postErr}</p>}

          <div className="flex items-center gap-2 mb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setRating(i + 1)}
                className="p-1"
                aria-label={`Rate ${i + 1} star`}
              >
                <Star
                  className={`w-6 h-6 ${
                    i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-slate-300'
                  }`}
                />
              </button>
            ))}
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder={`Share your experience on ${trekName}…`}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          />

          <div className="mt-2 flex items-center gap-3">
            <label className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-slate-900 text-white cursor-pointer hover:bg-slate-800">
              <Images className="w-4 h-4" />
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => onFiles(e.target.files)}
                className="hidden"
              />
              Add photos
            </label>

            <button
              disabled={posting}
              className="h-10 px-4 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {posting ? 'Posting…' : 'Post review'}
            </button>
          </div>

          {previews.length > 0 && (
            <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
              {previews.map((p, idx) => (
                <div
                  key={idx}
                  className="relative w-full aspect-square overflow-hidden rounded-lg border border-slate-200"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p} alt="" className="object-cover w-full h-full" />
                </div>
              ))}
            </div>
          )}
        </form>

        {items.map((r) => (
          <Review
            key={r._id}
            author={r.authorName}
            date={new Date(r.createdAt).toLocaleDateString()}
            rating={r.rating}
            text={r.text}
            photos={(r.photos || []).map(toAbs)}
          />
        ))}

        {items.length === 0 && !loading && (
          <p className="text-sm text-slate-500">No reviews yet. Be the first!</p>
        )}
      </div>
    </div>
  );
}

/* ---------- Lightbox ---------- */
function Lightbox({
  open,
  src,
  alt,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  open: boolean;
  src: string;
  alt: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70" onClick={onClose} />
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.98 }}
            className="relative w-[92vw] max-w-5xl rounded-2xl overflow-hidden border border-white/10 bg-black"
          >
            <button
              className="absolute top-3 right-3 z-10 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {hasPrev && (
              <button
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                onClick={onPrev}
                aria-label="Previous"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {hasNext && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                onClick={onNext}
                aria-label="Next"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            <div className="relative w-full aspect-[16/9] bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={alt} className="w-full h-full object-contain" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Other treks card ---------- */
function OtherTrekCard({ trek }: { trek: any }) {
  const trekSlug = trek.slug || slugify(trek.name);
  const price = getPriceNpr(trek);

  return (
    <Link
      href={`/trails/${trekSlug}`}
      className="group rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-md transition block"
    >
      <div className="relative h-40">
        <SafeImg src={trek.image} alt={trek.name} />
        <div className="absolute bottom-2 left-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold shadow">
          {formatNpr(price)}
        </div>
      </div>

      <div className="p-3">
        <div className="font-semibold text-slate-900 line-clamp-2 group-hover:underline">
          {trek.name}
        </div>
        <div className="text-xs text-slate-600 mt-0.5">{trek.location}</div>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-700">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-4 h-4" /> {trek.duration}
          </span>
          <span className="text-slate-600">{trek.distanceKm} km</span>
        </div>

        <div className="mt-2">
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full border ${
              trek.difficulty === 'Easy'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : trek.difficulty === 'Moderate'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            {trek.difficulty}
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ---------- Page ---------- */
export default function TrailPage() {
  const params = useParams<{ slug: string | string[] }>();
  const slugFromUrl =
    typeof params?.slug === 'string'
      ? params.slug
      : Array.isArray(params?.slug)
      ? params.slug[0]
      : '';

  const { toggleTrek, isSaved, addList } = useSaved();
  const [showSave, setShowSave] = React.useState(false);
  const [newListName, setNewListName] = React.useState('');

  const [trek, setTrek] = React.useState<ApiTrek | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [lightboxIdx, setLightboxIdx] = React.useState<number | null>(null);

  // ✅ NEW: overview photo carousel
  const [heroIdx, setHeroIdx] = React.useState(0);

  // ✅ Reviews API used for user rating in header (not admin)
  const reviewsApi = useTrailReviewsApi(slugFromUrl);

  // ✅ Other treks
  const [otherTreks, setOtherTreks] = React.useState<any[]>([]);
  const [otherLoading, setOtherLoading] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!slugFromUrl) return;
      try {
        setLoading(true);
        setErr(null);
        const t = await getTrekBySlug(slugFromUrl);
        if (!alive) return;
        setTrek(t);
        setHeroIdx(0);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || 'Trail not found');
        setTrek(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slugFromUrl]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!trek) return;
      try {
        setOtherLoading(true);
        const res = await fetch(`${API_BASE}/treks?limit=24`, { cache: 'no-store' });
        const data = await res.json();
        if (!alive) return;

        if (data?.success) {
          const currentSlug = trek.slug || slugify(trek.name);
          const list = (data.treks || [])
            .filter((t: any) => (t.slug || slugify(t.name)) !== currentSlug)
            .slice(0, 6);
          setOtherTreks(list);
        } else {
          setOtherTreks([]);
        }
      } catch {
        if (!alive) return;
        setOtherTreks([]);
      } finally {
        if (alive) setOtherLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [trek]);

  const scrollTo = (targetId: string) => {
    const el = document.getElementById(targetId);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-emerald-50 text-slate-900">
        <NavBar />
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <p className="text-lg text-slate-700">Loading trail…</p>
        </div>
      </div>
    );
  }

  if (!trek || err) {
    return (
      <div className="min-h-screen bg-emerald-50">
        <NavBar />
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <p className="text-xl font-medium text-slate-900">{err || 'Trail not found'}</p>
          <Link href="/destination" className="mt-3 inline-block text-emerald-700 hover:underline">
            Back to explore
          </Link>
        </div>
      </div>
    );
  }

  const trekSlug = trek.slug || slugify(trek.name);
  const gallery = [trek.image, ...galleryCandidates(slugFromUrl)]
    .filter(Boolean)
    .map(toAbs)
    .slice(0, 12);

  const safeGallery = gallery.length ? gallery : [FALLBACK_IMG];
  const safeHero = safeGallery[Math.min(heroIdx, safeGallery.length - 1)];

  const savedOn = isSaved(trek.id);
  const price = getPriceNpr(trek as any);

  const lat = (trek as any).latitude;
  const lng = (trek as any).longitude;

  const openLightbox = (idx: number) => setLightboxIdx(idx);
  const closeLightbox = () => setLightboxIdx(null);

  const lightboxSrc =
    typeof lightboxIdx === 'number' && safeGallery[lightboxIdx] ? safeGallery[lightboxIdx] : '';

  const prevHero = () => setHeroIdx((i) => (i - 1 + safeGallery.length) % safeGallery.length);
  const nextHero = () => setHeroIdx((i) => (i + 1) % safeGallery.length);

  // ✅ USER rating from reviews
  const reviewCount = reviewsApi.items.length;
  const reviewAvg =
    reviewCount > 0
      ? reviewsApi.items.reduce((sum, r) => sum + (r.rating || 0), 0) / reviewCount
      : 0;

  return (
    <div className="min-h-screen bg-emerald-50 text-slate-900">
      <NavBar />
      <div aria-hidden className="h-16 md:h-20" />

      {/* ===== HERO HEADER ===== */}
      <div className="mx-auto max-w-6xl px-5 md:px-8 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-3xl border border-emerald-200/70 bg-white/70 backdrop-blur shadow-sm p-4 md:p-6"
        >
          <div className="text-sm text-slate-600 flex items-center gap-2">
            <Link href="/destination" className="inline-flex items-center gap-2 hover:text-slate-900">
              <ArrowLeft className="w-4 h-4" />
              Back to Explore
            </Link>
            <span className="mx-1">|</span>
            <span className="truncate">{trek.location}</span>
          </div>

          <div className="mt-3 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">{trek.name}</h1>

            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-800 font-semibold">
              <BadgeIndianRupee className="w-4 h-4" />
              {formatNpr(price)}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-700">
            <button
              onClick={() => scrollTo('reviews')}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 hover:bg-slate-50"
              title="See user reviews"
            >
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              {reviewCount ? reviewAvg.toFixed(1) : '—'}
              <span className="text-slate-500 text-xs ml-1">({reviewCount})</span>
            </button>

            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${difficultyBadge(trek.difficulty)}`}>
              <Mountain className="w-4 h-4" /> {trek.difficulty}
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
              <Clock className="w-4 h-4" /> {trek.duration}
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
              <Route className="w-4 h-4" /> {trek.distanceKm} km
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
              <MapPin className="w-4 h-4" /> {trek.location}
            </span>

            {typeof lat === 'number' && typeof lng === 'number' && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
                <LocateFixed className="w-4 h-4" /> {lat.toFixed(3)}, {lng.toFixed(3)}
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowSave(true)}
              className="h-10 px-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              title="Save"
            >
              <Bookmark className={`w-4 h-4 ${savedOn ? 'text-emerald-600 fill-emerald-600' : ''}`} />
              {savedOn ? 'Saved' : 'Save'}
            </button>

            <button
              className="h-10 px-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              title="Share"
              onClick={() =>
                navigator?.share?.({ title: trek.name, url: window.location.href }).catch(() => {})
              }
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>

            <a
              title="Directions"
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                typeof lat === 'number' && typeof lng === 'number' ? `${lat},${lng}` : trek.location
              )}`}
              target="_blank"
              rel="noreferrer"
              className="h-10 px-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              <Map className="w-4 h-4" />
              Directions
            </a>

            <Link
              href={`/book/${trekSlug}`}
              className="h-10 px-5 inline-flex items-center justify-center rounded-full bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
            >
              Book this trek
            </Link>
          </div>
        </motion.div>
      </div>

      <main className="mx-auto max-w-6xl px-5 md:px-8 py-6 md:py-8 space-y-6">
        {/* NAV (removed Photos + Nearby) */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
          <div className="flex flex-wrap gap-2">
            {[
              ['Overview', 'overview'],
              ['Reviews', 'reviews'],
              ['Hit the trail', 'hit'],
              ['Other treks', 'other'],
            ].map(([label, id]) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="h-9 px-3 rounded-full text-sm text-slate-700 hover:bg-white transition"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ===== OVERVIEW (single photo + arrows) ===== */}
        <Section id="overview">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative md:col-span-2 h-[340px] md:h-[520px] rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-sm">
              <SafeImg src={safeHero} alt={trek.name} onClick={() => openLightbox(heroIdx)} />

              {/* arrows */}
              {safeGallery.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      prevHero();
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 border border-white shadow hover:bg-white flex items-center justify-center"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      nextHero();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 border border-white shadow hover:bg-white flex items-center justify-center"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              <div className="absolute left-4 bottom-4 flex items-center gap-2">
                <div className="text-xs bg-black/55 text-white px-3 py-1 rounded-full">
                  {heroIdx + 1} / {safeGallery.length} photos
                </div>
                <button
                  onClick={() => openLightbox(heroIdx)}
                  className="text-xs bg-white/90 px-3 py-1 rounded-full border border-white shadow hover:bg-white"
                >
                  View
                </button>
              </div>
            </div>

            {/* Keep your previous right-side cards (not photo layout) */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs text-slate-500 uppercase tracking-wide">Overview</div>
                <p className="mt-2 text-slate-800">
                  {trek.description || `Short overview for ${trek.name}.`}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs text-slate-500 uppercase tracking-wide">Trip highlights</div>
                <ul className="mt-2 space-y-2 text-slate-800 text-sm">
                  <li className="flex items-center gap-2">
                    <Mountain className="w-4 h-4" /> Difficulty: <span className="font-medium">{trek.difficulty}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Duration: <span className="font-medium">{trek.duration}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Route className="w-4 h-4" /> Distance: <span className="font-medium">{trek.distanceKm} km</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <BadgeIndianRupee className="w-4 h-4" /> Est. price: <span className="font-medium">{formatNpr(price)}</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
                <div className="text-xs text-emerald-700 uppercase tracking-wide">Pro tip</div>
                <p className="mt-2 text-slate-800 text-sm">
                  Save this trek, then create a list like <span className="font-medium">“Spring adventures”</span>.
                </p>
                <button
                  onClick={() => setShowSave(true)}
                  className="mt-3 h-10 px-4 rounded-full bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                >
                  Save & organize
                </button>
              </div>
            </div>
          </div>
        </Section>

        {/* ===== REVIEWS ===== */}
        <Section id="reviews">
          <ReviewsBlock trekSlug={slugFromUrl} trekName={trek.name} api={reviewsApi} />
        </Section>

        {/* ===== HIT THE TRAIL (short circle UI) ===== */}
        <Section id="hit">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold mb-1">Hit the trail</h3>
            <p className="text-sm text-slate-600 mb-4">
              Quick things we take care of — simple & safe.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  title: 'Safe routes',
                  desc: 'Verified trail plan',
                  Icon: ShieldCheck,
                },
                {
                  title: 'Local team',
                  desc: 'Helpful support',
                  Icon: Users,
                },
                {
                  title: 'Smooth trip',
                  desc: 'Simple planning',
                  Icon: Sparkles,
                },
                {
                  title: 'Best value',
                  desc: 'Fair pricing',
                  Icon: Wallet,
                },
              ].map(({ title, desc, Icon }) => (
                <div key={title} className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-200 shadow-sm flex items-center justify-center">
                    <Icon className="w-7 h-7 text-emerald-700" />
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">{title}</div>
                  <div className="text-xs text-slate-600">{desc}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Tip: Start early and keep a little cash — network may be weak.
            </div>
          </div>
        </Section>

        {/* ===== OTHER TREKS (replaces Nearby) ===== */}
        <Section id="other">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold">Other treks you may like</h3>
              <Link href="/destination" className="text-sm text-emerald-700 hover:underline">
                Explore more
              </Link>
            </div>

            {otherLoading && <p className="mt-3 text-sm text-slate-500">Loading…</p>}

            {!otherLoading && otherTreks.length === 0 && (
              <p className="mt-3 text-sm text-slate-500">No suggestions yet.</p>
            )}

            {otherTreks.length > 0 && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {otherTreks.map((t) => (
                  <OtherTrekCard key={t.id || t._id || t.name} trek={t} />
                ))}
              </div>
            )}
          </div>
        </Section>
      </main>

      <Lightbox
        open={typeof lightboxIdx === 'number'}
        src={lightboxSrc}
        alt={trek.name}
        onClose={closeLightbox}
        onPrev={() => setLightboxIdx((x) => (typeof x === 'number' ? Math.max(0, x - 1) : 0))}
        onNext={() =>
          setLightboxIdx((x) =>
            typeof x === 'number' ? Math.min(safeGallery.length - 1, x + 1) : 0
          )
        }
        hasPrev={typeof lightboxIdx === 'number' && lightboxIdx > 0}
        hasNext={typeof lightboxIdx === 'number' && lightboxIdx < safeGallery.length - 1}
      />

      {showSave && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSave(false)} />
          <div className="relative w-full sm:w-[420px] rounded-t-2xl sm:rounded-2xl bg-white shadow-xl p-4 sm:p-5">
            <button
              className="absolute right-3 top-3 text-slate-500 hover:text-slate-700"
              onClick={() => setShowSave(false)}
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold mb-3">Save</h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  toggleTrek(trek.id);
                  setShowSave(false);
                }}
                className="w-full h-11 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700"
              >
                {savedOn ? 'Remove from favourites' : 'Add to favourites'}
              </button>

              <div className="rounded-xl border border-slate-200 p-3">
                <div className="text-sm font-medium mb-2">Create list</div>
                <div className="flex gap-2">
                  <input
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="e.g., Autumn in Annapurna"
                    className="flex-1 h-10 rounded-lg border border-slate-200 px-3"
                  />
                  <button
                    onClick={() => {
                      if (newListName.trim()) {
                        addList(newListName.trim(), trek.id);
                        setNewListName('');
                        setShowSave(false);
                      }
                    }}
                    className="h-10 px-4 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Minimal review card ---------- */
function Review({
  author,
  date,
  rating,
  text,
  badges = [],
  photos = [],
}: {
  author: string;
  date: string;
  rating: number;
  text: string;
  badges?: string[];
  photos?: string[];
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 bg-white">
      <div className="flex items-center justify-between">
        <div className="font-medium">{author}</div>
        <div className="text-sm text-slate-500">{date}</div>
      </div>

      <div className="mt-1 flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-slate-300'
            }`}
          />
        ))}
      </div>

      <p className="mt-2 text-slate-800">{text}</p>

      {photos.length > 0 && (
        <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={p}
              alt=""
              className="w-full h-full object-cover rounded-lg border border-slate-200"
            />
          ))}
        </div>
      )}

      {badges.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {badges.map((b) => (
            <span
              key={b}
              className="px-2 py-0.5 rounded-full text-xs border border-slate-200 bg-slate-50 text-slate-700"
            >
              {b}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// // frontend/src/app/trail/[slug]/page.tsx
// 'use client';

// import * as React from 'react';
// import Link from 'next/link';
// import Image from 'next/image';
// import { useParams } from 'next/navigation';
// import NavBar from '@/app/components/NavBar';
// import { useSaved } from '@/app/hooks/useSaved';
// import {
//   API_BASE,
//   FALLBACK_IMG,
//   galleryCandidates,
//   slugify,
//   getTrekBySlug,
//   type Trek as ApiTrek,
// } from '@/data/treks';
// import {
//   ArrowLeft,
//   Star,
//   Clock,
//   Mountain,
//   MapPin,
//   Share2,
//   Bookmark,
//   Map,
//   X,
//   ChevronLeft,
//   ChevronRight,
//   Images,
//   BadgeIndianRupee,
//   Route,
//   LocateFixed,
// } from 'lucide-react';
// import { AnimatePresence, motion } from 'framer-motion';

// /* ---------- helpers ---------- */
// function toAbs(url: string) {
//   if (!url) return '';
//   if (url.startsWith('http://') || url.startsWith('https://')) return url;
//   if (url.startsWith('/uploads/')) return `${API_BASE}${url}`;
//   return url;
// }

// function parseDays(duration: string) {
//   const m = String(duration).match(/(\d+)/);
//   return m ? Number(m[1]) : 1;
// }

// function getPriceNpr(trek: any) {
//   const direct =
//     (typeof trek.priceNPR === 'number' && trek.priceNPR > 0 && trek.priceNPR) ||
//     (typeof trek.priceNpr === 'number' && trek.priceNpr > 0 && trek.priceNpr) ||
//     (typeof trek.price === 'number' && trek.price > 0 && trek.price) ||
//     (typeof trek.cost === 'number' && trek.cost > 0 && trek.cost) ||
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

// function difficultyBadge(d: string) {
//   if (d === 'Easy') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
//   if (d === 'Moderate') return 'bg-amber-50 text-amber-700 border-amber-200';
//   return 'bg-rose-50 text-rose-700 border-rose-200';
// }

// /* ---------- Safe image ---------- */
// function SafeImg({
//   src,
//   alt,
//   className,
//   onClick,
// }: {
//   src: string;
//   alt: string;
//   className?: string;
//   onClick?: () => void;
// }) {
//   const [err, setErr] = React.useState(false);
//   const finalSrc = err ? FALLBACK_IMG : toAbs(src);

//   return (
//     // eslint-disable-next-line @next/next/no-img-element
//     <img
//       src={finalSrc}
//       alt={alt}
//       onError={() => setErr(true)}
//       onClick={onClick}
//       className={
//         className ??
//         'absolute inset-0 w-full h-full object-cover cursor-pointer select-none'
//       }
//     />
//   );
// }

// /* ---------- Anchor section ---------- */
// function Section({ id, children }: React.PropsWithChildren<{ id: string }>) {
//   return (
//     <section id={id} className="scroll-mt-28">
//       {children}
//     </section>
//   );
// }

// /* ---------- Reviews (Backend) ---------- */
// type ApiReview = {
//   _id: string;
//   authorName: string;
//   rating: number;
//   text: string;
//   photos: string[];
//   createdAt: string;
// };

// function useTrailReviewsApi(trekSlug: string) {
//   const [items, setItems] = React.useState<ApiReview[]>([]);
//   const [loading, setLoading] = React.useState(false);
//   const [error, setError] = React.useState<string | null>(null);

//   const load = React.useCallback(async () => {
//     if (!trekSlug) return;
//     try {
//       setLoading(true);
//       setError(null);

//       const res = await fetch(`${API_BASE}/reviews/${encodeURIComponent(trekSlug)}`, {
//         cache: 'no-store',
//       });
//       const data = await res.json();

//       if (!data?.success) {
//         setError(data?.message || 'Failed to load reviews');
//         return;
//       }

//       setItems(data.reviews || []);
//     } catch (e: any) {
//       setError(e?.message || 'Failed to load reviews');
//     } finally {
//       setLoading(false);
//     }
//   }, [trekSlug]);

//   React.useEffect(() => {
//     load();
//   }, [load]);

//   const addToList = (r: ApiReview) => setItems((prev) => [r, ...prev]);

//   return { items, loading, error, reload: load, addToList };
// }

// function ReviewsBlock({ trekSlug, trekName }: { trekSlug: string; trekName: string }) {
//   const { items, loading, error, reload, addToList } = useTrailReviewsApi(trekSlug);

//   const [rating, setRating] = React.useState(0);
//   const [text, setText] = React.useState('');
//   const [files, setFiles] = React.useState<File[]>([]);
//   const [previews, setPreviews] = React.useState<string[]>([]);
//   const [posting, setPosting] = React.useState(false);
//   const [postErr, setPostErr] = React.useState<string | null>(null);

//   const token =
//     typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

//   React.useEffect(() => {
//     return () => {
//       previews.forEach((u) => URL.revokeObjectURL(u));
//     };
//   }, [previews]);

//   const onFiles = (fl: FileList | null) => {
//     if (!fl) return;
//     const arr = Array.from(fl).slice(0, 6);
//     setFiles(arr);

//     setPreviews((prev) => {
//       prev.forEach((u) => URL.revokeObjectURL(u));
//       return arr.map((f) => URL.createObjectURL(f));
//     });
//   };

//   const avg =
//     items.length > 0
//       ? (items.reduce((sum, r) => sum + (r.rating || 0), 0) / items.length).toFixed(1)
//       : '4.2';

//   const submit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setPostErr(null);

//     if (!token) {
//       setPostErr('Please login to post a review.');
//       return;
//     }
//     if (!rating || !text.trim()) {
//       setPostErr('Please add rating and comment.');
//       return;
//     }

//     try {
//       setPosting(true);

//       const fd = new FormData();
//       fd.append('rating', String(rating));
//       fd.append('text', text.trim());
//       fd.append('trekName', trekName);
//       files.forEach((f) => fd.append('photos', f));

//       const res = await fetch(`${API_BASE}/reviews/${encodeURIComponent(trekSlug)}`, {
//         method: 'POST',
//         headers: { authorization: `Bearer ${token}` },
//         body: fd,
//       });

//       const data = await res.json();
//       if (!data?.success) {
//         setPostErr(data?.message || 'Failed to post review');
//         return;
//       }

//       addToList(data.review);
//       setRating(0);
//       setText('');
//       setFiles([]);
//       setPreviews((prev) => {
//         prev.forEach((u) => URL.revokeObjectURL(u));
//         return [];
//       });
//     } catch (e: any) {
//       setPostErr(e?.message || 'Failed to post review');
//     } finally {
//       setPosting(false);
//     }
//   };

//   return (
//     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//       {/* Summary */}
//       <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
//         <div className="text-5xl font-semibold leading-none">{avg}</div>
//         <div className="text-sm text-slate-600 mt-1">{items.length} reviews</div>

//         <div className="mt-4 space-y-1.5">
//           {[5, 4, 3, 2, 1].map((n) => {
//             const count = items.filter((r) => r.rating === n).length;
//             const pct = items.length ? Math.round((count / items.length) * 100) : 0;
//             return (
//               <div key={n} className="flex items-center gap-2">
//                 <span className="w-4 text-sm tabular-nums">{n}</span>
//                 <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
//                   <div className="h-full bg-slate-900" style={{ width: `${pct}%` }} />
//                 </div>
//               </div>
//             );
//           })}
//         </div>

//         <button
//           onClick={reload}
//           className="mt-4 h-10 px-4 rounded-full bg-slate-900 text-white hover:bg-slate-800"
//         >
//           Refresh reviews
//         </button>

//         {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
//         {loading && <p className="mt-2 text-xs text-slate-500">Loading…</p>}
//       </div>

//       {/* Form + feed */}
//       <div className="lg:col-span-2 space-y-4">
//         <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
//           <div className="font-medium mb-2">Add your review</div>

//           {postErr && <p className="mb-2 text-sm text-rose-600">{postErr}</p>}

//           <div className="flex items-center gap-2 mb-2">
//             {Array.from({ length: 5 }).map((_, i) => (
//               <button
//                 key={i}
//                 type="button"
//                 onClick={() => setRating(i + 1)}
//                 className="p-1"
//                 aria-label={`Rate ${i + 1} star`}
//               >
//                 <Star
//                   className={`w-6 h-6 ${
//                     i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-slate-300'
//                   }`}
//                 />
//               </button>
//             ))}
//           </div>

//           <textarea
//             value={text}
//             onChange={(e) => setText(e.target.value)}
//             rows={4}
//             placeholder={`Share your experience on ${trekName}…`}
//             className="w-full rounded-xl border border-slate-200 px-3 py-2"
//           />

//           <div className="mt-2 flex items-center gap-3">
//             <label className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-slate-900 text-white cursor-pointer hover:bg-slate-800">
//               <Images className="w-4 h-4" />
//               <input
//                 type="file"
//                 accept="image/*"
//                 multiple
//                 onChange={(e) => onFiles(e.target.files)}
//                 className="hidden"
//               />
//               Add photos
//             </label>

//             <button
//               disabled={posting}
//               className="h-10 px-4 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
//             >
//               {posting ? 'Posting…' : 'Post review'}
//             </button>
//           </div>

//           {previews.length > 0 && (
//             <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
//               {previews.map((p, idx) => (
//                 <div
//                   key={idx}
//                   className="relative w-full aspect-square overflow-hidden rounded-lg border border-slate-200"
//                 >
//                   {/* eslint-disable-next-line @next/next/no-img-element */}
//                   <img src={p} alt="" className="object-cover w-full h-full" />
//                 </div>
//               ))}
//             </div>
//           )}
//         </form>

//         {items.map((r) => (
//           <Review
//             key={r._id}
//             author={r.authorName}
//             date={new Date(r.createdAt).toLocaleDateString()}
//             rating={r.rating}
//             text={r.text}
//             photos={(r.photos || []).map(toAbs)}
//           />
//         ))}

//         {items.length === 0 && !loading && (
//           <p className="text-sm text-slate-500">No reviews yet. Be the first!</p>
//         )}
//       </div>
//     </div>
//   );
// }

// /* ---------- Lightbox ---------- */
// function Lightbox({
//   open,
//   src,
//   alt,
//   onClose,
//   onPrev,
//   onNext,
//   hasPrev,
//   hasNext,
// }: {
//   open: boolean;
//   src: string;
//   alt: string;
//   onClose: () => void;
//   onPrev: () => void;
//   onNext: () => void;
//   hasPrev: boolean;
//   hasNext: boolean;
// }) {
//   return (
//     <AnimatePresence>
//       {open && (
//         <motion.div
//           className="fixed inset-0 z-[60] flex items-center justify-center"
//           initial={{ opacity: 0 }}
//           animate={{ opacity: 1 }}
//           exit={{ opacity: 0 }}
//         >
//           <div className="absolute inset-0 bg-black/70" onClick={onClose} />
//           <motion.div
//             initial={{ y: 20, opacity: 0, scale: 0.98 }}
//             animate={{ y: 0, opacity: 1, scale: 1 }}
//             exit={{ y: 20, opacity: 0, scale: 0.98 }}
//             className="relative w-[92vw] max-w-5xl rounded-2xl overflow-hidden border border-white/10 bg-black"
//           >
//             <button
//               className="absolute top-3 right-3 z-10 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
//               onClick={onClose}
//               aria-label="Close"
//             >
//               <X className="w-5 h-5" />
//             </button>

//             {hasPrev && (
//               <button
//                 className="absolute left-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
//                 onClick={onPrev}
//                 aria-label="Previous"
//               >
//                 <ChevronLeft className="w-6 h-6" />
//               </button>
//             )}

//             {hasNext && (
//               <button
//                 className="absolute right-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
//                 onClick={onNext}
//                 aria-label="Next"
//               >
//                 <ChevronRight className="w-6 h-6" />
//               </button>
//             )}

//             <div className="relative w-full aspect-[16/9] bg-black">
//               {/* eslint-disable-next-line @next/next/no-img-element */}
//               <img src={src} alt={alt} className="w-full h-full object-contain" />
//             </div>
//           </motion.div>
//         </motion.div>
//       )}
//     </AnimatePresence>
//   );
// }

// /* ---------- Page ---------- */
// export default function TrailPage() {
//   const params = useParams<{ slug: string | string[] }>();
//   const slugFromUrl =
//     typeof params?.slug === 'string'
//       ? params.slug
//       : Array.isArray(params?.slug)
//       ? params.slug[0]
//       : '';

//   const { toggleTrek, isSaved, addList } = useSaved();
//   const [showSave, setShowSave] = React.useState(false);
//   const [newListName, setNewListName] = React.useState('');

//   const [trek, setTrek] = React.useState<ApiTrek | null>(null);
//   const [loading, setLoading] = React.useState(false);
//   const [err, setErr] = React.useState<string | null>(null);

//   const [lightboxIdx, setLightboxIdx] = React.useState<number | null>(null);

//   React.useEffect(() => {
//     let alive = true;
//     (async () => {
//       if (!slugFromUrl) return;
//       try {
//         setLoading(true);
//         setErr(null);
//         const t = await getTrekBySlug(slugFromUrl);
//         if (!alive) return;
//         setTrek(t);
//       } catch (e: any) {
//         if (!alive) return;
//         setErr(e?.message || 'Trail not found');
//         setTrek(null);
//       } finally {
//         if (alive) setLoading(false);
//       }
//     })();
//     return () => {
//       alive = false;
//     };
//   }, [slugFromUrl]);

//   const scrollTo = (targetId: string) => {
//     const el = document.getElementById(targetId);
//     if (!el) return;
//     el.scrollIntoView({ behavior: 'smooth', block: 'start' });
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-emerald-50 text-slate-900">
//         <NavBar />
//         <div className="mx-auto max-w-3xl px-6 py-24 text-center">
//           <p className="text-lg text-slate-700">Loading trail…</p>
//         </div>
//       </div>
//     );
//   }

//   if (!trek || err) {
//     return (
//       <div className="min-h-screen bg-emerald-50">
//         <NavBar />
//         <div className="mx-auto max-w-3xl px-6 py-24 text-center">
//           <p className="text-xl font-medium text-slate-900">{err || 'Trail not found'}</p>
//           <Link href="/destination" className="mt-3 inline-block text-emerald-700 hover:underline">
//             Back to explore
//           </Link>
//         </div>
//       </div>
//     );
//   }

//   const trekSlug = trek.slug || slugify(trek.name);
//   const gallery = [trek.image, ...galleryCandidates(slugFromUrl)]
//     .filter(Boolean)
//     .map(toAbs)
//     .slice(0, 12);

//   const savedOn = isSaved(trek.id);
//   const price = getPriceNpr(trek as any);

//   const lat = (trek as any).latitude;
//   const lng = (trek as any).longitude;

//   const openLightbox = (idx: number) => setLightboxIdx(idx);
//   const closeLightbox = () => setLightboxIdx(null);

//   const lightboxSrc =
//     typeof lightboxIdx === 'number' && gallery[lightboxIdx] ? gallery[lightboxIdx] : '';

//   return (
//     <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-stone-50 to-stone-50 text-slate-900">
//       <NavBar />
//       <div aria-hidden className="h-16 md:h-20" />

//       {/* ===== HERO HEADER ===== */}
//       <div className="mx-auto max-w-6xl px-5 md:px-8 pt-6">
//         <motion.div
//           initial={{ opacity: 0, y: 14 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.35 }}
//           className="rounded-3xl border border-emerald-200/70 bg-white/70 backdrop-blur shadow-sm p-4 md:p-6"
//         >
//           <div className="text-sm text-slate-600 flex items-center gap-2">
//             <Link href="/destination" className="inline-flex items-center gap-2 hover:text-slate-900">
//               <ArrowLeft className="w-4 h-4" />
//               Back to Explore
//             </Link>
//             <span className="mx-1">|</span>
//             <span className="truncate">{trek.location}</span>
//           </div>

//           <div className="mt-3 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
//             <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">{trek.name}</h1>

//             <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-800 font-semibold">
//               <BadgeIndianRupee className="w-4 h-4" />
//               {formatNpr(price)}
//             </div>
//           </div>

//           <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-700">
//             <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
//               <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
//               {Number(trek.rating || 0).toFixed(1)}
//             </span>

//             <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${difficultyBadge(trek.difficulty)}`}>
//               <Mountain className="w-4 h-4" /> {trek.difficulty}
//             </span>

//             <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
//               <Clock className="w-4 h-4" /> {trek.duration}
//             </span>

//             <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
//               <Route className="w-4 h-4" /> {trek.distanceKm} km
//             </span>

//             <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
//               <MapPin className="w-4 h-4" /> {trek.location}
//             </span>

//             {typeof lat === 'number' && typeof lng === 'number' && (
//               <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
//                 <LocateFixed className="w-4 h-4" /> {lat.toFixed(3)}, {lng.toFixed(3)}
//               </span>
//             )}
//           </div>

//           <div className="mt-4 flex flex-wrap items-center gap-2">
//             <button
//               onClick={() => setShowSave(true)}
//               className="h-10 px-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
//               title="Save"
//             >
//               <Bookmark className={`w-4 h-4 ${savedOn ? 'text-emerald-600 fill-emerald-600' : ''}`} />
//               {savedOn ? 'Saved' : 'Save'}
//             </button>

//             <button
//               className="h-10 px-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
//               title="Share"
//               onClick={() =>
//                 navigator?.share?.({ title: trek.name, url: window.location.href }).catch(() => {})
//               }
//             >
//               <Share2 className="w-4 h-4" />
//               Share
//             </button>

//             <a
//               title="Directions"
//               href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
//                 typeof lat === 'number' && typeof lng === 'number' ? `${lat},${lng}` : trek.location
//               )}`}
//               target="_blank"
//               rel="noreferrer"
//               className="h-10 px-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
//             >
//               <Map className="w-4 h-4" />
//               Directions
//             </a>

//             <Link
//               href={`/book/${trekSlug}`}
//               className="h-10 px-5 inline-flex items-center justify-center rounded-full bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
//             >
//               Book this trek
//             </Link>
//           </div>
//         </motion.div>
//       </div>

//       <main className="mx-auto max-w-6xl px-5 md:px-8 py-6 md:py-8 space-y-6">
//         <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
//           <div className="flex flex-wrap gap-2">
//             {[
//               ['Overview', 'overview'],
//               ['Photos', 'photos'],
//               ['Reviews', 'reviews'],
//               ['Hit the trail', 'hit'],
//               ['Nearby', 'nearby'],
//             ].map(([label, id]) => (
//               <button
//                 key={id}
//                 onClick={() => scrollTo(id)}
//                 className="h-9 px-3 rounded-full text-sm text-slate-700 hover:bg-white transition"
//               >
//                 {label}
//               </button>
//             ))}
//           </div>
//         </div>

//         <Section id="overview">
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//             <div className="relative md:col-span-2 h-[340px] md:h-[480px] rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-sm">
//               <SafeImg src={gallery[0]} alt={trek.name} onClick={() => openLightbox(0)} />
//               <div className="absolute left-4 bottom-4 flex items-center gap-2">
//                 <div className="text-xs bg-black/55 text-white px-3 py-1 rounded-full">
//                   {Math.min(gallery.length, 38)} photos
//                 </div>
//                 <button
//                   onClick={() => openLightbox(0)}
//                   className="text-xs bg-white/90 px-3 py-1 rounded-full border border-white shadow hover:bg-white"
//                 >
//                   View
//                 </button>
//               </div>
//             </div>

//             <div className="grid grid-cols-2 gap-3">
//               {gallery.slice(1, 5).map((src, i) => (
//                 <div
//                   key={src + i}
//                   className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm"
//                 >
//                   <SafeImg src={src} alt={`${trek.name} photo ${i + 2}`} onClick={() => openLightbox(i + 1)} />
//                 </div>
//               ))}

//               <button
//                 onClick={() => openLightbox(0)}
//                 className="col-span-2 h-12 rounded-2xl border border-slate-200 bg-white shadow-sm hover:bg-slate-50 inline-flex items-center justify-center gap-2 text-sm font-medium"
//               >
//                 <Images className="w-4 h-4" />
//                 See all photos
//               </button>
//             </div>
//           </div>

//           <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
//             <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
//               <div className="text-xs text-slate-500 uppercase tracking-wide">Overview</div>
//               <p className="mt-2 text-slate-800">
//                 {trek.description || `Short overview for ${trek.name}.`}
//               </p>
//             </div>

//             <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
//               <div className="text-xs text-slate-500 uppercase tracking-wide">Trip highlights</div>
//               <ul className="mt-2 space-y-2 text-slate-800 text-sm">
//                 <li className="flex items-center gap-2">
//                   <Mountain className="w-4 h-4" /> Difficulty: <span className="font-medium">{trek.difficulty}</span>
//                 </li>
//                 <li className="flex items-center gap-2">
//                   <Clock className="w-4 h-4" /> Duration: <span className="font-medium">{trek.duration}</span>
//                 </li>
//                 <li className="flex items-center gap-2">
//                   <Route className="w-4 h-4" /> Distance: <span className="font-medium">{trek.distanceKm} km</span>
//                 </li>
//                 <li className="flex items-center gap-2">
//                   <BadgeIndianRupee className="w-4 h-4" /> Est. price: <span className="font-medium">{formatNpr(price)}</span>
//                 </li>
//               </ul>
//             </div>

//             <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
//               <div className="text-xs text-emerald-700 uppercase tracking-wide">Pro tip</div>
//               <p className="mt-2 text-slate-800 text-sm">
//                 Save this trek, then create a list like <span className="font-medium">“Spring adventures”</span> or{' '}
//                 <span className="font-medium">“Easy weekend hikes”</span>.
//               </p>
//               <button
//                 onClick={() => setShowSave(true)}
//                 className="mt-3 h-10 px-4 rounded-full bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
//               >
//                 Save & organize
//               </button>
//             </div>
//           </div>
//         </Section>

//         <Section id="photos">
//           <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
//             <div className="flex items-center justify-between gap-2">
//               <h3 className="text-lg font-semibold">Photo gallery</h3>
//               <button
//                 onClick={() => openLightbox(0)}
//                 className="h-10 px-4 rounded-full border border-slate-200 hover:bg-slate-50 inline-flex items-center gap-2"
//               >
//                 <Images className="w-4 h-4" />
//                 Open viewer
//               </button>
//             </div>

//             <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
//               {gallery.slice(0, 12).map((src, idx) => (
//                 <div
//                   key={src + idx}
//                   className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 cursor-pointer"
//                 >
//                   <SafeImg src={src} alt={`${trek.name} gallery ${idx + 1}`} onClick={() => openLightbox(idx)} />
//                 </div>
//               ))}
//             </div>
//           </div>
//         </Section>

//         <Section id="reviews">
//           <ReviewsBlock trekSlug={slugFromUrl} trekName={trek.name} />
//         </Section>

//         <Section id="hit">
//           <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
//             <h3 className="text-lg font-semibold mb-3">Hit the trail</h3>
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-800">
//               <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50">
//                 <div className="font-semibold mb-1">Pack smart</div>
//                 <ul className="list-disc pl-5 space-y-1">
//                   <li>2–3L water + snacks</li>
//                   <li>Shell jacket + warm layer</li>
//                   <li>Headlamp + power bank</li>
//                 </ul>
//               </div>
//               <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50">
//                 <div className="font-semibold mb-1">Stay safe</div>
//                 <ul className="list-disc pl-5 space-y-1">
//                   <li>Start early</li>
//                   <li>Keep offline map</li>
//                   <li>Respect altitude limits</li>
//                 </ul>
//               </div>
//               <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50">
//                 <div className="font-semibold mb-1">Trail etiquette</div>
//                 <ul className="list-disc pl-5 space-y-1">
//                   <li>Yield to porters & yaks</li>
//                   <li>Pack out trash</li>
//                   <li>Respect local culture</li>
//                 </ul>
//               </div>
//             </div>
//           </div>
//         </Section>

//         <Section id="nearby">
//           <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
//             <h3 className="text-lg font-semibold mb-3">Nearby</h3>
//             <div className="flex items-center gap-3">
//               <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200">
//                 <Image
//                   src="/image/kathmandu.jpeg"
//                   alt="Kathmandu Valley"
//                   width={40}
//                   height={40}
//                   className="object-cover"
//                 />
//               </div>
//               <div>
//                 <p className="font-medium">Kathmandu Valley</p>
//                 <p className="text-sm text-slate-500">Valley</p>
//               </div>
//             </div>
//           </div>
//         </Section>
//       </main>

//       <Lightbox
//         open={typeof lightboxIdx === 'number'}
//         src={lightboxSrc}
//         alt={trek.name}
//         onClose={closeLightbox}
//         onPrev={() => setLightboxIdx((x) => (typeof x === 'number' ? Math.max(0, x - 1) : 0))}
//         onNext={() =>
//           setLightboxIdx((x) =>
//             typeof x === 'number' ? Math.min(gallery.length - 1, x + 1) : 0
//           )
//         }
//         hasPrev={typeof lightboxIdx === 'number' && lightboxIdx > 0}
//         hasNext={typeof lightboxIdx === 'number' && lightboxIdx < gallery.length - 1}
//       />

//       {showSave && (
//         <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
//           <div className="absolute inset-0 bg-black/40" onClick={() => setShowSave(false)} />
//           <div className="relative w-full sm:w-[420px] rounded-t-2xl sm:rounded-2xl bg-white shadow-xl p-4 sm:p-5">
//             <button
//               className="absolute right-3 top-3 text-slate-500 hover:text-slate-700"
//               onClick={() => setShowSave(false)}
//             >
//               <X className="w-5 h-5" />
//             </button>
//             <h3 className="text-lg font-semibold mb-3">Save</h3>
//             <div className="space-y-2">
//               <button
//                 onClick={() => {
//                   toggleTrek(trek.id);
//                   setShowSave(false);
//                 }}
//                 className="w-full h-11 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700"
//               >
//                 {savedOn ? 'Remove from favourites' : 'Add to favourites'}
//               </button>

//               <div className="rounded-xl border border-slate-200 p-3">
//                 <div className="text-sm font-medium mb-2">Create list</div>
//                 <div className="flex gap-2">
//                   <input
//                     value={newListName}
//                     onChange={(e) => setNewListName(e.target.value)}
//                     placeholder="e.g., Autumn in Annapurna"
//                     className="flex-1 h-10 rounded-lg border border-slate-200 px-3"
//                   />
//                   <button
//                     onClick={() => {
//                       if (newListName.trim()) {
//                         addList(newListName.trim(), trek.id);
//                         setNewListName('');
//                         setShowSave(false);
//                       }
//                     }}
//                     className="h-10 px-4 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
//                   >
//                     Create
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// /* ---------- Minimal review card ---------- */
// function Review({
//   author,
//   date,
//   rating,
//   text,
//   badges = [],
//   photos = [],
// }: {
//   author: string;
//   date: string;
//   rating: number;
//   text: string;
//   badges?: string[];
//   photos?: string[];
// }) {
//   return (
//     <div className="rounded-xl border border-slate-200 p-4 bg-white">
//       <div className="flex items-center justify-between">
//         <div className="font-medium">{author}</div>
//         <div className="text-sm text-slate-500">{date}</div>
//       </div>

//       <div className="mt-1 flex items-center gap-1">
//         {Array.from({ length: 5 }).map((_, i) => (
//           <Star
//             key={i}
//             className={`w-4 h-4 ${
//               i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-slate-300'
//             }`}
//           />
//         ))}
//       </div>

//       <p className="mt-2 text-slate-800">{text}</p>

//       {photos.length > 0 && (
//         <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
//           {photos.map((p, i) => (
//             // eslint-disable-next-line @next/next/no-img-element
//             <img
//               key={i}
//               src={p}
//               alt=""
//               className="w-full h-full object-cover rounded-lg border border-slate-200"
//             />
//           ))}
//         </div>
//       )}

//       {badges.length > 0 && (
//         <div className="mt-3 flex flex-wrap gap-2">
//           {badges.map((b) => (
//             <span
//               key={b}
//               className="px-2 py-0.5 rounded-full text-xs border border-slate-200 bg-slate-50 text-slate-700"
//             >
//               {b}
//             </span>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }
