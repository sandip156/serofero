// backend/Models/Booking.js
const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    trekName: { type: String, required: true, trim: true },
    trekSlug: { type: String, required: true, trim: true, lowercase: true, index: true },

    startDate: { type: Date, required: true },
    people: { type: Number, required: true, min: 1, max: 50, default: 1 },

    phone: { type: String, default: '', trim: true },
    note: { type: String, default: '', trim: true },

    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true }
);

// Optional but recommended: block exact duplicates
BookingSchema.index({ user: 1, trekSlug: 1, startDate: 1 }, { unique: true });

module.exports = mongoose.model('Booking', BookingSchema);
