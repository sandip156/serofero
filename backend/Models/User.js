// backend/Models/User.js
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // storing hashed password
    password: {
      type: String,
      required: true,
    },

    // booking-related fields
    contact: {
      type: String,
      default: '',
      trim: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    age: {
      type: Number,
      min: 0,
    },

    isAdmin: {
      type: Boolean,
      default: false,
    },

    /* =========================================================
       ✅ Forgot Password fields
       ========================================================= */
    resetPasswordTokenHash: {
      type: String,
      default: null,
      select: false, // hides it from normal queries for safety
    },
    resetPasswordExpiresAt: {
      type: Date,
      default: null,
      select: false, // hides it from normal queries for safety
    },
  },
  { timestamps: true }
);

const UserModel = mongoose.model('User', UserSchema);
module.exports = UserModel;
