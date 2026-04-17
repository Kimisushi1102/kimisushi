const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  question: String,
  answer: String,
  isVisible: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

faqSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('FAQ', faqSchema);
