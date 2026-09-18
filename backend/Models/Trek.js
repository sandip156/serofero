// backend/Models/Trek.js
const mongoose = require('mongoose');

const TrekSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },

    slug: { type: String, required: true, unique: true, trim: true },

    name: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    duration: { type: String, required: true, trim: true },

    distanceKm: { type: Number, required: true, min: 0 },
    rating: { type: Number, default: 0 },
numReviews: { type: Number, default: 0 },


    difficulty: {
      type: String,
      enum: ['Easy', 'Moderate', 'Hard'],
      default: 'Moderate',
    },

    rating: { type: Number, min: 0, max: 5, default: 4.5 },

    image: { type: String, required: true, trim: true },

    category: {
      type: String,
      enum: ['top', 'latest', 'near'],
      default: 'top',
    },

    description: { type: String, default: '', trim: true },

    province: { type: String, default: '', trim: true },

    // ✅ price
    priceNPR: { type: Number, default: 0, min: 0 },

    elevationGainM: { type: Number, default: 0, min: 0 },

    // ✅ coordinates
    latitude: { type: Number, default: null, min: -90, max: 90 },
    longitude: { type: Number, default: null, min: -180, max: 180 },

    // ✅ GeoJSON point (IMPORTANT: no defaults here to avoid invalid geo objects)
    geo: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number], // [lng, lat]
      },
    },
  },
  { timestamps: true }
);

// ✅ geospatial index
TrekSchema.index({ geo: '2dsphere' });

function makeGeo(lat, lng) {
  if (typeof lat === 'number' && typeof lng === 'number') {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
    return { type: 'Point', coordinates: [lng, lat] };
  }
  return undefined;
}

// ✅ keep geo in sync on CREATE / .save()
TrekSchema.pre('save', function () {
  const lat = this.latitude;
  const lng = this.longitude;

  const geo = makeGeo(lat, lng);
  this.geo = geo; // undefined removes geo
});

// ✅ keep geo in sync on UPDATE (findByIdAndUpdate / findOneAndUpdate)
TrekSchema.pre('findOneAndUpdate', function () {
  const update = this.getUpdate() || {};
  const src = update.$set ? update.$set : update;

  const hasLat = Object.prototype.hasOwnProperty.call(src, 'latitude');
  const hasLng = Object.prototype.hasOwnProperty.call(src, 'longitude');

  // only act if lat/lng is part of the update
  if (!hasLat && !hasLng) return;

  const norm = (v) => {
    if (v === undefined) return undefined; // not provided
    if (v === null) return null; // explicit clear
    if (typeof v === 'string' && v.trim() === '') return null; // "" => clear
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const lat = hasLat ? norm(src.latitude) : undefined;
  const lng = hasLng ? norm(src.longitude) : undefined;

  if (hasLat) src.latitude = lat;
  if (hasLng) src.longitude = lng;

  const geo = makeGeo(lat, lng);

  if (geo) {
    src.geo = geo;
    if (update.$unset && update.$unset.geo) delete update.$unset.geo;
  } else {
    update.$unset = { ...(update.$unset || {}), geo: 1 };
    if (src.geo) delete src.geo;
  }

  // write back if using $set
  if (update.$set) update.$set = src;
  this.setUpdate(update);
});

module.exports = mongoose.model('Trek', TrekSchema);
