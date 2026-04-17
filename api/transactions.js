// Transactions endpoint - stores checkout history in MongoDB
module.exports = async (req, res) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return res.status(200).set(headers).send('');
  }

  try {
    const { getConnection } = require('./db');
    const { Order } = require('./models');
    await getConnection();

    if (req.method === 'GET') {
      // Return checkout transactions (items with type='order' that have been completed)
      const transactions = await Order.find({
        type: 'order',
        status: { $in: ['abgeschlossen', 'fertig', 'in_bearbeitung', 'neu'] }
      }).sort({ createdAt: -1 }).limit(500);
      return res.status(200).set(headers).json(transactions.map(t => ({
        id: t.id,
        tableId: t.tableId || 'APP',
        items: t.cart || t.items || [],
        subtotal: t.subtotal || 0,
        tax: t.tax || 0,
        discount: t.discount || 0,
        discountPercent: t.discountPercent || 0,
        total: parseFloat(t.total) || 0,
        paymentMethod: t.paymentMethod || 'cash',
        timestamp: t.createdAt,
        name: t.name || t.customerName || '',
        phone: t.phone || t.customerPhone || '',
        email: t.email || t.customerEmail || ''
      })));
    }

    if (req.method === 'POST') {
      // Save transaction
      let item = req.body;
      if (!item.id) item.id = 'tx_' + Date.now();
      item.type = 'order';
      item.createdAt = item.timestamp ? new Date(item.timestamp) : new Date();
      item.updatedAt = new Date();
      await Order.findOneAndUpdate({ id: item.id }, { $set: item }, { upsert: true, new: true });
      return res.status(200).set(headers).json({ success: true });
    }

    return res.status(405).set(headers).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('[API] /api/transactions error:', e);
    return res.status(500).set(headers).json({ error: e.message });
  }
};
