// backend/Routes/RecommendationRouter.js
const router = require('express').Router();

const requireAuth = require('../Middlewares/requireAuth');
const Review = require('../Models/Review');

function getUserId(req) {
  return String(req.user?._id || req.user?.id || '').trim() || null;
}

function normSlug(s) {
  return String(s || '').trim().toLowerCase();
}

/**
 * Cosine similarity between two sparse vectors (Map<string, number>)
 * Also enforces minOverlap to reduce noisy similarity.
 */
function cosineSim(aMap, bMap, minOverlap = 2) {
  if (!aMap?.size || !bMap?.size) return 0;

  // norms
  let a2 = 0;
  let b2 = 0;
  for (const v of aMap.values()) a2 += v * v;
  for (const v of bMap.values()) b2 += v * v;
  if (a2 === 0 || b2 === 0) return 0;

  // iterate smaller map for dot + overlap count
  const [small, big] = aMap.size <= bMap.size ? [aMap, bMap] : [bMap, aMap];

  let dot = 0;
  let overlap = 0;

  for (const [k, v] of small.entries()) {
    if (!big.has(k)) continue;
    const bv = big.get(k);
    dot += v * bv;
    overlap += 1;
  }

  if (overlap < minOverlap) return 0;

  return dot / (Math.sqrt(a2) * Math.sqrt(b2));
}

/**
 * Popular fallback based on ratings:
 * score = avgRating * log(1 + reviewCount)
 */
