const mongoose = require('mongoose');

const reviewSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: { type: String, required: true },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    required: true,
  },
  datePosted: {
    type: Date,
    default: Date.now,
  },
});

const productSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  richDescription: {
    type: String,
    default: '',
  },

  image: {
    type: String,
    default: '',
  },
  images: [
    {
      type: String,
    },
  ],
  brand: {
    type: String,
    default: '',
  },
  price: {
    type: Number,
    default: '',
  },

  category: {
    type: String,
    default: '',
  },
  countInStock: {
    type: Number,
    required: true,
    min: 0,
    max: 255,
  },
  reviews: [reviewSchema],
  rating: {
    type: Number,
    default: 0,
  },
  numReviews: {
    type: Number,
    default: 0,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  gender: {
    type: String,
    required: true,
  },
  season: {
    type: String,
    required: true,
  },
  concentration: {
    type: String,
    required: true,
  },
  vibe: {
    type: String,
    required: true,
  },
  topNotes: [
    {
      type: String,
      required: true,
    },
  ],
  middleNotes: [
    {
      type: String,
      required: true,
    },
  ],
  baseNotes: [
    {
      type: String,
      required: true,
    },
  ],
  dateCreated: {
    type: Date,
    default: Date.now,
  },
  occasion: {
    type: String,
    required: true,
  },
});

productSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

productSchema.set('toJSON', {
  virtuals: true,
});
exports.Product = mongoose.model('Product', productSchema);
