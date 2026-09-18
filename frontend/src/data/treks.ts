// frontend/src/data/treks.ts

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8080';

export type Trek = {
  _id: string; // mongo id
  id: number; // numeric id (used by saved/favourites)
  slug?: string;

  name: string;
  location: string;
  duration: string;
  distanceKm: number;
  difficulty: 'Easy' | 'Moderate' | 'Hard';

  category: 'top' | 'latest' | 'near';
  image: string; // "/uploads/..." OR "/image/..." OR full URL

  description?: string;

  // ✅ pricing (backend uses priceNPR)
  priceNPR?: number;
  // keep these if some older data uses them
  priceNpr?: number;
  price?: number;
  cost?: number;

  // ✅ coordinates
  latitude?: number | null;
  longitude?: number | null;

  // ✅ Optional GeoJSON
  geo?: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };

  rating?: number;
};

export const FALLBACK_IMG = '/image/placeholder.jpg';

/**
 * Optional gallery images from /public/image/trails/
 * If you don't have these files, it's okay — they will fallback to placeholder via SafeImg.
 */
export const galleryCandidates = (slug: string) => [
  `/image/trails/${slug}-1.jpg`,
  `/image/trails/${slug}-2.jpg`,
  `/image/trails/${slug}-3.jpg`,
  `/image/trails/${slug}-4.jpg`,
];

export function slugify(s: string) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Convert stored image path to absolute URL if needed
export function toAbsImage(src: string) {
  if (!src) return '';
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  if (src.startsWith('/uploads/')) return `${API_BASE}${src}`;
  return src; // e.g. "/image/..." from Next public/
}

export async function getTreks(opts?: { limit?: number; category?: string }) {
  const qs = new URLSearchParams();
  if (opts?.limit) qs.set('limit', String(opts.limit));
  if (opts?.category) qs.set('category', String(opts.category));

  const url = `${API_BASE}/treks${qs.toString() ? `?${qs.toString()}` : ''}`;

  const res = await fetch(url, { cache: 'no-store' });
  const data = await res.json();

  if (!data?.success) throw new Error(data?.message || 'Failed to load treks');
  return (data.treks || []) as Trek[];
}

/**
 * Robust trek-by-slug getter:
 * Prefer backend route: GET /treks/slug/:slug -> { success, trek }
 */
export async function getTrekBySlug(slug: string) {
  const s = String(slug || '').toLowerCase().trim();
  if (!s) return null;

  const tryUrls = [
    `${API_BASE}/treks/slug/${encodeURIComponent(s)}`,
    `${API_BASE}/treks/by-slug/${encodeURIComponent(s)}`,
    `${API_BASE}/treks?slug=${encodeURIComponent(s)}`,
  ];

  for (const url of tryUrls) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();

      if (!data?.success) continue;

      if (data.trek) return data.trek as Trek;
      if (Array.isArray(data.treks) && data.treks[0]) return data.treks[0] as Trek;
      if (data._id) return data as Trek;
    } catch {
      // try next
    }
  }

  // last-resort fallback: fetch all and find
  try {
    const all = await getTreks({ limit: 5000 });
    const found =
      all.find((t) => (t.slug || slugify(t.name)).toLowerCase() === s) || null;
    return found;
  } catch {
    return null;
  }
}
