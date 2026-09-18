// backend/Routes/InteractionRouter.js
const router = require('express').Router();
const Interaction = require('../Models/Interaction');
const requireAuth = require('../Middlewares/requireAuth');

function getUserId(req) {
  return (
    req.user?.id ||
    req.user?._id ||
    req.userId ||
    req.user_id ||
    req.user?.userId ||
    null
  );
}

function normSlug(v) {
  return String(v || '')
    .trim()
    .toLowerCase();
}

/**
 * ✅ GET /interactions/saved?limit=200
 * Returns: { success: true, slugs: string[] }
 */
router.get('/saved', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const limitRaw = Number(req.query?.limit);
    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 200;

    const docs = await Interaction.find({
      user: userId,
      kind: 'save',
      active: true,
    })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .select('trekSlug -_id')
      .lean();

    const slugs = docs.map((d) => d.trekSlug);
    return res.json({ success: true, slugs });
  } catch (err) {
    console.error('GET /interactions/saved error:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Failed to load saved treks' });
  }
});

/**
 * ✅ POST /interactions/saved
 * body: { trekSlug: string, saved: boolean }
 * Returns: { success: true, interaction: {...} }
 */
router.post('/saved', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { trekSlug, saved } = req.body || {};
    if (!trekSlug || typeof saved !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'trekSlug and saved(boolean) are required',
      });
    }

    const slug = normSlug(trekSlug);

    const doc = await Interaction.findOneAndUpdate(
      { user: userId, trekSlug: slug, kind: 'save' },
      {
        $set: { active: saved },
        // ✅ ensures these fields exist when upsert creates the doc
        $setOnInsert: { user: userId, trekSlug: slug, kind: 'save' },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return res.json({ success: true, interaction: doc });
  } catch (err) {
    console.error('POST /interactions/saved error:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Failed to save interaction' });
  }
});

module.exports = router;
