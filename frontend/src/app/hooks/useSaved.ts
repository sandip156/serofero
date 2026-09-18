'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { API_BASE, slugify } from '@/data/treks';

export type TripPlan = {
  id: string;
  title: string;
  start?: string;
  end?: string;
  notes?: string;
  trekIds: number[];
};

export type SavedList = {
  id: string;
  name: string;
  trekIds: number[];
};

// local storage keys
const LS_FAVS = 'serotrek.saved_treks.v1';
const LS_PLANS = 'serotrek.trip_plans.v1';
const LS_LISTS = 'serotrek.saved_lists.v1';

function rid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function uniqNums(arr: number[]) {
  return Array.from(new Set(arr));
}

function getAuthToken(): string {
  if (typeof window === 'undefined') return '';
  const t = localStorage.getItem('auth_token');
  return t && t.trim() ? t.trim() : '';
}

function authHeader(token: string) {
  const t = token.trim();
  if (!t) return '';
  return t.startsWith('Bearer ') ? t : `Bearer ${t}`;
}

/* ------------------------------
   Trek index (cached per session)
   - needed so savedIds (numbers) can map to trekSlug (string)
------------------------------ */

type TrekIndex = {
  idToSlug: Map<number, string>;
  slugToId: Map<string, number>;
};

let _trekIndexCache: TrekIndex | null = null;
let _trekIndexPromise: Promise<TrekIndex> | null = null;

async function loadTrekIndex(): Promise<TrekIndex> {
  if (_trekIndexCache) return _trekIndexCache;
  if (_trekIndexPromise) return _trekIndexPromise;

  _trekIndexPromise = (async () => {
    const res = await fetch(`${API_BASE}/treks?limit=5000`, { cache: 'no-store' });
    const data = await res.json();

    const idToSlug = new Map<number, string>();
    const slugToId = new Map<string, number>();

    if (data?.success && Array.isArray(data?.treks)) {
      for (const t of data.treks) {
        const id = Number(t?.id);
        if (!Number.isFinite(id)) continue; // backend must provide numeric id for saving
        const s = String(t?.slug || slugify(String(t?.name || '')))
          .toLowerCase()
          .trim();
        if (!s) continue;

        idToSlug.set(id, s);
        slugToId.set(s, id);
      }
    }

    const out = { idToSlug, slugToId };
    _trekIndexCache = out;
    return out;
  })();

  return _trekIndexPromise;
}

