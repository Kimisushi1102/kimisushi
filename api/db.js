const mongoose = require('mongoose');
const dns = require('dns');

// Fix MongoDB DNS resolution on Vercel serverless
const googleResolver = new dns.promises.Resolver();
googleResolver.setServers(['8.8.8.8']);

dns.promises.resolveSrv = async function(hostname) {
  if (hostname && hostname.includes && hostname.includes('dwxwnkm.mongodb.net')) {
    return googleResolver.resolveSrv(hostname);
  }
  return dns.promises.Resolver.prototype.resolveSrv.call(this, hostname);
};

dns.promises.resolveTxt = async function(hostname) {
  if (hostname && hostname.includes && hostname.includes('dwxwnkm.mongodb.net')) {
    try {
      return await googleResolver.resolveTxt(hostname);
    } catch {
      return [];
    }
  }
  return dns.promises.Resolver.prototype.resolveTxt.call(this, hostname);
};

dns.promises.resolve4 = async function(hostname) {
  if (hostname && hostname.includes && hostname.includes('dwxwnkm.mongodb.net')) {
    return googleResolver.resolve4(hostname);
  }
  return dns.promises.Resolver.prototype.resolve4.call(this, hostname);
};

// Cached connection
let cached = null;

async function getConnection() {
  if (cached) return cached;
  const mongoUrl = process.env.MONGODB_URL;
  if (!mongoUrl) {
    throw new Error('[MongoDB] MONGODB_URL not set in environment variables');
  }
  await mongoose.connect(mongoUrl, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
  });
  cached = mongoose.connection;
  return cached;
}

module.exports = { getConnection, mongoose };
