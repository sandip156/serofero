// frontend/src/app/admin/bookings/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import NavBar from '../../components/NavBar';
import Footer from '../../components/Footer';
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  Users,
  Phone,
  StickyNote,
  X,
  Eye,
  Loader2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8080';

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

  user?: {
    name?: string;
    email?: string;
    _id?: string;
  };
};

function authHeader(token: string) {
  const t = String(token || '').trim();
  if (!t) return '';
  return t.startsWith('Bearer ') ? t : `Bearer ${t}`;
}

function fmtDate(d?: string) {
  if (!d) return '-';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '-';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(dt);
}

function Badge({ status }: { status: Booking['status'] }) {
  const cls =
    status === 'confirmed'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : status === 'cancelled'
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : 'bg-amber-50 text-amber-700 border-amber-200';

  return (
    <span className={`text-xs px-2 py-1 rounded-full border ${cls}`}>
      {status}
    </span>
  );
}

function StatPill({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className={`rounded-2xl border bg-white px-4 py-3 flex items-center gap-3 ${className}`}>
      <div className="w-9 h-9 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
        <div className="text-lg font-semibold text-slate-900">{value}</div>
      </div>
    </div>
  );
}

export default function AdminBookingsPage() {
  const router = useRouter();

  const [token, setToken] = useState<string>('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const [msg, setMsg] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  // UI controls
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Booking['status']>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'startDate'>('recent');

  // details drawer
  const [selected, setSelected] = useState<Booking | null>(null);

  // Protect route
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const t = localStorage.getItem('auth_token') || '';
    const isAdmin = localStorage.getItem('is_admin') === '1';

    if (!t) {
      router.replace(`/login?redirect=${encodeURIComponent('/admin/bookings')}`);
      return;
    }
    if (!isAdmin) {
      router.replace('/');
      return;
    }

    setToken(t);
  }, [router]);

  async function load() {
    if (!token) return;
    setMsg(null);

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/bookings`, {
        headers: { authorization: authHeader(token) },
        cache: 'no-store',
      });
      const data = await res.json();

      if (!data?.success) {
        setMsg(data?.message || 'Failed to load bookings');
        setBookings([]);
        return;
      }

      setBookings(data.bookings || []);
    } catch (err: any) {
      setMsg(err?.message || 'Failed to load bookings');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function updateStatus(id: string, status: Booking['status']) {
    if (!token) return;

    setMsg(null);
    setSavingId(id);

    // optimistic UI
    setBookings((prev) => prev.map((b) => (b._id === id ? { ...b, status } : b)));

    try {
      const res = await fetch(`${API_BASE}/bookings/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          authorization: authHeader(token),
        },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();

      if (!data?.success) {
        setMsg(data?.message || 'Failed to update status');
        await load(); // rollback
        return;
      }

      // keep drawer in sync
      setSelected((cur) => (cur && cur._id === id ? { ...cur, status } : cur));
    } catch (err: any) {
      setMsg(err?.message || 'Failed to update status');
      await load();
    } finally {
      setSavingId(null);
    }
  }

  const stats = useMemo(() => {
    const pending = bookings.filter((b) => b.status === 'pending').length;
    const confirmed = bookings.filter((b) => b.status === 'confirmed').length;
    const cancelled = bookings.filter((b) => b.status === 'cancelled').length;
    return { pending, confirmed, cancelled, total: bookings.length };
  }, [bookings]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = [...bookings];

    if (statusFilter !== 'all') list = list.filter((b) => b.status === statusFilter);

    if (term) {
      list = list.filter((b) => {
        const user = `${b.user?.name || ''} ${b.user?.email || ''}`.toLowerCase();
        const trek = `${b.trekName} ${b.trekSlug}`.toLowerCase();
        const phone = String(b.phone || '').toLowerCase();
        const note = String(b.note || '').toLowerCase();
        return user.includes(term) || trek.includes(term) || phone.includes(term) || note.includes(term);
      });
    }

    if (sortBy === 'startDate') {
      list.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return list;
  }, [bookings, q, statusFilter, sortBy]);

  return (
    <div className="min-h-screen bg-emerald-50 text-slate-900 pt-16 md:pt-20">
      <NavBar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Admin bookings</h1>
            <p className="text-sm text-slate-700 mt-1">
              Review, confirm, or cancel trek booking requests.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatPill
            icon={<Filter className="w-4.5 h-4.5 text-slate-700" />}
            label="Total"
            value={stats.total}
            className="border-slate-200"
          />
          <StatPill
            icon={<Loader2 className="w-4.5 h-4.5 text-amber-700" />}
            label="Pending"
            value={stats.pending}
            className="border-amber-200"
          />
          <StatPill
            icon={<CheckCircle2 className="w-4.5 h-4.5 text-emerald-700" />}
            label="Confirmed"
            value={stats.confirmed}
            className="border-emerald-200"
          />
          <StatPill
            icon={<XCircle className="w-4.5 h-4.5 text-rose-700" />}
            label="Cancelled"
            value={stats.cancelled}
            className="border-rose-200"
          />
        </div>

        {/* Controls */}
        <div className="mt-5 rounded-2xl bg-white border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search user, trek, phone, note…"
              className="w-full h-10 rounded-full border border-slate-200 bg-slate-50/60 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-10 rounded-full border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              title="Filter by status"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-10 rounded-full border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              title="Sort"
            >
              <option value="recent">Sort: Recent</option>
              <option value="startDate">Sort: Start date</option>
            </select>
          </div>
        </div>

        {/* Message */}
        {msg && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm flex items-start justify-between gap-3">
            <span className="text-slate-700">{msg}</span>
            <button onClick={() => setMsg(null)} className="text-slate-500 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Table */}
        <div className="mt-5 rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="text-sm font-semibold">
              Bookings <span className="text-slate-500 font-normal">({filtered.length})</span>
            </div>
            {loading && <div className="text-xs text-slate-500">Loading…</div>}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="text-left px-4 py-3 whitespace-nowrap">User</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Trek</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Start</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">People</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Phone</th>
                  <th className="text-left px-4 py-3">Note</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="text-right px-4 py-3 whitespace-nowrap">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-slate-600" colSpan={8}>
                      No bookings match your filters.
                    </td>
                  </tr>
                )}

                {filtered.map((b) => {
                  const disabled = savingId === b._id;
                  const start = fmtDate(b.startDate);

                  return (
                    <tr key={b._id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{b.user?.name || 'User'}</div>
                        <div className="text-xs text-slate-500">{b.user?.email || ''}</div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium">{b.trekName}</div>
                        <div className="text-xs text-slate-500">{b.trekSlug}</div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">{start}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{b.people}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{b.phone || '-'}</td>

                      <td className="px-4 py-3 max-w-[22rem]">
                        <div className="text-slate-700 line-clamp-2">{b.note || '-'}</div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge status={b.status} />
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setSelected(b)}
                            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold
                              bg-white border border-slate-200 hover:bg-slate-50"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>

                          <button
                            disabled={disabled || b.status === 'confirmed'}
                            onClick={() => updateStatus(b._id, 'confirmed')}
                            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold
                              bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50"
                          >
                            {disabled && b.status === 'confirmed' ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                            Confirm
                          </button>

                          <button
                            disabled={disabled || b.status === 'cancelled'}
                            onClick={() => updateStatus(b._id, 'cancelled')}
                            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold
                              bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                          >
                            {disabled && b.status === 'cancelled' ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Details Drawer */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="fixed inset-0 bg-black/30 z-[60]"
            />
            <motion.aside
              initial={{ x: 420 }}
              animate={{ x: 0 }}
              exit={{ x: 420 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="fixed top-0 right-0 h-full w-[92vw] max-w-[420px] bg-white z-[70] shadow-2xl border-l border-slate-200"
            >
              <div className="h-16 px-4 border-b border-slate-200 flex items-center justify-between">
                <div className="font-semibold">Booking details</div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-2 rounded-full hover:bg-slate-100"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-4 overflow-y-auto h-[calc(100%-64px)]">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-slate-500">User</div>
                      <div className="font-semibold text-slate-900">{selected.user?.name || 'User'}</div>
                      <div className="text-sm text-slate-600">{selected.user?.email || ''}</div>
                    </div>
                    <Badge status={selected.status} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                  <div>
                    <div className="text-xs text-slate-500">Trek</div>
                    <div className="font-semibold">{selected.trekName}</div>
                    <div className="text-sm text-slate-600">{selected.trekSlug}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                      <div className="flex items-center gap-2 text-slate-700">
                        <Calendar className="w-4 h-4" />
                        <span className="text-xs">Start</span>
                      </div>
                      <div className="mt-1 font-semibold">{fmtDate(selected.startDate)}</div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                      <div className="flex items-center gap-2 text-slate-700">
                        <Users className="w-4 h-4" />
                        <span className="text-xs">People</span>
                      </div>
                      <div className="mt-1 font-semibold">{selected.people}</div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Phone className="w-4 h-4" />
                      <span className="text-xs">Phone</span>
                    </div>
                    <div className="mt-1 font-semibold">{selected.phone || '-'}</div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                    <div className="flex items-center gap-2 text-slate-700">
                      <StickyNote className="w-4 h-4" />
                      <span className="text-xs">Note</span>
                    </div>
                    <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                      {selected.note || '-'}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500 mb-2">Actions</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={savingId === selected._id || selected.status === 'confirmed'}
                      onClick={() => updateStatus(selected._id, 'confirmed')}
                      className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Confirm
                    </button>

                    <button
                      disabled={savingId === selected._id || selected.status === 'cancelled'}
                      onClick={() => updateStatus(selected._id, 'cancelled')}
                      className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" /> Cancel
                    </button>
                  </div>

                  <div className="mt-3 text-xs text-slate-500">
                    Created: <span className="text-slate-700">{fmtDate(selected.createdAt)}</span>
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      
    </div>
  );
}