export function useSaved() {
  const router = useRouter();
  const pathname = usePathname();

  const [token, setToken] = React.useState<string>('');
  const [savedIds, setSavedIds] = React.useState<number[]>([]);
  const [plans, setPlans] = React.useState<TripPlan[]>([]);
  const [lists, setLists] = React.useState<SavedList[]>([]);
  const [index, setIndex] = React.useState<TrekIndex>({
    idToSlug: new Map(),
    slugToId: new Map(),
  });

  // hydrate local plans/lists + token + cached saved
  React.useEffect(() => {
    try {
      setPlans(JSON.parse(localStorage.getItem(LS_PLANS) || '[]'));
      setLists(JSON.parse(localStorage.getItem(LS_LISTS) || '[]'));
    } catch {}

    const t = getAuthToken();
    setToken(t);

    // show cached saved immediately (UX), but server is source of truth
    if (t) {
      try {
        const cached = JSON.parse(localStorage.getItem(LS_FAVS) || '[]');
        if (Array.isArray(cached)) setSavedIds(cached);
      } catch {}
    } else {
      setSavedIds([]);
    }
  }, []);

  // keep token in sync (login/logout in another tab)
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'auth_token') {
        setToken(getAuthToken());
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // load trek index once (cached across hook instances)
  React.useEffect(() => {
    let alive = true;

    loadTrekIndex()
      .then((idx) => {
        if (alive) setIndex(idx);
      })
      .catch(() => {
        // ignore: index empty => saving just won't sync slugs
      });

    return () => {
      alive = false;
    };
  }, []);

  // persist local-only data
  React.useEffect(() => {
    localStorage.setItem(LS_PLANS, JSON.stringify(plans));
  }, [plans]);

  React.useEffect(() => {
    localStorage.setItem(LS_LISTS, JSON.stringify(lists));
  }, [lists]);

  // persist saved cache (only for logged-in UX)
  React.useEffect(() => {
    localStorage.setItem(LS_FAVS, JSON.stringify(savedIds));
  }, [savedIds]);

  // ✅ Load server saved treks when logged in
  React.useEffect(() => {
    const t = token;
    if (!t) return;

    const ac = new AbortController();

    async function loadServerSaved() {
      try {
        const res = await fetch(`${API_BASE}/interactions/saved?limit=500`, {
          headers: { authorization: authHeader(t) },
          cache: 'no-store',
          signal: ac.signal,
        });

        const data = await res.json();
        if (!data?.success || !Array.isArray(data?.slugs)) return;

        const ids = (data.slugs as string[])
          .map((s) => String(s || '').toLowerCase().trim())
          .map((s) => index.slugToId.get(s) ?? null)
          .filter((x): x is number => typeof x === 'number');

        setSavedIds(uniqNums(ids));
      } catch {
        // ignore (keep cached)
      }
    }

    loadServerSaved();
    return () => ac.abort();
  }, [token, index.slugToId]);

  function ensureLoggedIn(): string | null {
    const t = token || getAuthToken();
    if (t) return t;

    const redirect =
      typeof window !== 'undefined'
        ? `${pathname}${window.location.search || ''}`
        : pathname;

    router.replace(`/login?redirect=${encodeURIComponent(redirect)}`);
    return null;
  }

  async function syncServerSaved(t: string, trekSlug: string, saved: boolean) {
    await fetch(`${API_BASE}/interactions/saved`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: authHeader(t),
      },
      body: JSON.stringify({ trekSlug, saved }),
    });
  }

  // ✅ favourites (login required)
  const toggleTrek = (id: number) => {
    const t = ensureLoggedIn();
    if (!t) return;

    const trekSlug = index.idToSlug.get(id);
    if (!trekSlug) return; // trek index not ready or id not found

    setSavedIds((prev) => {
      const nextSaved = !prev.includes(id);
      const next = nextSaved ? [...prev, id] : prev.filter((x) => x !== id);

      // fire & forget
      syncServerSaved(t, trekSlug, nextSaved).catch(() => {});
      return next;
    });
  };

  const isSaved = (id: number) => savedIds.includes(id);

  // plans
  const addPlan = (p: Omit<TripPlan, 'id'>) =>
    setPlans((prev) => [...prev, { ...p, id: rid('plan') }]);

  const removePlan = (id: string) =>
    setPlans((prev) => prev.filter((p) => p.id !== id));

  // lists
  const addList = (name: string, initialTrekId?: number) =>
    setLists((prev) => {
      const n: SavedList = {
        id: rid('list'),
        name: name.trim(),
        trekIds: initialTrekId ? [initialTrekId] : [],
      };
      return [...prev, n];
    });

  const addToList = (listId: string, trekId: number) =>
    setLists((prev) =>
      prev.map((l) =>
        l.id === listId && !l.trekIds.includes(trekId)
          ? { ...l, trekIds: [...l.trekIds, trekId] }
          : l
      )
    );

  const removeFromList = (listId: string, trekId: number) =>
    setLists((prev) =>
      prev.map((l) =>
        l.id === listId
          ? { ...l, trekIds: l.trekIds.filter((x) => x !== trekId) }
          : l
      )
    );

  const removeList = (listId: string) =>
    setLists((prev) => prev.filter((l) => l.id !== listId));

  return {
    savedIds,
    toggleTrek,
    isSaved,

    plans,
    addPlan,
    removePlan,

    lists,
    addList,
    addToList,
    removeFromList,
    removeList,
  };
}
