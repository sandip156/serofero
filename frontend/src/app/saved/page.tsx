// frontend/src/app/saved/page.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import NavBar from '../components/NavBar';
import { useSaved } from '@/app/hooks/useSaved';
import { getTreks, API_BASE, slugify, toAbsImage, type Trek } from '@/data/treks';
import {
  Calendar,
  Trash2,
  BookmarkX,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock3,
  Search,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';

type Booking = {
  _id: string;
  trekName: string;
  trekSlug: string;
  startDate: string;
  people: number;
  phone?: string;
  note?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
};

function authHeader(token: string) {
  const t = String(token || '').trim();
  if (!t) return '';
  return t.startsWith('Bearer ') ? t : `Bearer ${t}`;
}

function StatusPill({ status }: { status: Booking['status'] }) {
  const cls =
    status === 'confirmed'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : status === 'cancelled'
      ? 'bg-rose-50 text-rose-700 ring-rose-200'
      : 'bg-amber-50 text-amber-700 ring-amber-200';

  const Icon =
    status === 'confirmed' ? CheckCircle2 : status === 'cancelled' ? XCircle : Clock3;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ${cls}`}
    >
      <Icon className="w-4 h-4" />
      {status}
    </span>
  );
}

function PillButton({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm ring-1 transition ${
        active
          ? 'bg-emerald-700 text-white ring-emerald-700 shadow'
          : 'bg-white text-emerald-900 ring-emerald-200 hover:bg-emerald-50'
      }`}
    >
      {children}
    </button>
  );
}

