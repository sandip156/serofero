// backend/Routes/TreksRouter.js
const router = require('express').Router();
const Trek = require('../Models/Trek');
const ensureAdmin = require('../Middlewares/Admin');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

function slugify(s = '') {
  return String(s)
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

//multer
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'treks');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
    const name = `trek_${Date.now()}_${Math.random().toString(16).slice(2)}${safeExt}`;
    cb(null, name);
  },
});

function fileFilter(_, file, cb) {
  const ok = /^image\/(jpeg|png|webp|jpg)$/.test(file.mimetype);
  cb(ok ? null : new Error('Only image files allowed (jpg/png/webp)'), ok);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 6 * 1024 * 1024 }, // 6MB
});

// helper: generate numeric id
async function nextNumericId() {
  const last = await Trek.findOne({}, { id: 1 }).sort({ id: -1 }).lean();
  return (last?.id || 100) + 1;
}


function parseOptionalNumber(v, fieldName) {
  if (v === undefined) return { provided: false, value: undefined };
  if (v === null) return { provided: true, value: null };
  if (typeof v === 'string' && v.trim() === '') return { provided: true, value: null };

  const n = Number(v);
  if (!Number.isFinite(n)) return { provided: true, error: `${fieldName} must be a valid number` };
  return { provided: true, value: n };
}

function validateLatLng(lat, lng) {
  if (typeof lat === 'number' && (lat < -90 || lat > 90)) return 'latitude must be between -90 and 90';
  if (typeof lng === 'number' && (lng < -180 || lng > 180)) return 'longitude must be between -180 and 180';
  return null;
}

/**
 * GET /treks
 * Supports:
 *  - ?category=top|latest|near
 *  - ?search=abc   
 *  - ?limit=12
 */
router.get('/', async (req, res) => {
  try {
    const { category, search, q, limit } = req.query;

    const term = String(search || q || '').trim();

    const query = {};
    if (category && ['top', 'latest', 'near'].includes(String(category))) {
      query.category = String(category);
    }

    if (term) {
      // escape regex special chars to avoid regex errors on input like "a+b"
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { location: { $regex: escaped, $options: 'i' } },
        { slug: { $regex: escaped, $options: 'i' } },
      ];
    }

    const lim = Math.min(Number(limit || 0) || 0, 200) || 0;

    const treks = await Trek.find(query)
      .sort({ createdAt: -1 })
      .limit(lim)
      .lean();

    res.json({ success: true, treks });
  } catch (err) {
    console.error('GET /treks error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * GET /treks/slug/:slug
 */
router.get('/slug/:slug', async (req, res) => {
  try {
    const slug = String(req.params.slug || '').toLowerCase().trim();
    const trek = await Trek.findOne({ slug }).lean();

    if (!trek) return res.status(404).json({ success: false, message: 'Trek not found' });

    res.json({ success: true, trek });
  } catch (err) {
    console.error('GET /treks/slug/:slug error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * GET /treks/:id (mongo id)
 */
router.get('/:id', async (req, res) => {
  try {
    const trek = await Trek.findById(req.params.id).lean();
    if (!trek) return res.status(404).json({ success: false, message: 'Trek not found' });
    res.json({ success: true, trek });
  } catch (err) {
    console.error('GET /treks/:id error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * POST /treks (ADMIN) - multipart/form-data
 */
router.post('/', ensureAdmin, upload.single('image'), async (req, res) => {
  try {
    const body = req.body || {};
    const {
      name,
      location,
      duration,
      distanceKm,
      difficulty,
      category,
      description,
      province,
      priceNPR,
      elevationGainM,
      latitude,
      longitude,
    } = body;

    if (!name || !location || !duration || distanceKm == null) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image file is required' });
    }

    const latP = parseOptionalNumber(latitude, 'latitude');
    const lngP = parseOptionalNumber(longitude, 'longitude');
    if (latP.error) return res.status(400).json({ success: false, message: latP.error });
    if (lngP.error) return res.status(400).json({ success: false, message: lngP.error });

    const rangeErr = validateLatLng(latP.value, lngP.value);
    if (rangeErr) return res.status(400).json({ success: false, message: rangeErr });

    const id = await nextNumericId();
    const slug = slugify(name);
    const image = `/uploads/treks/${req.file.filename}`;

    const trek = await Trek.create({
      id,
      slug,
      name: String(name).trim(),
      location: String(location).trim(),
      duration: String(duration).trim(),
      distanceKm: Number(distanceKm),
      difficulty: difficulty || 'Moderate',
      category: category || 'top',
      description: String(description || '').trim(),
      image,

      province: String(province || '').trim(),
      priceNPR: Number(priceNPR || 0),
      elevationGainM: Number(elevationGainM || 0),

      latitude: typeof latP.value === 'number' ? latP.value : null,
      longitude: typeof lngP.value === 'number' ? lngP.value : null,
    });

    res.status(201).json({ success: true, message: 'Trek created', trek });
  } catch (err) {
    console.error('POST /treks error:', err);
    res.status(500).json({ success: false, message: err?.message || 'Server error' });
  }
});

/**
 * PUT /treks/:id (ADMIN) - multipart/form-data
 */
router.put('/:id', ensureAdmin, upload.single('image'), async (req, res) => {
  try {
    const update = { ...(req.body || {}) };

    if (update.name) update.name = String(update.name).trim();
    if (update.location) update.location = String(update.location).trim();
    if (update.duration) update.duration = String(update.duration).trim();
    if (update.description != null) update.description = String(update.description || '').trim();
    if (update.province != null) update.province = String(update.province || '').trim();

    if (update.distanceKm != null) update.distanceKm = Number(update.distanceKm);
    if (update.priceNPR != null) update.priceNPR = Number(update.priceNPR);
    if (update.elevationGainM != null) update.elevationGainM = Number(update.elevationGainM);

    const latP = parseOptionalNumber(update.latitude, 'latitude');
    const lngP = parseOptionalNumber(update.longitude, 'longitude');
    if (latP.error) return res.status(400).json({ success: false, message: latP.error });
    if (lngP.error) return res.status(400).json({ success: false, message: lngP.error });

    if (latP.provided || lngP.provided) {
      const rangeErr = validateLatLng(latP.value, lngP.value);
      if (rangeErr) return res.status(400).json({ success: false, message: rangeErr });
    }

    if (latP.provided) update.latitude = typeof latP.value === 'number' ? latP.value : null;
    else delete update.latitude;

    if (lngP.provided) update.longitude = typeof lngP.value === 'number' ? lngP.value : null;
    else delete update.longitude;

    if (update.name) update.slug = slugify(update.name);
    if (req.file) update.image = `/uploads/treks/${req.file.filename}`;

    delete update.rating;

    const trek = await Trek.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!trek) return res.status(404).json({ success: false, message: 'Trek not found' });

    res.json({ success: true, message: 'Trek updated', trek });
  } catch (err) {
    console.error('PUT /treks/:id error:', err);
    res.status(500).json({ success: false, message: err?.message || 'Server error' });
  }
});

/**
 * DELETE /treks/:id (ADMIN)
 */
router.delete('/:id', ensureAdmin, async (req, res) => {
  try {
    const trek = await Trek.findByIdAndDelete(req.params.id);
    if (!trek) return res.status(404).json({ success: false, message: 'Trek not found' });
    res.json({ success: true, message: 'Trek deleted' });
  } catch (err) {
    console.error('DELETE /treks/:id error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
