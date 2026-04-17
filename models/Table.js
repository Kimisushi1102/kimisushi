const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  zone: String,
  status: { type: String, enum: ['empty', 'occupied', 'reserved'], default: 'empty' },
  orderItems: { type: Array, default: [] },
  total: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Table', tableSchema);