export default function SavedPage() {
  const { savedIds, toggleTrek, plans, addPlan, removePlan } = useSaved();

  const [activeTab, setActiveTab] = React.useState<'saved' | 'plans' | 'bookings'>('saved');
  const [search, setSearch] = React.useState('');

  // ✅ auth token for bookings
  const [token, setToken] = React.useState<string>('');
  React.useEffect(() => {
    const read = () => {
      if (typeof window === 'undefined') return;
      setToken(localStorage.getItem('auth_token') || '');
    };
    read();
    window.addEventListener('storage', read);
    return () => window.removeEventListener('storage', read);
  }, []);

  // ✅ treks
  const [treks, setTreks] = React.useState<Trek[]>([]);
  const [loadingTreks, setLoadingTreks] = React.useState(false);
  const [trekErr, setTrekErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        setLoadingTreks(true);
        setTrekErr(null);
        const list = await getTreks();
        if (!ignore) setTreks(list);
      } catch (e: any) {
        if (!ignore) setTrekErr(e?.message || 'Failed to load treks');
      } finally {
        if (!ignore) setLoadingTreks(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  const savedTreks = React.useMemo(
    () => treks.filter((t) => savedIds.includes(t.id)),
    [treks, savedIds]
  );

  const filteredTreks = React.useMemo(() => {
    if (!search.trim()) return savedTreks;
    const q = search.toLowerCase();
    return savedTreks.filter(
      (t) => t.name.toLowerCase().includes(q) || t.location.toLowerCase().includes(q)
    );
  }, [savedTreks, search]);

  // ===================== PLANS =====================
  const [title, setTitle] = React.useState('');
  const [start, setStart] = React.useState('');
  const [end, setEnd] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [attachIds, setAttachIds] = React.useState<number[]>([]);

  const toggleAttach = (id: number) =>
    setAttachIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const onAddPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addPlan({ title: title.trim(), start, end, notes, trekIds: attachIds });
    setTitle('');
    setStart('');
    setEnd('');
    setNotes('');
    setAttachIds([]);
  };

  const startQuickPlan = (trekId?: number) => {
    setActiveTab('plans');

    if (trekId) {
      const trek = treks.find((t) => t.id === trekId);
      if (trek) {
        setTitle(trek.name);
        setAttachIds([trekId]);
      }
    }

    if (typeof window !== 'undefined') {
      const el = document.getElementById('plans-section');
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  function resolveImg(src: string) {
    if (!src) return '';
    if (src.startsWith('http://') || src.startsWith('https://')) return src;
    if (src.startsWith('/uploads/')) return `${API_BASE}${src}`;
    return src;
  }

  const clearAllSaved = () => {
    if (!savedIds.length) return;
    if (typeof window !== 'undefined') {
      const ok = window.confirm('Remove all saved treks?');
      if (!ok) return;
    }
    savedIds.forEach((id) => toggleTrek(id));
  };

  // ===================== BOOKINGS =====================
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = React.useState(false);
  const [bookingErr, setBookingErr] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);

  const [bookingFilter, setBookingFilter] = React.useState<'all' | Booking['status']>('all');
  const [bookingSearch, setBookingSearch] = React.useState('');
  const [cancelingId, setCancelingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(id);
  }, [toast]);

  const loadBookings = React.useCallback(async () => {
    if (!token) return;

    try {
      setLoadingBookings(true);
      setBookingErr(null);

      const res = await fetch(`${API_BASE}/bookings/my`, {
        headers: { authorization: authHeader(token) },
        cache: 'no-store',
      });
      const data = await res.json();

      if (!data?.success) {
        setBookingErr(data?.message || 'Failed to load bookings');
        setBookings([]);
        return;
      }

      setBookings((data.bookings || []) as Booking[]);
    } catch (e: any) {
      setBookingErr(e?.message || 'Failed to load bookings');
      setBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  }, [token]);

  React.useEffect(() => {
    if (activeTab !== 'bookings') return;
    if (!token) return;
    loadBookings();
  }, [activeTab, token, loadBookings]);

  const bookingStats = React.useMemo(() => {
    const pending = bookings.filter((b) => b.status === 'pending').length;
    const confirmed = bookings.filter((b) => b.status === 'confirmed').length;
    const cancelled = bookings.filter((b) => b.status === 'cancelled').length;
    return { pending, confirmed, cancelled, total: bookings.length };
  }, [bookings]);

  const visibleBookings = React.useMemo(() => {
    let list = [...bookings];

    if (bookingFilter !== 'all') list = list.filter((b) => b.status === bookingFilter);

    if (bookingSearch.trim()) {
      const q = bookingSearch.toLowerCase();
      list = list.filter(
        (b) =>
          (b.trekName || '').toLowerCase().includes(q) ||
          (b.trekSlug || '').toLowerCase().includes(q)
      );
    }

    // newest first
    list.sort((a, b) => {
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return db - da;
    });

    return list;
  }, [bookings, bookingFilter, bookingSearch]);

  async function cancelBooking(id: string) {
    if (!token) return;

    const ok =
      typeof window === 'undefined'
        ? true
        : window.confirm('Cancel this booking request? (Only pending bookings can be cancelled)');

    if (!ok) return;

    setCancelingId(id);
    setBookingErr(null);

    // optimistic
    const prev = bookings;
    setBookings((cur) => cur.map((b) => (b._id === id ? { ...b, status: 'cancelled' } : b)));

    try {
      const res = await fetch(`${API_BASE}/bookings/${id}/cancel`, {
        method: 'PATCH',
        headers: { authorization: authHeader(token) },
      });
      const data = await res.json();

      if (!data?.success) {
        setBookings(prev); // rollback
        setBookingErr(data?.message || 'Failed to cancel booking');
        return;
      }

      setToast('Booking cancelled');
      // keep optimistic state, but refresh to sync
      await loadBookings();
    } catch (e: any) {
      setBookings(prev); // rollback
      setBookingErr(e?.message || 'Failed to cancel booking');
    } finally {
      setCancelingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-emerald-50 text-emerald-900">
      <NavBar />
      <div aria-hidden className="h-16 md:h-20" />

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50">
          <div className="rounded-full bg-emerald-700 text-white text-sm px-4 py-2 shadow-lg">
            {toast}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-8">
        {/* Header + tabs */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold">Your adventures</h1>
            <p className="text-sm text-emerald-900/70">
              Bookmark treks, manage bookings, and turn them into trip plans.
            </p>

            {trekErr && (
              <p className="mt-2 text-xs text-rose-700 bg-rose-50 ring-1 ring-rose-200 inline-block px-3 py-1 rounded-full">
                {trekErr}
              </p>
            )}
            {loadingTreks && <p className="mt-2 text-xs text-emerald-900/70">Loading treks…</p>}
          </div>

          <div className="inline-flex rounded-full bg-emerald-100/80 p-1 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('saved')}
              className={`px-4 py-1.5 text-sm rounded-full transition ${
                activeTab === 'saved'
                  ? 'bg-white shadow text-emerald-900'
                  : 'text-emerald-800/70 hover:bg-emerald-100'
              }`}
            >
              Saved treks
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('plans')}
              className={`px-4 py-1.5 text-sm rounded-full transition ${
                activeTab === 'plans'
                  ? 'bg-white shadow text-emerald-900'
                  : 'text-emerald-800/70 hover:bg-emerald-100'
              }`}
            >
              Trip plans
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bookings')}
              className={`px-4 py-1.5 text-sm rounded-full transition ${
                activeTab === 'bookings'
                  ? 'bg-white shadow text-emerald-900'
                  : 'text-emerald-800/70 hover:bg-emerald-100'
              }`}
            >
              Bookings
            </button>
          </div>
        </header>

        <div className="space-y-10">
          {/* ===================== SAVED ===================== */}
          {activeTab === 'saved' && (
            <section>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-end gap-3">
                  <h2 className="text-xl sm:text-2xl font-bold">Saved treks</h2>
                  {savedTreks.length > 0 && (
                    <span className="text-sm opacity-70">
                      {savedTreks.length} item{savedTreks.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {savedTreks.length > 0 && (
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by name or location…"
                      className="w-full sm:w-64 h-9 rounded-full px-3 bg-white ring-1 ring-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    />
                    <button
                      type="button"
                      onClick={clearAllSaved}
                      className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-full bg-rose-50 text-rose-700 text-xs font-medium ring-1 ring-rose-200 hover:bg-rose-100 disabled:opacity-50"
                      disabled={savedTreks.length === 0}
                    >
                      <Trash2 className="w-4 h-4" />
                      Clear all
                    </button>
                  </div>
                )}
              </div>

              {savedTreks.length === 0 ? (
                <EmptyState onStartPlan={() => startQuickPlan()} />
              ) : filteredTreks.length === 0 ? (
                <div className="mt-4 rounded-2xl bg-white ring-1 ring-emerald-200 p-5 shadow-sm text-sm">
                  <p className="text-emerald-900/90">No treks match your search.</p>
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="mt-2 text-emerald-700 underline text-sm"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <div className="mt-4 grid gap-4 grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {filteredTreks.map((t) => {
                    const slug = t.slug || slugify(t.name);

                    return (
                      <article
                        key={t.id}
                        className="group rounded-2xl overflow-hidden bg-white ring-1 ring-emerald-200 shadow-sm flex flex-col"
                      >
                        <Link href={`/trails/${slug}`} className="relative block h-40 md:h-44">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={resolveImg(t.image)}
                            alt={t.name}
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = '/image/placeholder.jpg';
                            }}
                          />
                        </Link>

                        <div className="p-3 flex-1 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-semibold leading-tight line-clamp-2">{t.name}</h3>
                            <p className="text-sm opacity-70 truncate">{t.location}</p>
                            <button
                              type="button"
                              onClick={() => startQuickPlan(t.id)}
                              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              Plan a trip with this
                            </button>
                          </div>

                          <div className="shrink-0 flex flex-col items-end gap-2">
                            <button
                              onClick={() => toggleTrek(t.id)}
                              className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 hover:bg-rose-100
                                         ring-1 ring-rose-200 rounded-full px-2.5 py-1 text-xs font-medium"
                              title="Remove from favourites"
                            >
                              <BookmarkX className="w-4 h-4" /> Remove
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ===================== PLANS ===================== */}
          {activeTab === 'plans' && (
            <section id="plans-section">
              <h2 className="text-xl sm:text-2xl font-bold mb-3">My trip plans</h2>

              <form
                onSubmit={onAddPlan}
                className="rounded-2xl bg-white ring-1 ring-emerald-200 p-4 sm:p-5 shadow-sm space-y-3"
              >
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Pokhara long weekend"
                      className="mt-1 w-full h-11 rounded-xl px-3 bg-emerald-50/70 ring-1 ring-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">Start</label>
                      <input
                        type="date"
                        value={start}
                        onChange={(e) => setStart(e.target.value)}
                        className="mt-1 w-full h-11 rounded-xl px-3 bg-emerald-50/70 ring-1 ring-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">End</label>
                      <input
                        type="date"
                        value={end}
                        onChange={(e) => setEnd(e.target.value)}
                        className="mt-1 w-full h-11 rounded-xl px-3 bg-emerald-50/70 ring-1 ring-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-xl px-3 py-2 bg-emerald-50/70 ring-1 ring-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Permits, buses, gear list, friends…"
                  />
                </div>

                {savedTreks.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">Attach saved treks</p>
                    <div className="flex flex-wrap gap-2">
                      {savedTreks.map((t) => (
                        <label
                          key={t.id}
                          className={`px-3 py-1 rounded-full cursor-pointer ring-1 text-xs sm:text-sm transition
                            ${
                              attachIds.includes(t.id)
                                ? 'bg-emerald-600 text-white ring-emerald-600'
                                : 'bg-white text-emerald-900 ring-emerald-200 hover:bg-emerald-50'
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={attachIds.includes(t.id)}
                            onChange={() => toggleAttach(t.id)}
                            className="sr-only"
                          />
                          {t.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button className="h-11 px-4 rounded-full bg-emerald-600 text-white font-semibold shadow hover:bg-emerald-700">
                    Save plan
                  </button>
                </div>
              </form>

              <div className="mt-6 grid gap-4 sm:gap-5">
                {plans.length === 0 ? (
                  <p className="text-emerald-900/80 text-sm">
                    No plans yet. Use the form above to create your first trip.
                  </p>
                ) : (
                  plans.map((p) => (
                    <article
                      key={p.id}
                      className="rounded-2xl bg-white ring-1 ring-emerald-200 p-4 sm:p-5 shadow-sm"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-lg">{p.title}</h3>
                          {(p.start || p.end) && (
                            <p className="text-sm opacity-70 inline-flex items-center gap-2 mt-1">
                              <Calendar className="w-4 h-4" />
                              {p.start || '—'} → {p.end || '—'}
                            </p>
                          )}
                          {p.notes && <p className="mt-2 max-w-prose text-sm">{p.notes}</p>}
                        </div>

                        <button
                          onClick={() => removePlan(p.id)}
                          className="self-start inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100 text-sm"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>

                      {p.trekIds.length > 0 && (
                        <div className="mt-3 grid gap-3 grid-cols-1 xs:grid-cols-2 md:grid-cols-3">
                          {p.trekIds.map((id) => {
                            const t = treks.find((tt) => tt.id === id);
                            if (!t) return null;

                            const slug = t.slug || slugify(t.name);

                            return (
                              <Link
                                key={id}
                                href={`/trails/${slug}`}
                                className="group rounded-xl ring-1 ring-emerald-200 overflow-hidden bg-emerald-50/40 hover:bg-emerald-50"
                              >
                                <div className="relative h-28">
                                  <Image
                                    src={toAbsImage(t.image) || '/image/placeholder.jpg'}
                                    alt={t.name}
                                    fill
                                    className="object-cover group-hover:scale-[1.03] transition-transform"
                                  />
                                </div>
                                <div className="p-2">
                                  <p className="font-medium group-hover:underline line-clamp-2">
                                    {t.name}
                                  </p>
                                  <p className="text-xs opacity-70 truncate">{t.location}</p>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </article>
                  ))
                )}
              </div>
            </section>
          )}

          {/* ===================== BOOKINGS ===================== */}
          {activeTab === 'bookings' && (
            <section>
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold">My bookings</h2>
                  <p className="text-sm text-emerald-900/70 mt-1">
                    Cancel pending requests. Confirmed bookings can’t be cancelled here.
                  </p>

                  {!!bookings.length && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-1 rounded-full ring-1 bg-white ring-emerald-200">
                        Total: <b>{bookingStats.total}</b>
                      </span>
                      <span className="px-2 py-1 rounded-full ring-1 bg-amber-50 ring-amber-200 text-amber-700">
                        Pending: <b>{bookingStats.pending}</b>
                      </span>
                      <span className="px-2 py-1 rounded-full ring-1 bg-emerald-50 ring-emerald-200 text-emerald-700">
                        Confirmed: <b>{bookingStats.confirmed}</b>
                      </span>
                      <span className="px-2 py-1 rounded-full ring-1 bg-rose-50 ring-rose-200 text-rose-700">
                        Cancelled: <b>{bookingStats.cancelled}</b>
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-900/50" />
                    <input
                      value={bookingSearch}
                      onChange={(e) => setBookingSearch(e.target.value)}
                      placeholder="Search bookings…"
                      className="w-full sm:w-72 h-10 rounded-full pl-9 pr-3 bg-white ring-1 ring-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={loadBookings}
                    disabled={!token || loadingBookings}
                    className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full bg-white ring-1 ring-emerald-200 hover:bg-emerald-50 disabled:opacity-60"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="mt-4 flex flex-wrap gap-2">
                <PillButton active={bookingFilter === 'all'} onClick={() => setBookingFilter('all')}>
                  All
                </PillButton>
                <PillButton
                  active={bookingFilter === 'pending'}
                  onClick={() => setBookingFilter('pending')}
                >
                  Pending
                </PillButton>
                <PillButton
                  active={bookingFilter === 'confirmed'}
                  onClick={() => setBookingFilter('confirmed')}
                >
                  Confirmed
                </PillButton>
                <PillButton
                  active={bookingFilter === 'cancelled'}
                  onClick={() => setBookingFilter('cancelled')}
                >
                  Cancelled
                </PillButton>
              </div>

              {!token ? (
                <div className="mt-4 rounded-2xl bg-white ring-1 ring-emerald-200 p-6 shadow-sm">
                  <p className="text-sm text-emerald-900/80">
                    Please{' '}
                    <Link
                      href={`/login?redirect=${encodeURIComponent('/saved')}`}
                      className="text-emerald-700 underline"
                    >
                      log in
                    </Link>{' '}
                    to see your bookings.
                  </p>
                </div>
              ) : bookingErr ? (
                <div className="mt-4 rounded-2xl bg-rose-50 ring-1 ring-rose-200 p-4 shadow-sm text-sm text-rose-700 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 mt-0.5" />
                  <div>{bookingErr}</div>
                </div>
              ) : loadingBookings ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-2xl bg-white ring-1 ring-emerald-200 shadow-sm p-4 animate-pulse"
                    >
                      <div className="h-4 w-2/3 bg-emerald-100 rounded" />
                      <div className="mt-2 h-3 w-1/3 bg-emerald-100 rounded" />
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="h-12 bg-emerald-100 rounded-xl" />
                        <div className="h-12 bg-emerald-100 rounded-xl" />
                      </div>
                      <div className="mt-3 h-9 bg-emerald-100 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : visibleBookings.length === 0 ? (
                <div className="mt-4 rounded-2xl bg-white ring-1 ring-emerald-200 p-6 shadow-sm">
                  <p className="text-sm text-emerald-900/80">
                    No bookings found{bookingFilter !== 'all' ? ` for "${bookingFilter}"` : ''}.
                  </p>
                  <p className="text-sm text-emerald-900/70 mt-2">
                    Go to{' '}
                    <Link href="/destination" className="text-emerald-700 underline">
                      Explore
                    </Link>{' '}
                    and book a trek.
                  </p>
                </div>
              ) : (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {visibleBookings.map((b) => {
                    const startDate = b.startDate
                      ? new Date(b.startDate).toLocaleDateString()
                      : '—';
                    const created = b.createdAt ? new Date(b.createdAt).toLocaleString() : '—';
                    const slug = (b.trekSlug || slugify(b.trekName)).toLowerCase();
                    const isPending = b.status === 'pending';
                    const disabling = cancelingId === b._id;

                    return (
                      <article
                        key={b._id}
                        className="rounded-2xl bg-white ring-1 ring-emerald-200 shadow-sm overflow-hidden"
                      >
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <Link
                                href={`/trails/${slug}`}
                                className="font-semibold text-emerald-900 hover:underline line-clamp-2"
                              >
                                {b.trekName}
                              </Link>
                              <p className="text-xs text-emerald-900/60 mt-1">{b.trekSlug}</p>
                            </div>
                            <StatusPill status={b.status} />
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                            <div className="rounded-xl bg-emerald-50/60 ring-1 ring-emerald-200 px-3 py-2">
                              <div className="text-xs opacity-70">Start date</div>
                              <div className="font-medium">{startDate}</div>
                            </div>
                            <div className="rounded-xl bg-emerald-50/60 ring-1 ring-emerald-200 px-3 py-2">
                              <div className="text-xs opacity-70">People</div>
                              <div className="font-medium">{b.people}</div>
                            </div>
                          </div>

                          {/* Expandable details */}
                          {(b.phone || b.note) && (
                            <details className="mt-3 group">
                              <summary className="cursor-pointer list-none select-none inline-flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-800">
                                Details
                                <ChevronDown className="w-4 h-4 transition group-open:rotate-180" />
                              </summary>
                              <div className="mt-2 rounded-xl bg-white ring-1 ring-emerald-200 px-3 py-2 text-sm">
                                {b.phone && (
                                  <p className="text-emerald-900/80">
                                    <span className="text-xs opacity-70">Phone:</span> {b.phone}
                                  </p>
                                )}
                                {b.note && (
                                  <p className="mt-1 text-emerald-900/80">
                                    <span className="text-xs opacity-70">Note:</span> {b.note}
                                  </p>
                                )}
                              </div>
                            </details>
                          )}

                          <div className="mt-3 text-xs text-emerald-900/60">Requested: {created}</div>

                          {/* Actions */}
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Link
                              href={`/trails/${slug}`}
                              className="inline-flex items-center justify-center h-10 px-4 rounded-full bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800"
                            >
                              View trek
                            </Link>

                            <button
                              type="button"
                              disabled={!isPending || disabling}
                              onClick={() => cancelBooking(b._id)}
                              className="inline-flex items-center justify-center h-10 px-4 rounded-full text-sm font-semibold
                                bg-rose-50 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100 disabled:opacity-50"
                              title={!isPending ? 'Only pending bookings can be cancelled' : 'Cancel booking'}
                            >
                              {disabling ? 'Cancelling…' : 'Cancel booking'}
                            </button>
                          </div>

                          {!isPending && b.status === 'confirmed' && (
                            <p className="mt-3 text-xs text-emerald-900/60">
                              Confirmed bookings can’t be cancelled here. Contact support if needed.
                            </p>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function EmptyState({ onStartPlan }: { onStartPlan?: () => void }) {
  return (
    <div className="mt-4 rounded-2xl bg-white ring-1 ring-emerald-200 p-6 sm:p-8 shadow-sm">
      <p className="text-emerald-900/90">
        Nothing saved yet. Browse{' '}
        <Link href="/destination" className="text-emerald-700 underline">
          Destinations
        </Link>{' '}
        and tap the bookmark to save a trek.
      </p>
      {onStartPlan && (
        <button
          type="button"
          onClick={onStartPlan}
          className="mt-3 inline-flex items-center rounded-full bg-emerald-600 text-white text-sm font-semibold px-4 py-2 hover:bg-emerald-700"
        >
          Or start a trip plan now
        </button>
      )}
    </div>
  );
}
