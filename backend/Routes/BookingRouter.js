// backend/Routes/BookingRouter.js
const router = require('express').Router();
const Booking = require('../Models/Booking');

const requireAuth = require('../Middlewares/requireAuth');
const requireAdmin = require('../Middlewares/Admin');

// Helper: works with many auth middleware styles (req.user / req.userId / etc.)
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

// POST /bookings  -> create booking (logged-in user)
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { trekName, trekSlug, startDate, people, phone, note } = req.body || {};

    if (!trekName || !trekSlug || !startDate) {
      return res.status(400).json({
        success: false,
        message: 'trekName, trekSlug, and startDate are required',
      });
    }

    const dateObj = new Date(startDate);
    if (Number.isNaN(dateObj.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid startDate' });
    }

    const p = Number(people || 1);
    if (!Number.isFinite(p) || p < 1 || p > 50) {
      return res.status(400).json({ success: false, message: 'people must be between 1 and 50' });
    }

    const booking = await Booking.create({
      user: userId,
      trekName: String(trekName).trim(),
      trekSlug: String(trekSlug).trim(),
      startDate: dateObj,
      people: p,
      phone: String(phone || '').trim(),
      note: String(note || '').trim(),
      status: 'pending',
    });

    return res.json({ success: true, message: 'Booking created', booking });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create booking' });
  }
});
// ✅ PATCH /bookings/:id/cancel -> user cancels their own booking (only if pending)
router.patch('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;

    const booking = await Booking.findById(id).lean();
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // Must belong to current user
    if (String(booking.user) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Only pending can be cancelled by user
    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Only pending bookings can be cancelled (current: ${booking.status})`,
      });
    }

    const updated = await Booking.findByIdAndUpdate(
      id,
      { $set: { status: 'cancelled' } },
      { new: true }
    ).lean();

    return res.json({ success: true, message: 'Booking cancelled', booking: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to cancel booking' });
  }
});

// GET /bookings/my -> current user bookings
router.get('/my', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const bookings = await Booking.find({ user: userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, bookings });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load bookings' });
  }
});

// ✅ PATCH /bookings/:id/status -> admin update booking status
router.patch('/:id/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    const allowed = new Set(['pending', 'confirmed', 'cancelled']);
    if (!status || !allowed.has(status)) {
      return res.status(400).json({
        success: false,
        message: 'status must be one of: pending, confirmed, cancelled',
      });
    }

    const updated = await Booking.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    )
      .populate('user', 'name email')
      .lean();

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    return res.json({ success: true, message: 'Status updated', booking: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

// GET /bookings -> admin view all bookings
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .sort({ createdAt: -1 })
      .populate('user', 'name email')
      .lean();

    return res.json({ success: true, bookings });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load bookings' });
  }
});

module.exports = router;
