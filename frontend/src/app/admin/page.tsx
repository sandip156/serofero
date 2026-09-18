// frontend/src/app/admin/page.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  RefreshCw,
  Search as SearchIcon,
  Filter,
  XCircle,
  MapPin,
  Mountain,
  UploadCloud,
  X,
} from 'lucide-react';

type Trek = {
  _id: string;
  id?: number;
  slug?: string;

  name: string;
  location: string;
  duration: string;
  distanceKm: number;
  difficulty: 'Easy' | 'Moderate' | 'Hard';

  image: string; // "/uploads/treks/xxx.jpg"
  category: 'top' | 'latest' | 'near';
  description?: string;

  // ✅ new fields
  priceNPR?: number;
  latitude?: number | null;
  longitude?: number | null;

  // ignored
  rating?: number;
};

type TrekForm = {
  _id?: string;
  name: string;
  location: string;
  duration: string;
  distanceKm: string;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  category: 'top' | 'latest' | 'near';
  description: string;

  // ✅ new fields
  priceNPR: string;
  latitude: string;
  longitude: string;

  // keep existing image path while editing
  image?: string;
};

const emptyForm: TrekForm = {
  name: '',
  location: '',
  duration: '',
  distanceKm: '',
  difficulty: 'Moderate',
  category: 'top',
  description: '',

  priceNPR: '',
  latitude: '',
  longitude: '',

  image: '',
};

type SortBy = 'recent' | 'distanceAsc';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8080';

