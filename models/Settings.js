const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // Brand
  brandName: { type: String, default: 'Kimi Sushi' },
  logoImage: String,
  heroImage: String,
  aboutImage: String,
  // Contact
  phone: String,
  email: String,
  address: String,
  // SEO (German - Primary)
  seoTitle: String,
  seoDescription: String,
  seoKeywords: String,
  // SEO (English - Secondary)
  seoTitleEn: String,
  seoDescriptionEn: String,
  seoKeywordsEn: String,
  seoAuthor: String,
  siteDomain: String,
  // Geo
  geoRegion: String,
  geoPlacename: String,
  geoPosition: String,
  // Tax
  taxRate1: { type: String, default: '19' },
  taxRate2: { type: String, default: '7' },
  // Hours
  hoursSummary: String,
  hoursMon1: String, hoursMon2: String,
  hoursTue1: String, hoursTue2: String,
  hoursWed1: String, hoursWed2: String,
  hoursThu1: String, hoursThu2: String,
  hoursFri1: String, hoursFri2: String,
  hoursSat1: String, hoursSat2: String,
  hoursSun1: String, hoursSun2: String,
  // Delivery
  deliveryEnabled: { type: Boolean, default: false },
  deliveryMinOrder: String,
  deliveryFee3km: String,
  deliveryFee10km: String,
  deliveryFeeMax: String,
  // Notifications
  telegramBotToken: String,
  telegramChatId: String,
  emailEnabled: { type: Boolean, default: true },
  emailApiKey: String,
  gmailEnabled: { type: Boolean, default: false },
  gmailUser: String,
  gmailPassword: String,
  gmailNotifyEmail: String,
  // Meta
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
