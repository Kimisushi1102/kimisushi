const dns = require('dns');
const mongoose = require('mongoose');

const googleResolver = new dns.promises.Resolver();
googleResolver.setServers(['8.8.8.8']);

dns.promises.resolveSrv = async function(hostname) {
  if (hostname.includes('dwxwnkm.mongodb.net')) {
    return googleResolver.resolveSrv(hostname);
  }
  return dns.promises.Resolver.prototype.resolveSrv.call(this, hostname);
};

dns.promises.resolveTxt = async function(hostname) {
  if (hostname.includes('dwxwnkm.mongodb.net')) {
    try {
      return await googleResolver.resolveTxt(hostname);
    } catch {
      return [];
    }
  }
  return dns.promises.Resolver.prototype.resolveTxt.call(this, hostname);
};

dns.promises.resolve4 = async function(hostname) {
  if (hostname.includes('dwxwnkm.mongodb.net')) {
    return googleResolver.resolve4(hostname);
  }
  return dns.promises.Resolver.prototype.resolve4.call(this, hostname);
};

let isConnected = false;
let reconnectTimer = null;

async function connectDB() {
  if (isConnected) return;

  const mongoUrl = process.env.MONGODB_URL;
  if (!mongoUrl) {
    console.warn('[MongoDB] MONGODB_URL not set in .env — running in offline/demo mode.');
    return;
  }

  try {
    await mongoose.connect(mongoUrl, {
      serverSelectionTimeoutMS: 10000,
    });
    isConnected = true;
    console.log('[MongoDB] Connected successfully.');

    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB] Connection error:', err);
    });
    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB] Disconnected. Will retry on next operation.');
      isConnected = false;
      scheduleReconnect();
    });
    mongoose.connection.on('reconnected', () => {
      console.log('[MongoDB] Reconnected successfully.');
      isConnected = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    });
  } catch (err) {
    console.error('[MongoDB] Failed to connect:', err.message);
    isConnected = false;
    scheduleReconnect();
  }
}

function scheduleReconnect(delay = 15000) {
  if (reconnectTimer) return;
  console.warn(`[MongoDB] Scheduling reconnect in ${delay / 1000}s...`);
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    console.log('[MongoDB] Attempting reconnection...');
    try {
      await mongoose.connect(process.env.MONGODB_URL, {
        serverSelectionTimeoutMS: 10000,
      });
      isConnected = true;
      console.log('[MongoDB] Reconnected successfully.');
    } catch (err) {
      console.error('[MongoDB] Reconnection failed:', err.message);
      scheduleReconnect(Math.min(delay * 1.5, 120000));
    }
  }, delay);
}

module.exports = { connectDB, mongoose };