function toAbs(url: string) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE}${url}`;
}

function authHeader(token: string) {
  const t = String(token || '').trim();
  if (!t) return '';
  return t.startsWith('Bearer ') ? t : `Bearer ${t}`;
}

function fmtNpr(n?: number) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return `NPR ${n.toLocaleString('en-US')}`;
}

export default function AdminPage() {
  const router = useRouter();

  const [treks, setTreks] = useState<Trek[]>([]);
  const [form, setForm] = useState<TrekForm>(emptyForm);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(''); // blob preview

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'top' | 'latest' | 'near'>('all');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Protect route
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('auth_token');
    const isAdmin = localStorage.getItem('is_admin') === '1';

    if (!token) {
      router.replace('/login?redirect=/admin');
      return;
    }
    if (!isAdmin) {
      router.replace('/');
      return;
    }

    loadTreks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // cleanup blob preview
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  async function loadTreks() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_BASE}/treks`, { cache: 'no-store' });
      const data = await res.json();

      if (!data?.success) {
        setError(data?.message || 'Failed to load treks');
        return;
      }

      setTreks(data.treks || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load treks');
    } finally {
      setLoading(false);
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function onPickImage(file: File | null) {
    setImageFile(file);
    setStatus(null);
    setError(null);

    if (imagePreview) URL.revokeObjectURL(imagePreview);

    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      setImagePreview('');
    }
  }

  function startCreate() {
    setForm(emptyForm);
    setSelectedId(null);
    setStatus(null);
    setError(null);
    onPickImage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startEdit(trek: Trek) {
    setForm({
      _id: trek._id,
      name: trek.name,
      location: trek.location,
      duration: trek.duration,
      distanceKm: String(trek.distanceKm),
      difficulty: trek.difficulty,
      category: trek.category,
      description: trek.description || '',
      image: trek.image || '',

      // ✅ new fields
      priceNPR: trek.priceNPR != null ? String(trek.priceNPR) : '',
      latitude: trek.latitude != null ? String(trek.latitude) : '',
      longitude: trek.longitude != null ? String(trek.longitude) : '',
    });

    setSelectedId(trek._id);
    setStatus(null);
    setError(null);
    onPickImage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    setError(null);

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') || '' : '';
    const auth = authHeader(token);

    const fd = new FormData();
    fd.append('name', form.name.trim());
    fd.append('location', form.location.trim());
    fd.append('duration', form.duration.trim());
    fd.append('distanceKm', String(Number(form.distanceKm)));
    fd.append('difficulty', form.difficulty);
    fd.append('category', form.category);
    fd.append('description', form.description.trim());

    // ✅ new fields
    fd.append('priceNPR', form.priceNPR.trim());      // "" => backend makes 0
    fd.append('latitude', form.latitude.trim());      // "" => backend clears
    fd.append('longitude', form.longitude.trim());    // "" => backend clears

    const isEdit = !!form._id;

    // Create needs image
    if (!isEdit && !imageFile) {
      setSaving(false);
      setError('Please upload an image.');
      return;
    }

    if (imageFile) fd.append('image', imageFile);

    const url = isEdit ? `${API_BASE}/treks/${form._id}` : `${API_BASE}/treks`;

    try {
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          ...(auth ? { authorization: auth } : {}),
        },
        body: fd,
      });

      const data = await res.json();
      if (!data?.success) {
        setError(data?.message || 'Save failed');
        return;
      }

      setStatus(isEdit ? 'Trek updated successfully' : 'Trek created successfully');
      setForm(emptyForm);
      setSelectedId(null);
      onPickImage(null);
      loadTreks();
    } catch (err: any) {
      setError(err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this trek?')) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') || '' : '';
    const auth = authHeader(token);

    try {
      const res = await fetch(`${API_BASE}/treks/${id}`, {
        method: 'DELETE',
        headers: { ...(auth ? { authorization: auth } : {}) },
      });

      const data = await res.json();
      if (!data?.success) {
        alert(data?.message || 'Delete failed');
        return;
      }

      setTreks((prev) => prev.filter((t) => t._id !== id));
      if (selectedId === id) startCreate();
    } catch (err: any) {
      alert(err?.message || 'Delete failed');
    }
  }

  const stats = useMemo(() => {
    if (!treks.length) return { total: 0, totalDistance: 0 };
    const totalDistance = treks.reduce((sum, t) => sum + (t.distanceKm || 0), 0);
    return { total: treks.length, totalDistance: Math.round(totalDistance) };
  }, [treks]);

  const filteredTreks = useMemo(() => {
    let list = [...treks];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) => t.name.toLowerCase().includes(q) || t.location.toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== 'all') {
      list = list.filter((t) => t.category === categoryFilter);
    }

    if (sortBy === 'distanceAsc') {
      list.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
    }

    return list;
  }, [treks, search, categoryFilter, sortBy]);

  const categoryLabel = (c: Trek['category']) =>
    c === 'top' ? 'Top' : c === 'latest' ? 'Latest' : 'Near';

  const previewSrc = imagePreview || (form.image ? toAbs(form.image) : '');

  const dropPick = (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    onPickImage(file);
  };

  return (
    <div className="min-h-screen bg-emerald-50 text-slate-900 pt-16 md:pt-20">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Mountain className="w-7 h-7 text-emerald-700" />
              Admin — Treks
            </h1>
            <p className="text-sm text-slate-600">
              Create, update, and remove trekking routes for SeroTrek.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadTreks}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex items-center justify-center rounded-full bg-emerald-700 text-white px-4 py-2 text-sm font-semibold hover:bg-emerald-800"
            >
              <Plus className="w-4 h-4 mr-1" />
              New Trek
            </button>
          </div>
        </header>

        {/* Quick stats */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white border border-slate-200 p-3 sm:p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
              <Mountain className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Total treks</p>
              <p className="text-lg font-semibold">{stats.total}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-3 sm:p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Total distance</p>
              <p className="text-lg font-semibold">
                {stats.totalDistance} <span className="text-xs">km</span>
              </p>
            </div>
          </div>
        </section>

        {/* Status / errors */}
        {(status || error) && (
          <section
            className={`rounded-2xl px-4 py-3 text-sm flex items-center justify-between gap-3 ${
              error
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            <span className="flex items-center gap-2">
              {error && <XCircle className="w-4 h-4 text-rose-500" />}
              {error || status}
            </span>
            <button
              onClick={() => {
                setStatus(null);
                setError(null);
              }}
              className="text-xs underline"
            >
              Dismiss
            </button>
          </section>
        )}

        {/* Form */}
        <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-semibold">{form._id ? 'Edit Trek' : 'New Trek'}</h2>
            {form._id && (
              <span className="text-xs rounded-full bg-emerald-50 text-emerald-700 px-2 py-1 border border-emerald-100">
                Editing existing trek
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)]">
              {/* Left */}
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Location</label>
                    <input
                      name="location"
                      value={form.location}
                      onChange={handleChange}
                      required
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Duration</label>
                    <input
                      name="duration"
                      value={form.duration}
                      onChange={handleChange}
                      placeholder="e.g. 7 days"
                      required
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Distance (km)</label>
                    <input
                      name="distanceKm"
                      type="number"
                      step="0.1"
                      value={form.distanceKm}
                      onChange={handleChange}
                      required
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Difficulty</label>
                    <select
                      name="difficulty"
                      value={form.difficulty}
                      onChange={handleChange}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Moderate">Moderate</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                      <option value="top">Top (shows in Top recommendations)</option>
                      <option value="latest">Latest</option>
                      <option value="near">Near</option>
                    </select>
                  </div>

                  {/* ✅ Price */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Price (NPR)</label>
                    <input
                      name="priceNPR"
                      type="number"
                      min={0}
                      step="100"
                      value={form.priceNPR}
                      onChange={handleChange}
                      placeholder="e.g. 25000"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* ✅ Coordinates */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Latitude</label>
                      <input
                        name="latitude"
                        type="number"
                        step="0.000001"
                        value={form.latitude}
                        onChange={handleChange}
                        placeholder="27.7172"
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Longitude</label>
                      <input
                        name="longitude"
                        type="number"
                        step="0.000001"
                        value={form.longitude}
                        onChange={handleChange}
                        placeholder="85.3240"
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Right: upload + preview (interactive) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium">
                    Trek image {form._id ? '(optional to replace)' : '(required)'}
                  </label>

                  {imageFile && (
                    <button
                      type="button"
                      onClick={() => onPickImage(null)}
                      className="text-xs inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1 hover:bg-slate-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>

                {/* Hidden input */}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => dropPick(e.target.files?.[0] || null)}
                  className="hidden"
                />

                {/* Dropzone */}
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOver(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOver(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOver(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) dropPick(f);
                  }}
                  className={`cursor-pointer rounded-2xl border-2 border-dashed p-4 transition ${
                    dragOver
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                      <UploadCloud className="w-5 h-5 text-slate-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        {imageFile ? 'Image selected' : 'Click or drag an image here'}
                      </p>
                      <p className="text-xs text-slate-600">
                        {imageFile
                          ? `${imageFile.name} • ${Math.round(imageFile.size / 1024)} KB`
                          : 'PNG, JPG, WEBP up to ~6MB'}
                      </p>
                    </div>
                  </div>

                  {!form._id && !imageFile && (
                    <p className="mt-2 text-xs text-rose-600">
                      Please upload an image for new trek.
                    </p>
                  )}
                </div>

                {/* Preview */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 overflow-hidden text-xs">
                  <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                    <span className="font-medium text-slate-700">Image preview</span>
                    <span className="text-[11px] text-slate-500">
                      {imageFile ? imageFile.name : form.image ? 'current' : 'none'}
                    </span>
                  </div>

                  <div className="h-44 bg-slate-100 flex items-center justify-center">
                    {previewSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewSrc}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/image/placeholder.jpg';
                        }}
                      />
                    ) : (
                      <span className="text-slate-400">Pick an image to preview</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-full bg-emerald-700 text-white px-5 py-2 text-sm font-semibold hover:bg-emerald-800 disabled:opacity-60"
              >
                {saving ? 'Saving…' : form._id ? 'Update Trek' : 'Create Trek'}
              </button>

              {form._id && (
                <button
                  type="button"
                  onClick={startCreate}
                  className="text-sm text-slate-600 hover:underline"
                >
                  Cancel edit
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Treks list */}
        <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold">Existing Treks</h2>

            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative">
                <SearchIcon className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name or location…"
                  className="pl-8 pr-3 py-1.5 text-sm rounded-full border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/60"
                />
              </div>

              <div className="flex items-center gap-1">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as any)}
                  className="text-sm rounded-full border border-slate-200 px-2 py-1.5 bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All categories</option>
                  <option value="top">Top</option>
                  <option value="latest">Latest</option>
                  <option value="near">Near</option>
                </select>
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="text-sm rounded-full border border-slate-200 px-2 py-1.5 bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="recent">Sort: Recent</option>
                <option value="distanceAsc">Sort: Distance (short → long)</option>
              </select>
            </div>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-3 py-2 border-b">Name</th>
                  <th className="px-3 py-2 border-b">Location</th>
                  <th className="px-3 py-2 border-b">Duration</th>
                  <th className="px-3 py-2 border-b">Distance</th>
                  <th className="px-3 py-2 border-b">Price</th>
                  <th className="px-3 py-2 border-b">Coords</th>
                  <th className="px-3 py-2 border-b">Diff</th>
                  <th className="px-3 py-2 border-b">Category</th>
                  <th className="px-3 py-2 border-b text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTreks.map((t) => (
                  <tr
                    key={t._id}
                    className={`border-b last:border-b-0 ${selectedId === t._id ? 'bg-emerald-50/50' : ''}`}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="hidden lg:block w-10 h-10 rounded-md overflow-hidden bg-slate-200 flex-shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={toAbs(t.image)}
                            alt={t.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = '/image/placeholder.jpg';
                            }}
                          />
                        </div>
                        <span className="font-medium">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">{t.location}</td>
                    <td className="px-3 py-2">{t.duration}</td>
                    <td className="px-3 py-2">{t.distanceKm} km</td>
                    <td className="px-3 py-2">{fmtNpr(t.priceNPR)}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {typeof t.latitude === 'number' && typeof t.longitude === 'number'
                        ? `${t.latitude.toFixed(4)}, ${t.longitude.toFixed(4)}`
                        : '—'}
                    </td>
                    <td className="px-3 py-2">{t.difficulty}</td>
                    <td className="px-3 py-2">
                      <span className="text-[11px] px-2 py-0.5 rounded-full border border-slate-200 bg-white">
                        {categoryLabel(t.category)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right space-x-2">
                      <button
                        onClick={() => startEdit(t)}
                        className="text-xs px-3 py-1 rounded-full border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(t._id)}
                        className="text-xs px-3 py-1 rounded-full border border-rose-200 text-rose-700 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredTreks.length === 0 && !loading && (
                  <tr>
                    <td colSpan={9} className="px-3 py-4 text-center text-slate-500">
                      No treks match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {loading && <p className="text-xs text-slate-500 mt-2">Loading treks from server…</p>}
        </section>
      </main>
    </div>
  );
}
