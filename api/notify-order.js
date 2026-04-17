const { getConnection } = require('./db');
const { Settings } = require('./models');

module.exports = async (req, res) => {
  try {
    await getConnection();
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id, type, name, phone, email, date, time, guests, items, total, cart, notes, method, address, deliveryFee, distance, customerName, customerPhone, customerEmail } = req.body;

    const itemData = {
      id: id || 'order_' + Date.now(),
      type: type || 'order',
      name: name || customerName || '',
      phone: phone || customerPhone || '',
      email: email || customerEmail || '',
      date: date || '',
      time: time || '',
      pickupDate: date || '',
      pickupTime: time || '',
      guests: guests || '',
      persons: guests || '',
      notes: notes || '',
      remark: notes || '',
      status: 'neu',
      method: method || '',
      address: address || '',
      deliveryFee: deliveryFee || '0',
      distance: distance || '',
      total: total || '',
      cart: cart || items || [],
      items: items || cart || [],
      customerName: customerName || name || '',
      customerPhone: customerPhone || phone || '',
      customerEmail: customerEmail || email || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const { Order } = require('./models');
    await Order.findOneAndUpdate({ id: itemData.id }, { $set: itemData }, { upsert: true, new: true });

    return res.status(200).json({ success: true, id: itemData.id });
  } catch (e) {
    console.error('[API] /api/notify-order error:', e);
    return res.status(500).json({ error: e.message });
  }
};
