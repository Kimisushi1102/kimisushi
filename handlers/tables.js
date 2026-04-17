const { getConnection } = require('./db');
const { Table } = require('./models');

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      await getConnection();
      let tables = await Table.find({});
      if (!tables || tables.length === 0) {
        const defaults = [
          { id: 'T1', name: 'B\u00e0n 1', zone: 'Ph\u00f2ng 1', status: 'empty', orderItems: [], total: 0 },
          { id: 'T2', name: 'B\u00e0n 2', zone: 'Ph\u00f2ng 1', status: 'empty', orderItems: [], total: 0 },
          { id: 'T3', name: 'B\u00e0n 3', zone: 'Ph\u00f2ng 2', status: 'empty', orderItems: [], total: 0 },
          { id: 'T4', name: 'B\u00e0n 4', zone: 'Ph\u00f2ng 2', status: 'empty', orderItems: [], total: 0 },
          { id: 'T5', name: 'B\u00e0n 5 (Ngo\u00e0i)', zone: 'Ngo\u00e0i Tr\u1eddi', status: 'empty', orderItems: [], total: 0 },
          { id: 'T6', name: 'B\u00e0n 6 (Ngo\u00e0i)', zone: 'Ngo\u00e0i Tr\u1eddi', status: 'empty', orderItems: [], total: 0 }
        ];
        await Table.insertMany(defaults);
        tables = defaults;
      }
      return res.status(200).json(tables);
    }
    if (req.method === 'POST') {
      await getConnection();
      const tables = req.body;
      await Table.deleteMany({});
      if (tables && tables.length > 0) {
        await Table.insertMany(tables.map(t => {
          const obj = t.toObject ? t.toObject() : Object.assign({}, t);
          obj.updatedAt = new Date();
          return obj;
        }));
      }
      const saved = await Table.find({});
      return res.status(200).json({ success: true, count: saved.length, items: saved });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('[API] /api/tables error:', e);
    return res.status(500).json({ error: e.message });
  }
};
