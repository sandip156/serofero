'use client';

import React from 'react';
import { Star } from 'lucide-react';

type Review = {
  id: string;
  name: string;
  rating: number; // 1-5
  text: string;
  createdAt: string; // ISO
};

function Stars({
  value,
  onChange,
  size = 22,
}: { value: number; onChange?: (v: number) => void; size?: number }) {
  const stars = [1, 2, 3, 4, 5];
  const interactive = !!onChange;
  return (
    <div className="flex items-center gap-1">
      {stars.map((s) => (
        <button
          key={s}
          type="button"
          aria-label={`${s} star`}
          onClick={interactive ? () => onChange?.(s) : undefined}
          className={interactive ? 'cursor-pointer' : 'cursor-default'}
        >
          <Star
            width={size}
            height={size}
            className={s <= value ? 'fill-emerald-500 text-emerald-500' : 'text-emerald-300'}
          />
        </button>
      ))}
    </div>
  );
}

export default function ReviewSection({ slug }: { slug: string }) {
  const storageKey = React.useMemo(() => `serotrek:reviews:${slug}`, [slug]);
  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [name, setName] = React.useState('');
  const [rating, setRating] = React.useState(0);
  const [text, setText] = React.useState('');

  // load
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setReviews(JSON.parse(raw));
    } catch {}
  }, [storageKey]);

  // persist
  React.useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(reviews));
    } catch {}
  }, [reviews, storageKey]);

  const avg =
    reviews.length === 0 ? 0 : Math.round((reviews.reduce((a, r) => a + r.rating, 0) / reviews.length) * 10) / 10;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) return alert('Please select a star rating.');
    if (text.trim().length < 5) return alert('Please write a short review.');
    const r: Review = {
      id: crypto.randomUUID(),
      name: name.trim() || 'Guest',
      rating,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    setReviews((prev) => [r, ...prev]);
    setName('');
    setRating(0);
    setText('');
  }

  return (
    <section className="mt-8">
      {/* Header / summary */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-emerald-900">Reviews</h3>
          <p className="text-sm text-emerald-700/80">
            {reviews.length === 0 ? 'No reviews yet — be the first!' : `${avg} ★ · ${reviews.length} review(s)`}
          </p>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={submit}
        className="mt-4 rounded-2xl border border-emerald-200/60 bg-emerald-50 p-4 sm:p-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
          <label className="text-sm font-medium text-emerald-900">Your rating</label>
          <Stars value={rating} onChange={setRating} />
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name (optional)"
            className="h-11 rounded-xl border border-emerald-200 bg-white px-3 text-emerald-900 placeholder-emerald-700/50 outline-none focus:ring-2 focus:ring-emerald-400/80"
          />
          <div className="sm:col-span-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Share your experience…"
              className="h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-emerald-900 placeholder-emerald-700/50 outline-none focus:ring-2 focus:ring-emerald-400/80"
            />
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            className="h-10 rounded-xl bg-emerald-600 px-4 text-white shadow hover:bg-emerald-700 active:bg-emerald-800"
          >
            Post review
          </button>
        </div>
      </form>

      {/* List */}
      <ul className="mt-5 space-y-4">
        {reviews.map((r) => (
          <li key={r.id} className="rounded-2xl border border-emerald-200/60 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 grid place-items-center text-xs font-semibold">
                  {r.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-900">{r.name}</p>
                  <p className="text-xs text-emerald-700/70">{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <Stars value={r.rating} size={18} />
            </div>
            <p className="mt-2 text-emerald-900/90">{r.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
