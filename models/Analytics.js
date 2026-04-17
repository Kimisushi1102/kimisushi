const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  // Visit tracking
  visits: [{
    date: String,
    hour: Number,
    timestamp: Date
  }],
  pageviews: [{
    date: String,
    hour: Number,
    path: String,
    timestamp: Date
  }],
  clicks: [{
    date: String,
    hour: Number,
    event: String,
    data: mongoose.Schema.Types.Mixed,
    timestamp: Date
  }],
  // Orders & Revenue
  orders: [{
    date: String,
    hour: Number,
    total: String,
    items: Array,
    method: String,
    timestamp: Date
  }],
  reservations: [{
    date: String,
    hour: Number,
    guests: Number,
    timestamp: Date
  }],
  products: { type: Array, default: [] },
  hourlyDistribution: { type: Array, default: [] },
  dailyOrders: [{
    date: String,
    count: { type: Number, default: 0 }
  }],
  dailyRevenue: [{
    date: String,
    amount: { type: Number, default: 0 }
  }],
  topProducts: [{
    name: String,
    count: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 }
  }],
  statusDistribution: { type: Array, default: [] },
  lastReset: Date
}, { timestamps: true });

module.exports = mongoose.model('Analytics', analyticsSchema, 'analytics');
