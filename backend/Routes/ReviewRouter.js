const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const requireAuth = require('../Middlewares/requireAuth');
const Review = require('../Models/Review');

const uploadDir = path.join(__dirname, '..', 'uploads', 'reviews');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.png', '.jpg', '.jpeg', '.webp'].includes(ext) ? ext : '.jpg';
    cb(null, `review_${Date.now()}_${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

function fileFilter(_, file, cb) {
  const ok = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.mimetype);
  cb(ok ? null : new Error('Only PNG/JPG/WEBP images are allowed'), ok);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
});

/**
 * ✅ GET /reviews/summary?slugs=everest,annapurna,...
 * Returns rating summary for many treks at once:
 * {
 *  success: true,
 *  summary: { "everest": { avgRating: 4.5, reviewCount: 10 }, ... }
 * }
 */
router.get('/summary', async (req, res) => {
  try {
    const raw = String(req.query.slugs || req.query.slug || '').trim();
    const slugs = raw
      ? raw
          .split(',')
          .map((s) => String(s).trim())
          .filter(Boolean)
      : [];

    const match = slugs.length ? { trekSlug: { $in: slugs } } : {};

    const rows = await Review.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$trekSlug',
          avgRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    const summary = {};
    for (const r of rows) {
      summary[r._id] = {
        avgRating: Number(r.avgRating || 0),
        reviewCount: Number(r.reviewCount || 0),
      };
    }

    return res.json({ success: true, summary });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load rating summary' });
  }
});

/**
 * GET /reviews/:trekSlug
 * Returns all reviews for this trek (newest first)
 */
router.get('/:trekSlug', async (req, res) => {
  try {
    const trekSlug = String(req.params.trekSlug || '').trim();
    if (!trekSlug) return res.status(400).json({ success: false, message: 'Missing trekSlug' });

    const reviews = await Review.find({ trekSlug })
      .sort({ createdAt: -1 })
      .select('_id trekSlug trekName authorName rating text photos createdAt');

    return res.json({ success: true, reviews });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load reviews' });
  }
});

/**
 * POST /reviews/:trekSlug
 * multipart/form-data:
 *  - rating (1..5)
 *  - text
 *  - trekName (optional)
 *  - photos (0..6 files) field name: "photos"
 */
router.post('/:trekSlug', requireAuth, upload.array('photos', 6), async (req, res) => {
  try {
    const trekSlug = String(req.params.trekSlug || '').trim();
    const rating = Number(req.body.rating);
    const text = String(req.body.text || '').trim();
    const trekName = String(req.body.trekName || '').trim();

    if (!trekSlug) return res.status(400).json({ success: false, message: 'Missing trekSlug' });
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be 1 to 5' });
    }
    if (!text) return res.status(400).json({ success: false, message: 'Review text is required' });

    const photos = (req.files || []).map((f) => `/uploads/reviews/${f.filename}`);

    const doc = await Review.create({
      trekSlug,
      trekName,
      user: req.user._id,
      authorName: req.user.name || 'User',
      authorEmail: req.user.email || '',
      rating,
      text,
      photos,
    });

    // ✅ Return updated summary for this trek
    const agg = await Review.aggregate([
      { $match: { trekSlug } },
      {
        $group: {
          _id: '$trekSlug',
          avgRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    const summary = agg[0]
      ? { avgRating: Number(agg[0].avgRating || 0), reviewCount: Number(agg[0].reviewCount || 0) }
      : { avgRating: rating, reviewCount: 1 };

    return res.json({
      success: true,
      review: {
        _id: doc._id,
        trekSlug: doc.trekSlug,
        trekName: doc.trekName,
        authorName: doc.authorName,
        rating: doc.rating,
        text: doc.text,
        photos: doc.photos,
        createdAt: doc.createdAt,
      },
      summary,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to post review' });
  }
});

module.exports = router;
