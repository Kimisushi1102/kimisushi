const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  code: String,
  name: { type: String, required: true },
  price: { type: String, required: true },
  category: String,
  image: String,
  description: String,
  tag: String,
  pieces: String,
  isVisible: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

menuItemSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('MenuItem', menuItemSchema);
