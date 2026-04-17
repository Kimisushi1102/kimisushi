const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  id: String,
  name: String,
  category: String,
  price: String,
  image: String,
  description: String,
  tag: String,
  pieces: String,
  code: String,
  isVisible: { type: Boolean, default: true },
  updatedAt: { type: Date, default: Date.now }
}, { strict: false });

const comboSchema = new mongoose.Schema({
  id: String,
  name: String,
  subtitle: String,
  price: String,
  oldPrice: String,
  tag: String,
  items: String,
  isVisible: { type: Boolean, default: true },
  updatedAt: { type: Date, default: Date.now }
}, { strict: false });

const tableSchema = new mongoose.Schema({
  id: String,
  name: String,
  zone: String,
  status: { type: String, default: 'empty' },
  orderItems: Array,
  total: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
}, { strict: false });

const orderSchema = new mongoose.Schema({
  id: String,
  type: String,
  name: String,
  phone: String,
  email: String,
  date: String,
  time: String,
  pickupDate: String,
  pickupTime: String,
  pickupTimeDisplay: String,
  guests: String,
  persons: String,
  notes: String,
  remark: String,
  status: String,
  method: String,
  address: String,
  floor: String,
  bell: String,
  deliveryFee: String,
  distance: String,
  total: String,
  totalItemCount: String,
  cart: Array,
  items: Array,
  customerName: String,
  customerPhone: String,
  customerEmail: String,
  orderType: String,
  gmailEnabled: Boolean,
  gmailUser: String,
  gmailPassword: String,
  gmailNotifyEmail: String,
  adminReplied: Boolean,
  repliedAt: String,
  waitMinutes: Number,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { strict: false });

const faqSchema = new mongoose.Schema({
  id: String,
  question: String,
  answer: String,
  order: { type: Number, default: 0 },
  isVisible: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { strict: false });

const settingsSchema = new mongoose.Schema({}, { strict: false });

const userSchema = new mongoose.Schema({
  id: String,
  username: String,
  passwordHash: String,
  name: String,
  role: String,
  active: { type: Boolean, default: true },
  lastLogin: Date
}, { strict: false });

const activityLogSchema = new mongoose.Schema({
  id: String,
  user: String,
  action: String,
  details: mongoose.Schema.Types.Mixed,
  ip: String,
  timestamp: { type: Date, default: Date.now }
}, { strict: false });

const analyticsSchema = new mongoose.Schema({
  visits: Array,
  pageviews: Array,
  clicks: Array,
  orders: Array,
  reservations: Array,
  products: Array,
  hourlyDistribution: Array,
  dailyOrders: Array,
  dailyRevenue: Array,
  topProducts: Array,
  statusDistribution: Array,
  lastReset: Date
}, { strict: false });

module.exports = {
  MenuItem: mongoose.models.MenuItem || mongoose.model('MenuItem', menuItemSchema),
  Combo: mongoose.models.Combo || mongoose.model('Combo', comboSchema),
  Table: mongoose.models.Table || mongoose.model('Table', tableSchema),
  Order: mongoose.models.Order || mongoose.model('Order', orderSchema),
  FAQ: mongoose.models.FAQ || mongoose.model('FAQ', faqSchema),
  Settings: mongoose.models.Settings || mongoose.model('Settings', settingsSchema),
  User: mongoose.models.User || mongoose.model('User', userSchema),
  ActivityLog: mongoose.models.ActivityLog || mongoose.model('ActivityLog', activityLogSchema),
  Analytics: mongoose.models.Analytics || mongoose.model('Analytics', analyticsSchema),
};
