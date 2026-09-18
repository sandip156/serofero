// frontend/src/app/components/SearchBar.tsx
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import { API_BASE, slugify, toAbsImage, type Trek } from '@/data/treks';

type SuggestTrek = Pick<Trek, 'id' | 'name' | 'location' | 'image' | 'slug'>;

type Props = {
  variant?: 'hero' | 'nav';
  className?: string;
  onNavigate?: () => void; // useful for closing mobile menu
  placeholder?: string;
};

function useDebounced<T>(value: T, delay = 280) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const id = window.setTimeout(() => setV(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return v;
}

export default function SearchBar({
  variant = 'hero',
  className,
  onNavigate,
  placeholder,
}: Props) {
  const router = useRouter();

  const [q, setQ] = React.useState('');
  const debounced = useDebounced(q, 280);

  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState<SuggestTrek[]>([]);
  const [activeIdx, setActiveIdx] = React.useState(-1);

  const wrapRef = React.useRef<HTMLDivElement | null>(null);

  // close on outside click
  React.useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIdx(-1);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // live backend suggestions
  React.useEffect(() => {
    const term = debounced.trim();
    if (term.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }

    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);

        const url = new URL(`${API_BASE}/treks`);
        url.searchParams.set('search', term);
        url.searchParams.set('limit', '8');

        const res = await fetch(url.toString(), {
          cache: 'no-store',
          signal: ac.signal,
        });

        const data = await res.json();
        if (!data?.success) {
          setItems([]);
          return;
        }

        const list = (data.treks || [])
          .map((t: any) => ({
            id: Number(t.id),
            name: String(t.name || ''),
            location: String(t.location || ''),
            image: String(t.image || ''),
            slug: String(t.slug || slugify(t.name || '')),
          }))
          .filter((t: any) => Number.isFinite(t.id) && t.name) as SuggestTrek[];

        setItems(list);
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [debounced]);

  const goSearch = (term: string) => {
    const t = term.trim();
    router.push(`/destination${t ? `?q=${encodeURIComponent(t)}` : ''}`);
    setOpen(false);
    setActiveIdx(-1);
    onNavigate?.();
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    goSearch(q);
  };

  // ✅ FIXED: details page is /trails/[slug] in your project
  const openTrek = (t: SuggestTrek) => {
    const s = (t.slug || slugify(t.name)).toLowerCase();
    router.push(`/trails/${encodeURIComponent(s)}`);
    setOpen(false);
    setActiveIdx(-1);
    onNavigate?.();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((p) => Math.min(items.length - 1, p + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((p) => Math.max(-1, p - 1));
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && items[activeIdx]) {
        e.preventDefault();
        openTrek(items[activeIdx]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIdx(-1);
    }
  };

  const isNav = variant === 'nav';

  return (
    <div ref={wrapRef} className={className ?? 'w-full flex justify-center'}>
      <form role="search" onSubmit={onSubmit} className="relative w-full">
        <Search
          aria-hidden
          className={[
            'absolute top-1/2 -translate-y-1/2 z-10 pointer-events-none',
            isNav ? 'left-3 w-4 h-4 text-emerald-700/70' : 'left-5 w-5 h-5 md:w-6 md:h-6 text-emerald-700/70',
          ].join(' ')}
        />

        <input
          type="text"
          value={q}
          onChange={(e) => {
            const v = e.target.value;
            setQ(v);
            setOpen(true);
            setActiveIdx(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder ?? (isNav ? 'Search trails…' : 'Search by city, region, or trail name')}
          aria-label="Search"
          className={[
            'w-full rounded-full bg-white/95 backdrop-blur-sm text-gray-900 placeholder-gray-500',
            'shadow-sm ring-1 ring-emerald-200 hover:ring-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition',
            isNav ? 'h-9 pl-9 pr-10 text-sm' : 'h-14 md:h-16 pl-14 pr-12',
          ].join(' ')}
        />

        <div className={['absolute right-3 top-1/2 -translate-y-1/2', isNav ? 'right-3' : 'right-4'].join(' ')}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin text-emerald-700/70" /> : null}
        </div>

        {open && (items.length > 0 || (!loading && debounced.trim().length >= 2)) && (
          <div className="absolute left-0 right-0 mt-2 rounded-2xl border border-emerald-100 bg-white shadow-xl overflow-hidden z-50">
            {items.length > 0 ? (
              <div className="py-2">
                {items.map((t, idx) => (
                  <button
                    key={`${t.id}-${t.slug}-${idx}`}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => openTrek(t)}
                    className={[
                      'w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-emerald-50/60',
                      idx === activeIdx ? 'bg-emerald-50/60' : '',
                    ].join(' ')}
                  >
                    <div className="h-10 w-10 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex-none">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={toAbsImage(t.image) || '/image/placeholder.jpg'}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{t.name}</div>
                      <div className="text-xs text-slate-600 truncate">{t.location}</div>
                    </div>
                  </button>
                ))}

                <div className="px-4 pt-2 pb-3">
                  <button
                    type="button"
                    onClick={() => goSearch(q)}
                    className="w-full h-10 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                  >
                    View all results
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-4 py-4 text-sm text-slate-600">No results. Try another keyword.</div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
