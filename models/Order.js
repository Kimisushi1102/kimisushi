const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  type: { type: String, enum: ['order', 'reservation'], default: 'order' },
  // Customer info
  customerName: String,
  customerPhone: String,
  customerEmail: String,
  // Order details
  items: [{
    id: String,
    name: String,
    price: String,
    quantity: { type: Number, default: 1 },
    category: String,
    image: String
  }],
  cart: { type: Array, default: [] },
  total: String,
  // Pickup / Delivery
  method: { type: String, enum: ['delivery', 'pickup', 'dine-in'], default: 'pickup' },
  address: String,
  deliveryFee: { type: String, default: '0' },
  // Timing
  pickupDate: String,
  pickupTime: String,
  pickupTimeDisplay: String,
  // Reservation fields
  date: String,
  time: String,
  guests: Number,
  persons: Number,
  // Notes
  notes: String,
  remark: String,
  // Status
  status: { type: String, default: 'neu' },
  // Gmail sync
  gmailEnabled: Boolean,
  gmailUser: String,
  gmailPassword: String,
  gmailNotifyEmail: String,
  // Meta
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

orderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Order', orderSchema);
