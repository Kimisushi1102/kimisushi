require('dotenv').config();
const mongoose = require('mongoose');

const dns = require('dns');
const googleResolver = new dns.promises.Resolver();
googleResolver.setServers(['8.8.8.8']);
dns.promises.resolveSrv = async function(hostname) {
  if (hostname.includes('dwxwnkm.mongodb.net')) return googleResolver.resolveSrv(hostname);
  return dns.promises.Resolver.prototype.resolveSrv.call(this, hostname);
};
dns.promises.resolveTxt = async function(hostname) {
  if (hostname.includes('dwxwnkm.mongodb.net')) {
    try { return await googleResolver.resolveTxt(hostname); } catch { return []; }
  }
  return dns.promises.Resolver.prototype.resolveTxt.call(this, hostname);
};
dns.promises.resolve4 = async function(hostname) {
  if (hostname.includes('dwxwnkm.mongodb.net')) return googleResolver.resolve4(hostname);
  return dns.promises.Resolver.prototype.resolve4.call(this, hostname);
};

const MenuItem = require('./models/MenuItem');
const menuData = require('./data/menu.json');

async function importMenu() {
    await mongoose.connect(process.env.MONGODB_URL);

    const count = await MenuItem.countDocuments();
    console.log(`Current items in DB: ${count}`);

    // Clear old items
    await MenuItem.deleteMany({});
    console.log('Cleared old items');

    // Insert new items from menu.json
    const items = menuData.map(item => ({
        ...item,
        isVisible: true,
        createdAt: new Date(),
        updatedAt: new Date()
    }));

    await MenuItem.insertMany(items);
    console.log(`Inserted ${items.length} items into MongoDB`);

    const newCount = await MenuItem.countDocuments();
    console.log(`Total items in DB now: ${newCount}`);

    await mongoose.disconnect();
    console.log('Done!');
}

importMenu().catch(e => { console.error(e); process.exit(1); });
