// backend/Models/Interaction.js
const mongoose = require('mongoose');

const InteractionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // slugify(trek.name) from frontend
    trekSlug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    // keep "save" now, easy to expand later if needed
    kind: {
      type: String,
      enum: ['save'],
      default: 'save',
      index: true,
    },

    // true = saved, false = unsaved (but record kept for history)
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

/**
 * Enforce 1 interaction per (user, trekSlug, kind)
 * - so clicking bookmark updates same doc instead of creating duplicates
 */
InteractionSchema.index(
  { user: 1, trekSlug: 1, kind: 1 },
  { unique: true }
);

/**
 * Helps queries like:
 * Interaction.find({ kind: 'save', active: true }).select('user trekSlug')
 */
InteractionSchema.index({ kind: 1, active: 1, trekSlug: 1 });

module.exports = mongoose.model('Interaction', InteractionSchema);
