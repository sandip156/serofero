// frontend/src/app/book/[slug]/page.tsx
'use client';

import React, { useEffect, useState, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import NextImage from 'next/image';
import NavBar from '../../components/NavBar';
import Footer from '../../components/Footer';
import {
  API_BASE,
  getTrekBySlug,
  slugify,
  toAbsImage,
  type Trek,
} from '@/data/treks';
import { CalendarDays, Users, Phone, StickyNote, ArrowLeft } from 'lucide-react';

const FALLBACK_IMG = '/image/placeholder.jpg';

// ✅ Get today's date in YYYY-MM-DD (LOCAL time)
function getTodayYYYYMMDD() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function BookTrekPage() {
  const router = useRouter();
  const params = useParams<{ slug?: string | string[] }>();

  const slug =
    typeof params?.slug === 'string'
      ? params.slug
      : Array.isArray(params?.slug)
      ? params.slug[0]
      : undefined;

  const [trek, setTrek] = useState<Trek | null>(null);
  const [loadingTrek, setLoadingTrek] = useState(true);

  const [imgErr, setImgErr] = useState(false);
  const [token, setToken] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    startDate: '',
    people: 1,
    phone: '',
    note: '',
  });

  const today = getTodayYYYYMMDD();

  // Auth check + autofill phone from login stored contact
  useEffect(() => {
    const t =
      typeof window !== 'undefined' ? localStorage.getItem('auth_token') || '' : '';

    setToken(t);

    // Prefill phone from localStorage (saved during login)
    const savedPhone =
      typeof window !== 'undefined' ? localStorage.getItem('user_contact') || '' : '';
    if (savedPhone) {
      setForm((f) => ({ ...f, phone: savedPhone }));
    }

    if (!t && slug) {
      router.replace(`/login?redirect=${encodeURIComponent(`/book/${slug}`)}`);
    }
  }, [router, slug]);

  // Load trek dynamically from backend
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!slug) {
        setLoadingTrek(false);
        return;
      }

      try {
        setLoadingTrek(true);
        const t = await getTrekBySlug(slug);
        if (cancelled) return;
        setTrek(t);
        setImgErr(false);
      } catch {
        if (!cancelled) setTrek(null);
      } finally {
        if (!cancelled) setLoadingTrek(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!trek) {
      setMsg('Trek not found.');
      return;
    }
    if (!token) {
      setMsg('Please login to book.');
      return;
    }
    if (!form.startDate) {
      setMsg('Please select a start date.');
      return;
    }

    // Prevent past date booking
    if (form.startDate < today) {
      setMsg('Please select an upcoming date (today or later).');
      return;
    }

    // Phone required (only required, no special validation)
    const phone = form.phone.trim();
    if (!phone) {
      setMsg('Please enter your phone number.');
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          trekName: trek.name,
          trekSlug: trek.slug || slugify(trek.name),
          startDate: form.startDate,
          people: Number(form.people || 1),
          phone, 
          note: form.note,
          trekMongoId: trek._id,
          trekId: trek.id,
        }),
      });

      const data = await res.json();

      if (!data?.success) {
        setMsg(data?.message || 'Booking failed.');
        return;
      }

      setMsg('✅ Booking request sent! (status: pending)');

      // ✅ keep phone if it was auto-filled, reset others
      setForm((f) => ({ ...f, startDate: '', people: 1, note: '' }));
    } catch (err: any) {
      setMsg(err?.message || 'Booking failed.');
    } finally {
      setLoading(false);
    }
  }

  // ---------- UI states ----------
  if (!slug) {
    return (
      <div className="min-h-screen bg-emerald-50 text-slate-900 pt-16 md:pt-20">
        <NavBar />
        <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-10 py-10">
          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
            <h1 className="text-xl font-semibold">Loading…</h1>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (loadingTrek) {
    return (
      <div className="min-h-screen bg-emerald-50 text-slate-900 pt-16 md:pt-20">
        <NavBar />
        <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-10 py-10">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="mt-6 rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
            <h1 className="text-xl font-semibold">Loading trek…</h1>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!trek) {
    return (
      <div className="min-h-screen bg-emerald-50 text-slate-900 pt-16 md:pt-20">
        <NavBar />
        <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-10 py-10">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="mt-6 rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
            <h1 className="text-2xl font-bold">Trek not found</h1>
            <p className="text-slate-700 mt-2">
              The trek you’re trying to book doesn’t exist.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // safer cover logic (handles empty image too)
  const rawCover = trek.image && trek.image.trim() ? trek.image : FALLBACK_IMG;
  const trekCover = imgErr ? FALLBACK_IMG : toAbsImage(rawCover);

  return (
    <div className="min-h-screen bg-emerald-50 text-slate-900 pt-16 md:pt-20">
      <NavBar />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-10 py-8">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
          {/* Trek preview */}
          <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
            <div className="relative h-56 bg-slate-100">
              <NextImage
                src={trekCover}
                alt={trek.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 60vw"
                onError={() => setImgErr(true)}
                unoptimized // ✅ FIX: shows backend images without next.config remotePatterns
              />
            </div>

            <div className="p-5">
              <h1 className="text-2xl font-bold text-slate-900">{trek.name}</h1>
              <p className="text-slate-700 mt-1">{trek.location}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs px-2 py-1 rounded-full border border-slate-200 bg-slate-50">
                  {trek.duration}
                </span>
                <span className="text-xs px-2 py-1 rounded-full border border-slate-200 bg-slate-50">
                  {trek.distanceKm} km
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded-full border
                    ${
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

              <p className="mt-4 text-sm text-slate-700">
                Fill the form to request a booking. Admin can confirm later.
              </p>
            </div>
          </div>

          {/* Booking form */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <h2 className="text-lg font-semibold">Book this trek</h2>

            {msg && (
              <div className="mt-3 text-sm rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                {msg}
              </div>
            )}

            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">Start date</label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="date"
                    value={form.startDate}
                    min={today}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, startDate: e.target.value }))
                    }
                    className="w-full pl-10 pr-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">People</label>
                <div className="relative">
                  <Users className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={form.people}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        people: Number(e.target.value || 1),
                      }))
                    }
                    className="w-full pl-10 pr-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    value={form.phone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    placeholder="Enter phone number"
                    required
                    className="w-full pl-10 pr-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Note (optional)</label>
                <div className="relative">
                  <StickyNote className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <textarea
                    rows={4}
                    value={form.note}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, note: e.target.value }))
                    }
                    placeholder="Any special request..."
                    className="w-full pl-10 pr-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-emerald-700 text-white px-5 py-2 text-sm font-semibold hover:bg-emerald-800 disabled:opacity-60"
              >
                {loading ? 'Submitting…' : 'Submit booking request'}
              </button>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
