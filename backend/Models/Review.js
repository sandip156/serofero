// backend/Models/Review.js
const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema(
  {
    trekSlug: { type: String, required: true, index: true, trim: true, lowercase: true },
    trekName: { type: String, default: '', trim: true },

    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    authorName: { type: String, required: true, trim: true },
    authorEmail: { type: String, default: '', trim: true },

    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, required: true, trim: true, maxlength: 2000 },

    photos: [{ type: String }], // e.g. "/uploads/reviews/file.jpg"
  },
  { timestamps: true }
);

// ✅ list reviews for a trek fast (newest first)
ReviewSchema.index({ trekSlug: 1, createdAt: -1 });

// ✅ speed up collaborative filtering aggregates (group by user + trekSlug)
ReviewSchema.index({ user: 1, trekSlug: 1 });

// Optional: enforce one review per user per trek (ONLY enable if you really want this rule)
// ReviewSchema.index({ user: 1, trekSlug: 1 }, { unique: true });

module.exports = mongoose.model('Review', ReviewSchema);


// const mongoose = require('mongoose');

// const ReviewSchema = new mongoose.Schema(
//   {
//     trekSlug: { type: String, required: true, index: true },
//     trekName: { type: String, default: '' },

//     user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

//     authorName: { type: String, required: true },
//     authorEmail: { type: String, default: '' },

//     rating: { type: Number, required: true, min: 1, max: 5 },
//     text: { type: String, required: true, trim: true, maxlength: 2000 },

//     photos: [{ type: String }], // e.g. "/uploads/reviews/file.jpg"
//   },
//   { timestamps: true }
// );

// ReviewSchema.index({ trekSlug: 1, createdAt: -1 });

// module.exports = mongoose.model('Review', ReviewSchema);