async function popularFallback(limit, excludeSet = new Set()) {
  const pop = await Review.aggregate([
    { $match: { rating: { $gte: 1, $lte: 5 } } },
    {
      $group: {
        _id: '$trekSlug',
        avgRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  return pop
    .map((x) => ({
      slug: normSlug(x._id),
      score: Number(x.avgRating || 0) * Math.log(1 + Number(x.reviewCount || 0)),
    }))
    .filter((x) => x.slug && !excludeSet.has(x.slug))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.slug);
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const limit = Math.max(1, Math.min(50, Number(req.query.limit || 12)));
    const MIN_OVERLAP = 2; // minimum common rated treks to consider similarity
    const MAX_NEIGHBORS = 80;

    /**
     * 1) Per-user per-trek average rating (handles duplicates)
     */
    const rows = await Review.aggregate([
      { $match: { rating: { $gte: 1, $lte: 5 } } },
      {
        $group: {
          _id: { user: '$user', trekSlug: '$trekSlug' },
          rating: { $avg: '$rating' },
        },
      },
    ]);

    /**
     * 2) Build raw vectors + user means
     */
    const rawVec = new Map(); // userId -> Map(slug -> rating)
    const stats = new Map(); // userId -> { sum, count }

    for (const r of rows) {
      const uid = String(r._id.user);
      const slug = normSlug(r._id.trekSlug);
      const rating = Number(r.rating || 0);

      if (!uid || !slug || !Number.isFinite(rating) || rating <= 0) continue;

      if (!rawVec.has(uid)) rawVec.set(uid, new Map());
      rawVec.get(uid).set(slug, rating);

      const st = stats.get(uid) || { sum: 0, count: 0 };
      st.sum += rating;
      st.count += 1;
      stats.set(uid, st);
    }

    const targetRaw = rawVec.get(userId) || new Map();

    /**
     * If user has no rating history -> popular fallback
     */
    if (targetRaw.size === 0) {
      const slugs = await popularFallback(limit);
      return res.json({ success: true, slugs, source: 'popular_ratings_fallback' });
    }

    /**
     * 3) Mean-center each user's ratings: centered = rating - userMean
     */
    const userMean = (uid) => {
      const st = stats.get(uid);
      if (!st || !st.count) return 0;
      return st.sum / st.count;
    };

    const centeredVec = new Map(); // userId -> Map(slug -> centeredRating)
    for (const [uid, m] of rawVec.entries()) {
      const mean = userMean(uid);
      const cm = new Map();
      for (const [slug, rating] of m.entries()) {
        cm.set(slug, Number(rating) - mean);
      }
      centeredVec.set(uid, cm);
    }

    const target = centeredVec.get(userId) || new Map();
    const seen = new Set(targetRaw.keys()); // exclude already rated treks

    /**
     * 4) Similarities to other users
     */
    const sims = [];
    for (const [otherId, otherVec] of centeredVec.entries()) {
      if (otherId === userId) continue;
      const sim = cosineSim(target, otherVec, MIN_OVERLAP);
      if (sim !== 0) sims.push([otherId, sim]);
    }

    // If no neighbors -> popular fallback (excluding already rated)
    if (sims.length === 0) {
      const slugs = await popularFallback(limit, seen);
      return res.json({ success: true, slugs, source: 'popular_no_neighbors_fallback' });
    }

    sims.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    const neighbors = sims.slice(0, MAX_NEIGHBORS);

    /**
     * 5) Predict scores for unseen treks:
     * pred = targetMean + ( Σ sim * centeredOther ) / Σ |sim|
     * For ranking, targetMean is constant so we use numerator/denominator,
     * but we still compute full pred for clarity.
     */
    const targetMean = userMean(userId);

    const numer = new Map(); // slug -> Σ sim * centeredOther
    const denom = new Map(); // slug -> Σ |sim|

    for (const [otherId, sim] of neighbors) {
      const otherCentered = centeredVec.get(otherId);
      if (!otherCentered) continue;

      for (const [slug, centeredRating] of otherCentered.entries()) {
        if (seen.has(slug)) continue; // don't recommend what user already rated

        numer.set(slug, (numer.get(slug) || 0) + sim * centeredRating);
        denom.set(slug, (denom.get(slug) || 0) + Math.abs(sim));
      }
    }

    const scored = [];
    for (const [slug, n] of numer.entries()) {
      const d = denom.get(slug) || 0;
      if (d <= 0) continue;
      const pred = targetMean + n / d;

      // small clamp (optional) so weird predictions don't explode
      const safePred = Math.max(1, Math.min(5, pred));
      scored.push([slug, safePred]);
    }

    scored.sort((a, b) => b[1] - a[1]);
    let ranked = scored.map(([slug]) => slug);

    /**
     * 6) Backfill with popular-by-ratings if still not enough
     */
    if (ranked.length < limit) {
      const extra = await popularFallback(limit * 2, new Set([...seen, ...ranked]));
      ranked = ranked.concat(extra);
    }

    return res.json({
      success: true,
      slugs: ranked.slice(0, limit),
      source: 'ratings_collaborative_filtering',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to generate recommendations' });
  }
});

module.exports = router;



// // backend/Routes/RecommendationRouter.js
// const router = require('express').Router();

// const requireAuth = require('../Middlewares/requireAuth');
// const Interaction = require('../Models/Interaction');
// const Booking = require('../Models/Booking');

// function getUserId(req) {
//   return (
//     req.user?.id ||
//     req.user?._id ||
//     req.userId ||
//     req.user_id ||
//     req.user?.userId ||
//     null
//   );
// }

// function cosineSim(aMap, bMap) {
//   // aMap: Map<string, number>, bMap: Map<string, number>
//   let dot = 0;
//   let a2 = 0;
//   let b2 = 0;

//   for (const v of aMap.values()) a2 += v * v;
//   for (const v of bMap.values()) b2 += v * v;

//   if (a2 === 0 || b2 === 0) return 0;

//   // iterate smaller map for dot
//   const [small, big] =
//     aMap.size <= bMap.size ? [aMap, bMap] : [bMap, aMap];

//   for (const [k, v] of small.entries()) {
//     const bv = big.get(k);
//     if (bv) dot += v * bv;
//   }

//   return dot / (Math.sqrt(a2) * Math.sqrt(b2));
// }

// router.get('/', requireAuth, async (req, res) => {
//   try {
//     const userId = getUserId(req);
//     if (!userId) {
//       return res.status(401).json({ success: false, message: 'Unauthorized' });
//     }

//     const limit = Math.max(1, Math.min(50, Number(req.query.limit || 12)));

//     // 1) Load all active saves + all bookings
//     const [saves, bookings] = await Promise.all([
//       Interaction.find({ kind: 'save', active: true })
//         .select('user trekSlug')
//         .lean(),
//       Booking.find({ status: { $ne: 'cancelled' } })
//         .select('user trekSlug')
//         .lean(),
//     ]);

//     // 2) Build user -> Map(trekSlug -> weight)
//     const userVec = new Map(); // userId -> Map
//     const add = (uid, slug, w) => {
//       const key = String(uid);
//       if (!userVec.has(key)) userVec.set(key, new Map());
//       const m = userVec.get(key);
//       m.set(slug, (m.get(slug) || 0) + w);
//     };

//     for (const s of saves) add(s.user, s.trekSlug, 1);      // save weight
//     for (const b of bookings) add(b.user, b.trekSlug, 3);   // booking weight

//     const targetKey = String(userId);
//     const target = userVec.get(targetKey) || new Map();

//     // If user has no history -> fallback popular
//     if (target.size === 0) {
//       const popular = new Map(); // slug -> score
//       for (const s of saves) popular.set(s.trekSlug, (popular.get(s.trekSlug) || 0) + 1);
//       for (const b of bookings) popular.set(b.trekSlug, (popular.get(b.trekSlug) || 0) + 3);

//       const slugs = [...popular.entries()]
//         .sort((a, b) => b[1] - a[1])
//         .slice(0, limit)
//         .map(([slug]) => slug);

//       return res.json({ success: true, slugs, source: 'popular_fallback' });
//     }

//     // 3) Similarity with other users
//     const sims = [];
//     for (const [otherId, otherVec] of userVec.entries()) {
//       if (otherId === targetKey) continue;
//       const sim = cosineSim(target, otherVec);
//       if (sim > 0) sims.push([otherId, sim]);
//     }

//     // 4) Score unseen treks
//     const scores = new Map(); // slug -> score
//     const seen = new Set(target.keys());

//     for (const [otherId, sim] of sims.sort((a, b) => b[1] - a[1]).slice(0, 50)) {
//       const otherVec = userVec.get(otherId);
//       for (const [slug, w] of otherVec.entries()) {
//         if (seen.has(slug)) continue;
//         scores.set(slug, (scores.get(slug) || 0) + sim * w);
//       }
//     }

//     // 5) If not enough, backfill with popular
//     const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);

//     if (ranked.length < limit) {
//       const popular = new Map();
//       for (const s of saves) popular.set(s.trekSlug, (popular.get(s.trekSlug) || 0) + 1);
//       for (const b of bookings) popular.set(b.trekSlug, (popular.get(b.trekSlug) || 0) + 3);

//       const extra = [...popular.entries()]
//         .sort((a, b) => b[1] - a[1])
//         .map(([slug]) => slug)
//         .filter((slug) => !seen.has(slug) && !ranked.includes(slug));

//       ranked.push(...extra);
//     }

//     const slugs = ranked.slice(0, limit);

//     return res.json({ success: true, slugs, source: 'collaborative_filtering' });
//   } catch (err) {
//     return res
//       .status(500)
//       .json({ success: false, message: 'Failed to generate recommendations' });
//   }
// });

// module.exports = router;
