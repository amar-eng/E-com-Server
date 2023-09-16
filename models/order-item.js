const mongoose = require('mongoose');

const orderItemSchema = mongoose.Schema({
  qty: {
    type: Number,
    required: true,
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    index: true,
  },
});

exports.OrderItem = mongoose.model('OrderItem', orderItemSchema);
